# CareQuest Hub - Quick Integration Guide

## ⚡ 5-Minute Setup

### 1. Register the Scene

**File**: `frontend/src/game/config.ts`

```typescript
import { CareQuestHubScene } from './scenes/CareQuestHubScene';

scene: [
  BootScene,
  WorldMapScene,
  CombatScene,
  CareQuestHubScene, // ← ADD THIS LINE
],
```

---

### 2. Create Sentence Database

**File**: `frontend/public/data/sentences.json`

```json
{
  "sentences": [
    {
      "id": "affirmation-001",
      "text_en": "I am capable of handling challenges with grace and strength.",
      "text_id": "Saya mampu menghadapi tantangan dengan tenang dan kuat.",
      "difficulty": 1,
      "category": "Affirmations"
    },
    {
      "id": "affirmation-002",
      "text_en": "Every setback is a setup for a comeback.",
      "text_id": "Setiap kemunduran adalah persiapan untuk bangkit kembali.",
      "difficulty": 2,
      "category": "Affirmations"
    },
    {
      "id": "coping-001",
      "text_en": "When I feel overwhelmed, I take three deep breaths and center myself.",
      "text_id": "Ketika saya merasa kewalahan, saya mengambil tiga napas dalam dan memusatkan diri.",
      "difficulty": 3,
      "category": "Coping"
    },
    {
      "id": "cbt-001",
      "text_en": "I acknowledge my feelings without letting them control my actions.",
      "text_id": "Saya mengakui perasaan saya tanpa membiarkan mereka mengendalikan tindakan saya.",
      "difficulty": 4,
      "category": "CBT"
    },
    {
      "id": "wisdom-001",
      "text_en": "The only way out is through - I face my challenges head-on.",
      "text_id": "Satu-satunya jalan keluar adalah melalui - Saya menghadapi tantangan saya secara langsung.",
      "difficulty": 5,
      "category": "Wisdom"
    },
    {
      "id": "indonesian-001",
      "text_en": "Small steps forward are still progress.",
      "text_id": "Sedikit demi sedikit, lama-lama menjadi bukit.",
      "difficulty": 3,
      "category": "Indonesian Sayings"
    }
  ]
}
```

**Required**: Minimum 25 sentences (5 per category × 5 categories)

---

### 3. Load Sentences in BootScene

**File**: `frontend/src/game/scenes/BootScene.ts`

```typescript
preload() {
  // Add this line
  this.load.json('sentences', '/data/sentences.json');
  
  // ... existing preloads
}
```

---

### 4. Create Placeholder Assets

**File**: `frontend/src/game/scenes/BootScene.ts`

Add to `create()` method:

```typescript
create() {
  // Monster placeholder
  const monsterGraphics = this.add.graphics();
  monsterGraphics.fillStyle(0xff6666, 1);
  monsterGraphics.fillCircle(32, 32, 32);
  monsterGraphics.generateTexture('monster-placeholder', 64, 64);
  monsterGraphics.destroy();

  // Particle texture
  const particleGraphics = this.add.graphics();
  particleGraphics.fillStyle(0xffffff, 1);
  particleGraphics.fillCircle(4, 4, 4);
  particleGraphics.generateTexture('particle', 8, 8);
  particleGraphics.destroy();

  // ... existing create logic
}
```

---

### 5. Start the Game

**Option A - From React Component**:

```typescript
// In your React component (e.g., CareQuest landing page)
import { EventBus } from '@/game/utils/EventBridge';

const handleStartGame = () => {
  EventBus.emit('scene:start', { scene: 'CareQuestHubScene' });
};
```

**Option B - For Testing (Direct Start)**:

```typescript
// In BootScene.ts, modify create() method
create() {
  // ... asset generation

  // Replace this:
  // this.scene.start('WorldMapScene');
  
  // With this:
  this.scene.start('CareQuestHubScene');
}
```

---

## 🧪 Testing Commands

```bash
# Run frontend dev server
cd frontend
npm run dev

# Open browser
http://localhost:4000

# Open browser console to see game logs
# Look for: [CareQuestHub] Initializing...
```

---

## 🔧 Backend Integration (Optional for MVP)

### Required Endpoint

**URL**: `PATCH /api/v1/quests/state/update`

**Request**:
```json
{
  "joyDelta": 50,
  "careDelta": 25,
  "harmonyDelta": 3
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "joy": 1150,
    "care": 575,
    "harmony": 103
  }
}
```

**Implementation**:

```python
# backend/app/routes/quests.py

@router.patch("/state/update")
async def update_quest_state(
    update: QuestStateUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's quest resources (JOY, CARE, Harmony)"""
    
    # Fetch current state
    state = await db.execute(
        select(UserQuestState).where(UserQuestState.user_id == current_user.id)
    )
    user_state = state.scalar_one_or_none()
    
    if not user_state:
        # Create new state
        user_state = UserQuestState(
            user_id=current_user.id,
            joy=0,
            care=0,
            harmony=0,
        )
        db.add(user_state)
    
    # Apply deltas
    user_state.joy += update.joyDelta
    user_state.care += update.careDelta
    user_state.harmony += update.harmonyDelta
    
    await db.commit()
    await db.refresh(user_state)
    
    return {
        "success": True,
        "data": {
            "joy": user_state.joy,
            "care": user_state.care,
            "harmony": user_state.harmony,
        },
    }
```

---

## 📊 Verifying It Works

### 1. Check Scene Loads

Console should show:
```
[CareQuestHub] Initializing typing combat game...
[TypingEngine] Initialized with 25 sentences
[CareQuestHub] Creating game UI...
[CareQuestHub] Spawned Gloom - HP: 100
[TypingEngine] Selected sentence (1/Affirmations): I am capable...
```

### 2. Test Typing

1. Type a sentence character-by-character
2. Correct characters should turn **green**
3. Incorrect characters should turn **red** and shake
4. WPM and accuracy should update in stats panel

### 3. Test Damage

1. Complete a sentence
2. Floating damage number should appear
3. Monster HP bar should decrease
4. Particle explosion should play

### 4. Test Monster Defeat

1. Defeat first monster
2. Resources should increase (check console logs)
3. New monster should spawn with more HP
4. Stage counter should increment

### 5. Test Upgrades

1. Defeat enough monsters to earn ~20 CARE
2. Click "Typing Power" upgrade button
3. Cost should increase to 12 CARE
4. Level should show as "Lv.2"
5. Next monster should take less damage per sentence

### 6. Test Boss

1. Reach stage 10
2. Monster should be larger (4x scale) and red-tinted
3. HP should be ~7x normal monster
4. Defeating boss should award 5 Harmony (instead of 1)

---

## 🐛 Troubleshooting

### "Sentence database not found"

**Fix**: Make sure `sentences.json` is in `frontend/public/data/` and loaded in `BootScene.preload()`

---

### "Monster sprite not found"

**Fix**: Add `monster-placeholder` texture generation in `BootScene.create()`

---

### "Keyboard not responding"

**Fix**: Click on the Phaser canvas to give it focus

---

### "ESLint errors"

**Fix**: Run `npx eslint src/game/scenes/CareQuestHubScene.ts src/game/systems/TypingEngine.ts --fix`

---

### "Resources not syncing with backend"

**Status**: Backend endpoint not implemented yet (feature in progress)  
**Workaround**: Resources persist in localStorage for now

---

## 📚 Full Documentation

See **`CAREQUEST_HUB_IMPLEMENTATION.md`** for:
- Complete feature list
- PRD R7 compliance checklist
- Game balance calculations
- Future enhancements roadmap
- Known issues and limitations

---

## ✅ Checklist

Before deploying to production:

- [ ] Create 25+ sentences in `sentences.json`
- [ ] Register `CareQuestHubScene` in `config.ts`
- [ ] Generate placeholder textures in `BootScene`
- [ ] Load sentences in `BootScene.preload()`
- [ ] Test all 4 upgrades
- [ ] Verify boss encounters at stage 10, 20, 30
- [ ] Test sentence cooldown (complete same sentence twice)
- [ ] Verify resource persistence (refresh page)
- [ ] Implement backend API endpoint (optional for MVP)
- [ ] Replace placeholder sprite with actual monster art

---

**Integration Time**: ~10 minutes  
**Testing Time**: ~15 minutes  
**Production-Ready**: After backend integration + content creation

**Questions?** Check `CAREQUEST_HUB_IMPLEMENTATION.md` or console logs with `[CareQuestHub]` prefix.
