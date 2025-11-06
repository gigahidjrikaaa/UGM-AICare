# Registration Updated for Normalized User Tables

**Date**: November 5, 2025  
**Status**: ✅ Registration endpoint updated  
**Impact**: Registration now creates entries in 4 tables (core + 3 normalized)

---

## 📝 Changes Summary

### Files Modified (2 files)

1. **`backend/app/routes/auth.py`** - Updated registration endpoint
2. **`backend/app/models/user.py`** - Added relationships to normalized tables

### Files Created (1 file)

3. **`backend/tests/test_registration_normalized.py`** - Comprehensive test suite

---

## 🔄 What Changed in Registration Flow

### Before (Single Table)
```
POST /api/auth/register
└── Creates 1 record in users table (80+ fields)
```

### After (Normalized Tables) ✅
```
POST /api/auth/register
├── Creates User (core auth: email, password_hash, role)
├── Creates UserProfile (demographics: name, phone, city, university, etc.)
├── Creates UserPreferences (settings: language, timezone, AI personality)
└── Creates UserConsentLedger entries (GDPR/HIPAA compliance)
    ├── data_sharing consent (default: not granted)
    └── research consent (default: not granted)
```

---

## 🎯 Registration Implementation Details

### 1. Core User Record (Auth Only)
```python
new_user = User(
    name=encrypt_data(request.name),
    email=encrypted_email,
    password_hash=hashed_password,
    role="user",
    check_in_code=uuid.uuid4().hex,
    # Legacy fields kept for backward compatibility
    first_name=...,
    last_name=...,
    # (will be removed in Phase 4)
)
```

**What's Created:**
- Encrypted email (unique identifier)
- Hashed password (bcrypt)
- Role: "user" (default)
- Check-in code: UUID hex string
- Legacy fields: Kept during migration period

---

### 2. UserProfile (Demographics) ✅ NEW
```python
user_profile = UserProfile(
    user_id=new_user.id,
    first_name=encrypt_data(request.firstName),
    last_name=encrypt_data(request.lastName),
    phone=encrypt_data(request.phone),
    date_of_birth=date_of_birth,
    gender=encrypt_data(request.gender),
    city=encrypt_data(request.city),
    country="Indonesia",  # Default for UGM
    university=encrypt_data(request.university),
    major=encrypt_data(request.major),
    year_of_study=int(request.yearOfStudy),
)
```

**What's Created:**
- Personal info: names, phone, date of birth, gender
- Location: city (encrypted), country (default: Indonesia)
- Academic: university, major, year of study
- All sensitive fields encrypted

---

### 3. UserPreferences (Settings) ✅ NEW
```python
user_preferences = UserPreferences(
    user_id=new_user.id,
    preferred_language="id",  # Indonesian default
    preferred_timezone="Asia/Jakarta",  # Indonesian timezone
    allow_email_checkins=request.allowEmailCheckins,
    theme="system",  # Light/dark based on OS
    aika_personality="empathetic",  # AI default
    aika_response_length="balanced",  # Not too short, not too long
)
```

**What's Created:**
- Language: Indonesian (id) - default for UGM
- Timezone: Asia/Jakarta - default for Indonesian users
- Email check-ins: User's choice (default: true)
- Theme: System (respects OS preference)
- AI personality: Empathetic (best for mental health)
- AI response length: Balanced

**User Can Change Later:**
- All preferences are user-controlled
- Can switch to English, change timezone
- Can customize Aika's personality (empathetic/professional/casual)

---

### 4. UserConsentLedger (GDPR/HIPAA) ✅ NEW
```python
# Data sharing consent
data_sharing_consent = UserConsentLedger(
    user_id=new_user.id,
    consent_type="data_sharing",
    granted=False,  # Default: NOT granted (opt-in model)
    consent_version="v1.0",
    consent_language="id",
    consent_method="registration",
    timestamp=datetime.now(),
)

# Research consent
research_consent = UserConsentLedger(
    user_id=new_user.id,
    consent_type="research",
    granted=False,  # Default: NOT granted (opt-in model)
    consent_version="v1.0",
    consent_language="id",
    consent_method="registration",
    timestamp=datetime.now(),
)
```

**What's Created:**
- 2 consent entries (data_sharing, research)
- Default: NOT granted (opt-in model, GDPR-compliant)
- Version: v1.0 (tracks consent document version)
- Language: Indonesian (what language user saw consent in)
- Method: "registration" (how consent was given)
- Timestamp: When consent was recorded

**Compliance:**
- ✅ GDPR: Opt-in model (user must explicitly grant consent)
- ✅ HIPAA: Audit trail (who, what, when)
- ✅ Right to withdraw: User can revoke consent anytime
- ✅ Append-only: Never delete (compliance requirement)

---

## 🔐 Security & Encryption

### Encrypted Fields
All sensitive personal data is encrypted at rest:
- ✅ Email
- ✅ Name (first, last)
- ✅ Phone
- ✅ Gender
- ✅ City
- ✅ University
- ✅ Major

### Not Encrypted
Public/non-sensitive data:
- User ID (integer, non-sensitive)
- Role (public)
- Country (default: Indonesia)
- Year of study (integer, non-identifying)
- Preferences (user-controlled settings)
- Timestamps (created_at, updated_at)

---

## 🧪 Testing

### Test Suite Created: `test_registration_normalized.py`

**4 Test Cases:**

1. ✅ **`test_register_creates_normalized_tables`**
   - Registers user with full data
   - Verifies User record created
   - Verifies UserProfile created
   - Verifies UserPreferences created with defaults
   - Verifies UserConsentLedger entries created (2 entries)

2. ✅ **`test_register_with_minimal_data`**
   - Registers with only email + password
   - Verifies all normalized tables created (even with minimal data)
   - Verifies defaults applied (country="Indonesia", language="id")

3. ✅ **`test_register_duplicate_email_fails`**
   - Attempts to register same email twice
   - Verifies 400 error returned

4. ✅ **`test_register_invalid_date_format_fails`**
   - Sends invalid date format (DD-MM-YYYY instead of YYYY-MM-DD)
   - Verifies 400 error with clear message

**Run Tests:**
```bash
cd backend
pytest tests/test_registration_normalized.py -v
```

---

## 📊 Database Schema After Registration

### Example Registration Data
```json
{
  "name": "Siti Nurhaliza",
  "email": "siti.nurhaliza@ugm.ac.id",
  "password": "SecurePass123!",
  "firstName": "Siti",
  "lastName": "Nurhaliza",
  "phone": "+6281234567890",
  "dateOfBirth": "2002-05-15",
  "gender": "female",
  "city": "Yogyakarta",
  "university": "Universitas Gadjah Mada",
  "major": "Psychology",
  "yearOfStudy": "2",
  "allowEmailCheckins": true
}
```

### Tables Created

#### 1. `users` (Core Auth)
```sql
INSERT INTO users (
  id, email, password_hash, role, check_in_code, 
  created_at, updated_at
) VALUES (
  123,
  '[ENCRYPTED:siti.nurhaliza@ugm.ac.id]',
  '$2b$12$...hashed_password...',
  'user',
  'a1b2c3d4e5f6...',
  '2025-11-05 10:30:00',
  '2025-11-05 10:30:00'
);
```

#### 2. `user_profiles` (Demographics)
```sql
INSERT INTO user_profiles (
  user_id, first_name, last_name, phone, date_of_birth,
  gender, city, country, university, major, year_of_study,
  created_at, updated_at
) VALUES (
  123,
  '[ENCRYPTED:Siti]',
  '[ENCRYPTED:Nurhaliza]',
  '[ENCRYPTED:+6281234567890]',
  '2002-05-15',
  '[ENCRYPTED:female]',
  '[ENCRYPTED:Yogyakarta]',
  'Indonesia',
  '[ENCRYPTED:Universitas Gadjah Mada]',
  '[ENCRYPTED:Psychology]',
  2,
  '2025-11-05',
  '2025-11-05'
);
```

#### 3. `user_preferences` (Settings)
```sql
INSERT INTO user_preferences (
  user_id, preferred_language, preferred_timezone,
  allow_email_checkins, theme, aika_personality,
  aika_response_length, created_at, updated_at
) VALUES (
  123,
  'id',
  'Asia/Jakarta',
  true,
  'system',
  'empathetic',
  'balanced',
  1730786400,
  1730786400
);
```

#### 4. `user_consent_ledger` (GDPR/HIPAA)
```sql
-- Entry 1: Data sharing consent
INSERT INTO user_consent_ledger (
  user_id, consent_type, granted, consent_version,
  consent_language, consent_method, timestamp
) VALUES (
  123,
  'data_sharing',
  false,
  'v1.0',
  'id',
  'registration',
  '2025-11-05 10:30:00+00'
);

-- Entry 2: Research consent
INSERT INTO user_consent_ledger (
  user_id, consent_type, granted, consent_version,
  consent_language, consent_method, timestamp
) VALUES (
  123,
  'research',
  false,
  'v1.0',
  'id',
  'registration',
  '2025-11-05 10:30:00+00'
);
```

---

## 🔄 Backward Compatibility

### During Migration Period (Phase 1-3)

**Legacy fields kept in User table:**
- ✅ `first_name`, `last_name`, `phone`, etc. still exist
- ✅ Old code still works (reads from User table)
- ✅ New code can use normalized tables (UserProfile, etc.)

**Dual-write pattern:**
- Registration writes to BOTH old and new tables
- Old queries: Read from User table
- New queries: Read from normalized tables with `joinedload()`

### After Phase 4 (Breaking Change)

**Legacy fields removed from User table:**
- ❌ Old columns dropped
- ✅ All code must use normalized tables
- ✅ Migration guide provided in `USER_TABLE_NORMALIZATION_TODO.md`

---

## ✅ Benefits of New Registration Flow

### 1. Better Data Organization
- Core auth data separated from profile data
- Settings isolated in preferences table
- Consent history tracked (GDPR/HIPAA)

### 2. Performance
- Smaller core User table = faster auth queries
- Profile data cached separately
- Consent ledger doesn't slow down user queries

### 3. Compliance
- ✅ GDPR: Opt-in consent model, append-only audit trail
- ✅ HIPAA: Consent version tracking, language tracking
- ✅ Right to be forgotten: Can delete profile while keeping anonymized research data

### 4. Flexibility
- Easy to add new preferences without bloating User table
- Multiple consent types supported (data_sharing, research, marketing, etc.)
- Future: Support multiple emergency contacts (one-to-many)

---

## 🚀 Next Steps

### For Developers

1. **Run migration** (if not done):
   ```bash
   cd backend
   alembic upgrade head
   ```

2. **Test registration**:
   ```bash
   pytest tests/test_registration_normalized.py -v
   ```

3. **Update other endpoints** to use normalized tables:
   - GET /api/users/me (user profile)
   - PUT /api/users/profile (update profile)
   - GET /api/users/preferences (get settings)
   - PUT /api/users/preferences (update settings)

### For Frontend

**No changes needed yet!** Registration API contract unchanged:
- Same request payload
- Same response format
- Backward compatible

**Future (Phase 2)**: Update profile page to use nested structure:
```typescript
// Old
const name = user.first_name;

// New (Phase 2)
const name = user.profile?.first_name;
```

---

## 📝 Summary

**What Changed:**
- ✅ Registration creates 4 tables (User + 3 normalized)
- ✅ Consent tracking (GDPR/HIPAA compliant)
- ✅ Better defaults (Indonesian language/timezone)
- ✅ AI personality defaults (empathetic)

**What Stayed the Same:**
- ✅ API contract unchanged (backward compatible)
- ✅ Encryption for sensitive data
- ✅ Email uniqueness validation
- ✅ Password hashing (bcrypt)

**Benefits:**
- ✅ Better data organization
- ✅ GDPR/HIPAA compliance
- ✅ Performance improvements
- ✅ Easier to extend

**Testing:**
- ✅ 4 comprehensive test cases
- ✅ Covers success, minimal data, duplicates, invalid data

---

**Registration is now ready for the normalized user table architecture!** 🚀
