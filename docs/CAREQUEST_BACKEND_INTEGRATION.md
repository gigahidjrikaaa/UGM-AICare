# CareQuest Backend Integration Documentation

## Overview

CareQuest is fully integrated with the UGM-AICare backend using the **same user account system**. All game statistics (JOY, CARE, Harmony) are stored and synced with the backend PostgreSQL database.

---

## User Account Integration

### Session Management
- **Frontend**: Uses NextAuth.js session from UGM-AICare
- **Authentication**: Same JWT tokens and session cookies
- **Profile Data**: Shared across main site and CareQuest

### ProfileDropdown Component
The CareQuest navbar now uses the **same ProfileDropdown component** as the main UGM-AICare site:

**Location**: `frontend/src/components/ui/ProfileDropdown.tsx`

**Features**:
- User avatar and name
- Harmony tracker with QuestHud
- Streak counter (current & longest)
- Quick navigation tiles (Quests, Profile, Help)
- Web3 wallet status
- Sign out button

**Usage in CareQuest**:
```tsx
import ProfileDropdown from '@/components/ui/ProfileDropdown';

<ProfileDropdown
  isOpen={isProfileOpen}
  user={session.user}
  wellness={wellness}
  onClose={() => setIsProfileOpen(false)}
  onSignOut={handleSignOut}
/>
```

---

## Game Statistics (JOY, CARE, Harmony)

### 1. JOY Points

#### Storage
- **Backend Model**: `PlayerWellnessState.joy_balance`
- **Database**: `player_wellness_state.joy_balance` (Float)
- **Frontend Store**: `useGameStore().joy`

#### Purpose
- Earned from positive interactions with Aika chatbot
- Completing daily quests and activities
- Engaging with therapeutic content

#### API Endpoints
- **GET** `/api/quests/wellness` - Fetch current JOY balance
- **PATCH** `/api/quests/wellness` - Update JOY balance

#### Backend Schema
```python
# backend/app/domains/mental_health/models/quests.py
class PlayerWellnessState(Base):
    __tablename__ = "player_wellness_state"
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    joy_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # ... other fields
```

#### Update Flow
```typescript
// Frontend: Game rewards JOY
await updateWellnessState({
  joy_delta: 10.0  // Add 10 JOY points
});

// Backend processes:
// 1. Validates user session
// 2. Updates player_wellness_state.joy_balance
// 3. Returns new balance
```

---

### 2. CARE Tokens

#### Storage
- **Backend Model**: `PlayerWellnessState.extra_data['care_balance']`
- **Database**: `player_wellness_state.extra_data` (JSONB field)
- **Future**: Will migrate to `user_profile.total_care_tokens`
- **Frontend Store**: `useGameStore().care`

#### Purpose
- **Premium currency** for special items and activities
- Can be earned through:
  - Completing intervention plans
  - Reaching wellness milestones
  - Participating in research studies
  - **Future**: Purchased via CARE Token smart contract

#### API Endpoints
- **GET** `/api/quests/wellness` - Fetch current CARE balance
- **PATCH** `/api/quests/wellness` - Update CARE balance

#### Backend Implementation
```python
# backend/app/domains/mental_health/routes/quests.py
@router.patch("/wellness")
async def update_wellness_state(
    update: WellnessStateUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch wellness state
    state = await get_or_create_wellness_state(current_user.id, db)
    
    # Update CARE balance (stored in extra_data JSONB)
    extra = state.extra_data or {}
    current_care = float(extra.get("care_balance", 0.0))
    extra["care_balance"] = max(0.0, current_care + update.care_delta)
    state.extra_data = extra
    
    await db.commit()
    return WellnessStateResponse(
        joy_balance=state.joy_balance,
        care_balance=float(extra.get("care_balance", 0.0)),
        harmony_score=state.harmony_score,
        # ...
    )
```

#### Migration Plan
**Current** (Phase 1): CARE stored in `PlayerWellnessState.extra_data`
**Future** (Phase 2): Migrate to `UserProfile.total_care_tokens` (Integer column)
**Future** (Phase 3): Integrate with blockchain CARE token contract

---

### 3. Harmony Score

#### Storage
- **Backend Model**: `PlayerWellnessState.harmony_score`
- **Database**: `player_wellness_state.harmony_score` (Float)
- **Frontend Store**: `useGameStore().harmony`

#### Purpose
- **Primary wellness metric** representing overall mental health
- Used to calculate player level: `level = floor(harmony / 100) + 1`
- Influenced by:
  - Quest completions (+5 to +20 harmony)
  - Daily check-ins (+3 harmony)
  - Consistent activity (streak bonuses)
  - Intervention plan progress

#### API Endpoints
- **GET** `/api/quests/wellness` - Fetch current harmony score
- **PATCH** `/api/quests/wellness` - Update harmony score

#### Backend Schema
```python
# backend/app/domains/mental_health/models/quests.py
class PlayerWellnessState(Base):
    harmony_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
```

#### Leveling System
```typescript
// Frontend calculation
const playerLevel = Math.floor(harmony / 100) + 1;
const xpInCurrentLevel = harmony % 100;
const xpProgress = (xpInCurrentLevel / 100) * 100;

// Examples:
// harmony = 0   → Level 1 (0% to next)
// harmony = 50  → Level 1 (50% to next)
// harmony = 100 → Level 2 (0% to next)
// harmony = 250 → Level 3 (50% to next)
```

---

## Frontend State Management

### GameStore (Zustand)

**Location**: `frontend/src/store/gameStore.ts`

**Purpose**: 
- Shared state between Phaser game engine and React UI
- Syncs game rewards to backend
- Manages game settings (sound, volume, language)

**Key Methods**:

```typescript
// Update wellness from game (with backend sync)
await updateWellnessFromGame({
  joy_delta: 10,      // Add 10 JOY
  care_delta: 5,      // Add 5 CARE
  harmony_delta: 15   // Add 15 Harmony
});

// Set wellness state (from backend fetch)
setWellnessState({
  joy: 100,
  care: 50,
  harmony: 250
});
```

### Wellness Hook

**Location**: `frontend/src/hooks/useQuests.ts`

**Hook**: `useWellnessState()`

**Usage**:
```typescript
const { data: wellness, isLoading, error } = useWellnessState();

// wellness = {
//   joy_balance: 100,
//   care_balance: 50,
//   harmony_score: 250,
//   current_streak: 5,
//   longest_streak: 12,
//   ...
// }
```

---

## Data Flow

### 1. Initial Load (CareQuest Hub)
```
User visits /carequest
  ↓
NextAuth session validates user
  ↓
useWellnessState() fetches from backend
  ↓
GET /api/quests/wellness
  ↓
Backend returns PlayerWellnessState
  ↓
useGameStore().setWellnessState() updates local state
  ↓
UI displays JOY, CARE, Harmony
```

### 2. Game Reward (Phaser Scene)
```
Player completes quest in Phaser game
  ↓
Scene calls: gameStore.updateWellnessFromGame({ joy_delta: 10 })
  ↓
PATCH /api/quests/wellness with delta
  ↓
Backend updates player_wellness_state table
  ↓
Backend returns new balances
  ↓
gameStore updates local state
  ↓
UI automatically re-renders with new values
```

### 3. Profile Dropdown
```
User clicks avatar in navbar
  ↓
ProfileDropdown fetches wellness via useWellnessState()
  ↓
Displays Harmony tracker, streak counter
  ↓
User navigates to /quests or /profile
```

---

## Database Schema

### PlayerWellnessState Table

```sql
CREATE TABLE player_wellness_state (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    compassion_mode_active BOOLEAN NOT NULL DEFAULT FALSE,
    compassion_activated_at TIMESTAMP,
    last_completed_at TIMESTAMP,
    harmony_score FLOAT NOT NULL DEFAULT 0.0,
    joy_balance FLOAT NOT NULL DEFAULT 0.0,
    extra_data JSONB NOT NULL DEFAULT '{}',  -- Contains care_balance
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_wellness_user ON player_wellness_state(user_id);
CREATE INDEX idx_wellness_updated ON player_wellness_state(updated_at);
```

### UserProfile Table (Future CARE Migration)

```sql
CREATE TABLE user_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    -- ...
    total_care_tokens INTEGER DEFAULT 0,  -- Future CARE storage
    -- ...
);
```

---

## API Reference

### GET /api/quests/wellness

**Description**: Fetch current wellness state for authenticated user

**Authentication**: Required (JWT token)

**Response**:
```json
{
  "joy_balance": 100.0,
  "care_balance": 50.0,
  "harmony_score": 250.0,
  "current_streak": 5,
  "longest_streak": 12,
  "last_completed_at": "2025-11-07T10:30:00Z"
}
```

---

### PATCH /api/quests/wellness

**Description**: Update wellness state with deltas (rewards)

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "joy_delta": 10.0,
  "care_delta": 5.0,
  "harmony_delta": 15.0
}
```

**Response**:
```json
{
  "joy_balance": 110.0,
  "care_balance": 55.0,
  "harmony_score": 265.0,
  "current_streak": 5,
  "longest_streak": 12,
  "last_completed_at": "2025-11-07T10:30:00Z"
}
```

**Notes**:
- Negative deltas are allowed (penalties)
- Balances cannot go below 0
- Backend validates user ownership

---

## Security Considerations

### 1. Validation
- All deltas validated on backend (no client-side trust)
- Rate limiting on wellness updates (max 10/minute)
- User can only update their own wellness state

### 2. Anti-Cheat
- Large deltas (> 100) flagged for review
- Suspicious patterns logged to audit table
- Admin dashboard for monitoring anomalies

### 3. Data Integrity
- Database constraints ensure non-negative balances
- Atomic transactions prevent race conditions
- Wellness history logged to `reward_ledger_entry` table

---

## Testing Backend Integration

### 1. Test Wellness Fetch
```bash
# In frontend directory
curl -X GET http://localhost:4000/api/quests/wellness \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Test Wellness Update
```bash
curl -X PATCH http://localhost:4000/api/quests/wellness \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "joy_delta": 10,
    "care_delta": 5,
    "harmony_delta": 15
  }'
```

### 3. Test From Frontend
```typescript
// In browser console on CareQuest page
const gameStore = window.__ZUSTAND_STORE__;
await gameStore.getState().updateWellnessFromGame({
  joy_delta: 10,
  care_delta: 5,
  harmony_delta: 15
});
```

---

## Troubleshooting

### Issue: Stats showing 0 in CareQuest
**Solution**: Check if user has `PlayerWellnessState` record
```sql
SELECT * FROM player_wellness_state WHERE user_id = YOUR_USER_ID;
```

### Issue: Updates not syncing
**Solution**: Check browser console for API errors
```typescript
// Enable debug logging
localStorage.setItem('debug', 'gameStore:*');
```

### Issue: CARE balance not showing
**Solution**: Check `extra_data` field in database
```sql
SELECT extra_data->>'care_balance' FROM player_wellness_state WHERE user_id = YOUR_USER_ID;
```

---

## Future Enhancements

### Phase 1: Current (✅ Done)
- [x] Store JOY, CARE, Harmony in backend
- [x] Sync gameStore with backend API
- [x] Integrate ProfileDropdown with CareQuest
- [x] Display stats in navbar with tooltips

### Phase 2: CARE Token Migration (🔄 Planned)
- [ ] Migrate CARE from `extra_data` to `user_profile.total_care_tokens`
- [ ] Create CARE token transaction ledger
- [ ] Implement CARE token purchase API
- [ ] Add CARE token history page

### Phase 3: Blockchain Integration (📋 Future)
- [ ] Deploy CARE token smart contract (ERC-20)
- [ ] Implement Web3 wallet connection
- [ ] Enable CARE token staking for rewards
- [ ] Create on-chain CARE token marketplace

### Phase 4: Advanced Features (📋 Future)
- [ ] Leaderboards (top JOY, Harmony, Streak)
- [ ] Guild system with shared rewards
- [ ] Daily/weekly challenges
- [ ] Achievement NFT badges

---

## Contact & Support

For backend integration issues:
- **Backend API**: `backend/app/domains/mental_health/routes/quests.py`
- **Database Schema**: `backend/alembic/versions/`
- **Frontend Store**: `frontend/src/store/gameStore.ts`

**Documentation Last Updated**: November 7, 2025
