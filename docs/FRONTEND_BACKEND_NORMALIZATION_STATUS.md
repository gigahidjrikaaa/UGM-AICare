# Frontend & Backend Normalization Status

**Date**: November 5, 2025  
**Status**: ⚠️ Backend Needs Update

---

## Summary

The database migration for normalized user tables is **complete**, but the backend API endpoints and frontend pages need to be updated to use the new table structure.

---

## ✅ What's Working

### 1. Registration (`/signup`)
- **Frontend**: ✅ Already sends correct data structure
- **Backend**: ✅ `POST /api/auth/register` creates entries in normalized tables
  - Creates `User` (core auth)
  - Creates `UserProfile` (demographics)
  - Creates `UserPreferences` (settings with Indonesian defaults)
  - Creates `UserConsentLedger` (2 entries: data_sharing, research)

**File**: `frontend/src/app/(main)/signup/page.tsx`
```tsx
await registerUser({
  name: `${formData.firstName} ${formData.lastName}`,
  firstName: formData.firstName,
  lastName: formData.lastName,
  email: formData.email,
  phone: formData.phone,
  dateOfBirth: formData.dateOfBirth,
  gender: formData.gender,
  city: formData.city,
  university: formData.university,
  major: formData.major,
  yearOfStudy: formData.yearOfStudy,
  password: formData.password,
  allowEmailCheckins: formData.allowEmailCheckins
});
```

✅ **No changes needed for registration!**

---

## ⚠️ What Needs Updating

### 2. Profile Page (`/profile`)

**Status**: ❌ Backend reads from old User table columns

**Frontend**: `frontend/src/app/(main)/profile/page.tsx`
- Calls `GET /api/v1/profile/overview`
- Calls `PUT /api/v1/profile/overview` for updates
- Uses `UserProfileOverviewResponse` type

**Backend**: `backend/app/routes/profile.py`

**Current Implementation** (Lines 220-310):
```python
@router.get("/overview", response_model=UserProfileOverviewResponse)
async def get_profile_overview(...):
    # ❌ Reads directly from User table (old structure)
    email = _safe_decrypt(current_user.email)
    phone = _safe_decrypt(current_user.phone)
    full_name_parts = [
        _safe_decrypt(current_user.first_name),  # ❌ Old column
        _safe_decrypt(current_user.last_name),   # ❌ Old column
    ]
    preferred_name = _safe_decrypt(current_user.preferred_name)  # ❌ Old column
    # ... reads from current_user.* directly
```

**Update Endpoint** (Lines 350-420):
```python
@router.put("/overview", response_model=UserProfileOverviewResponse)
async def update_profile_overview(...):
    # ❌ Writes directly to User table (old structure)
    for field in string_fields:
        if field in data:
            setattr(current_user, field, _encrypt_optional(normalized))  # ❌ Old pattern
```

---

## 📋 Required Backend Changes

### Files to Update

1. **`backend/app/routes/profile.py`** (566 lines)
   - Update `get_profile_overview()` (lines 217-317)
   - Update `update_profile_overview()` (lines 320-425)

### Change Pattern

**Before** (Old - Direct User table access):
```python
full_name_parts = [
    _safe_decrypt(current_user.first_name),
    _safe_decrypt(current_user.last_name),
]
preferred_name = _safe_decrypt(current_user.preferred_name)
city = _safe_decrypt(current_user.city)
```

**After** (New - Use relationships to normalized tables):
```python
from sqlalchemy.orm import joinedload

# Load user with normalized tables
stmt = (
    select(User)
    .options(
        joinedload(User.profile),
        joinedload(User.preferences),
        joinedload(User.emergency_contacts)
    )
    .where(User.id == current_user.id)
)
result = await db.execute(stmt)
user = result.unique().scalar_one()

# Access normalized data
full_name_parts = [
    _safe_decrypt(user.profile.first_name) if user.profile else None,
    _safe_decrypt(user.profile.last_name) if user.profile else None,
]
preferred_name = _safe_decrypt(user.profile.preferred_name) if user.profile else None
city = _safe_decrypt(user.profile.city) if user.profile else None
```

---

## 🔄 Migration Strategy

### Phase 1: Dual Read (Current - Backward Compatible)
During migration period, read from BOTH old and new locations:

```python
# Try new location first, fallback to old
first_name = (
    _safe_decrypt(user.profile.first_name) if user.profile 
    else _safe_decrypt(user.first_name)  # Fallback to legacy
)
```

### Phase 2: Dual Write (Registration Already Does This ✅)
Write to BOTH old and new tables:
- ✅ Registration endpoint already does this
- ⏳ Update endpoint needs this pattern

### Phase 3: New Only (After Validation Period)
Once all data is migrated and validated (2 weeks), remove old column access:
```python
# Only read from normalized tables
first_name = _safe_decrypt(user.profile.first_name) if user.profile else None
```

---

## 🎯 Action Items

### High Priority (Week 1)

- [ ] **Update `get_profile_overview()`**
  - Add `joinedload()` for profile, preferences, emergency_contacts
  - Read from normalized tables with fallback to legacy columns
  - Test with existing users
  
- [ ] **Update `update_profile_overview()`**
  - Dual-write: Update BOTH User table AND normalized tables
  - Create UserProfile if doesn't exist
  - Create UserPreferences if doesn't exist
  - Update UserEmergencyContact entries
  
- [ ] **Add Helper Function**
  ```python
  async def _load_user_with_profile(user_id: int, db: AsyncSession) -> User:
      stmt = (
          select(User)
          .options(
              joinedload(User.profile),
              joinedload(User.preferences),
              joinedload(User.emergency_contacts)
          )
          .where(User.id == user_id)
      )
      result = await db.execute(stmt)
      return result.unique().scalar_one()
  ```

### Medium Priority (Week 2)

- [ ] **Update Other Endpoints**
  - `GET /api/v1/profile/stats` - Uses UserStatsService
  - `GET /api/v1/profile/my-badges` - Uses User.awarded_badges
  - `POST /api/v1/profile/refresh-stats` - Updates stats
  
- [ ] **Update Dashboard Endpoint**
  - `backend/app/routes/dashboard.py` (if exists)
  - Any other endpoints that read user profile data

### Low Priority (Week 3-4)

- [ ] **Validation Period**
  - Monitor logs for data consistency issues
  - Check that old and new data match
  - Verify no queries breaking

- [ ] **Remove Old Columns** (Phase 4 - BREAKING)
  - After 2 weeks of validation
  - Remove legacy column reads
  - Drop old columns from User table
  - Update migration: `202511050002_remove_old_user_columns.py`

---

## 📊 Testing Checklist

### Before Deployment

- [ ] Run registration with new account → Verify 4 tables created
- [ ] Load `/profile` page → Verify data displays correctly
- [ ] Update profile → Verify changes saved to normalized tables
- [ ] Load existing user → Verify fallback to legacy columns works
- [ ] Check emergency contact updates
- [ ] Check preferences updates

### After Deployment (Monitor)

- [ ] Check error logs for missing data
- [ ] Verify profile photos display
- [ ] Verify emergency contacts editable
- [ ] Verify consent toggles work
- [ ] Monitor query performance (<100ms)

---

## 🚨 Critical Notes

### Backward Compatibility

**During migration period (2 weeks):**
- ✅ Registration creates normalized entries (already done)
- ⏳ Profile reads need fallback to legacy columns
- ⏳ Profile updates need dual-write to both old and new

**After validation period:**
- ❌ Remove fallbacks
- ❌ Remove dual-write
- ❌ Drop old columns (BREAKING CHANGE)

### Data Migration

**For existing users:**
Run data migration script after deploying profile endpoint updates:
```bash
cd backend
python scripts/migrate_user_data.py
```

This populates normalized tables for users created before the migration.

---

## 📝 Example: Profile Endpoint Update

### Before (Current - Old Pattern):
```python
@router.get("/overview", response_model=UserProfileOverviewResponse)
async def get_profile_overview(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
):
    # Direct access to User table columns
    full_name = _safe_decrypt(current_user.first_name)
    city = _safe_decrypt(current_user.city)
    return UserProfileOverviewResponse(...)
```

### After (Updated - New Pattern with Fallback):
```python
@router.get("/overview", response_model=UserProfileOverviewResponse)
async def get_profile_overview(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
):
    # Load with relationships
    stmt = (
        select(User)
        .options(
            joinedload(User.profile),
            joinedload(User.preferences),
            joinedload(User.emergency_contacts)
        )
        .where(User.id == current_user.id)
    )
    result = await db.execute(stmt)
    user = result.unique().scalar_one()
    
    # Read from normalized tables with fallback
    first_name = (
        _safe_decrypt(user.profile.first_name) if user.profile 
        else _safe_decrypt(user.first_name)  # Fallback to legacy
    )
    city = (
        _safe_decrypt(user.profile.city) if user.profile 
        else _safe_decrypt(user.city)  # Fallback to legacy
    )
    
    return UserProfileOverviewResponse(
        header=ProfileHeaderSummary(
            full_name=first_name,
            city=city,
            ...
        ),
        ...
    )
```

---

## ✅ Summary

**What's Done:**
- ✅ Database migration (7 tables created)
- ✅ Registration endpoint updated
- ✅ User model has relationships to normalized tables

**What's Next:**
- ⏳ Update profile GET endpoint (read from normalized tables)
- ⏳ Update profile PUT endpoint (write to normalized tables)
- ⏳ Test with existing users
- ⏳ Run data migration for existing users
- ⏳ Validation period (2 weeks)
- ⏳ Remove old columns (BREAKING)

**Priority**: Update profile endpoints this week to fully utilize normalized tables!
