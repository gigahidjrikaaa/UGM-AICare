# Database Design Best Practices Research Summary

**Date**: November 5, 2025  
**Research Topic**: UUID vs Integer IDs, Name Fields, PostgreSQL Data Types  
**Decision**: Industry best practices applied to UGM-AICare database normalization

---

## 🔍 Research Question 1: UUID vs Integer Primary Keys

### Industry Consensus (2024-2025)

#### ✅ **Integer IDs** (Recommended for UGM-AICare)

**Pros:**
- ✅ **4x smaller storage**: 4 bytes (int) vs 16 bytes (UUID)
- ✅ **Faster indexing & joins**: Numeric comparison is significantly faster
- ✅ **Better B-Tree performance**: Sequential IDs reduce index fragmentation
- ✅ **Human-readable**: Easy to debug (`user_id=123` vs `550e8400-e29b...`)
- ✅ **Auto-increment**: Database handles generation automatically
- ✅ **Native support**: All ORMs have excellent integer PK support

**Cons:**
- ❌ **Predictable**: Sequential IDs expose business metrics (user #10000 vs #50000)
- ❌ **Not globally unique**: Can't merge databases easily
- ❌ **Difficult to scale**: Sequential IDs hard to shard across databases

**When to Use:**
- ✅ **Monolithic applications** (UGM-AICare ✅)
- ✅ **Internal systems** where performance is priority (UGM-AICare ✅)
- ✅ **Systems not exposed to end users** (we use session tokens, not user IDs in URLs ✅)

---

#### ⚠️ **UUIDs** (Defer to v2.0)

**Pros:**
- ✅ **Globally unique**: Can merge databases, microservices-friendly
- ✅ **Unpredictable**: Better security (can't guess user IDs)
- ✅ **Client-side generation**: IDs can be created before database insert

**Cons:**
- ❌ **16 bytes storage**: 4x larger than integers
- ❌ **Slower joins**: UUID comparison slower than integer
- ❌ **Index fragmentation**: Random UUIDs cause more random I/O (UUIDv4)
- ❌ **Not human-readable**: Hard to debug

**When to Use:**
- Public APIs where ID predictability is a risk
- Distributed systems with multiple data sources
- Microservices needing offline ID generation

---

#### 🚀 **UUIDv7** (Emerging Standard - Consider for v2.0)

**Best of Both Worlds:**
- ✅ **Time-ordered**: First 48 bits = Unix timestamp (sortable!)
- ✅ **Reduced I/O**: Sequential inserts (better than UUIDv4)
- ✅ **Globally unique**: Like UUIDs
- ✅ **Performance**: Better than UUIDv4, close to integers

**Why Not Now?**
- ⏳ **New standard**: RFC 9562 finalized August 2024 (very recent)
- ⏳ **Limited ORM support**: Not yet in SQLAlchemy/Django by default
- ⏳ **Migration cost**: Requires changing all foreign keys

**Recommendation**: **Track UUIDv7 adoption, plan for v2.0 migration (Q2 2026)**

---

### 🎯 **Decision for UGM-AICare**

| Factor | Integer | UUIDv7 |
|--------|---------|--------|
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Storage | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Security | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Scalability | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Debugging | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| ORM Support | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**✅ v1.0 (Current)**: **Keep Integer IDs**
- UGM-AICare is a monolithic application
- Performance is critical (mental health = real-time responses)
- We use session tokens (not user IDs) in public URLs
- Easy to debug in development

**🚀 v2.0 (Q2 2026)**: **Migrate to UUIDv7**
- Plan for international expansion (global uniqueness needed)
- Potential microservices architecture
- Better security for research data sharing
- **Migration path**: Add `public_id` (UUID) column, dual-key period, then migrate

---

## 🔍 Research Question 2: Full Name vs First Name / Last Name

### Industry Consensus: **Separate Fields STRONGLY RECOMMENDED** ✅

**Why Separate first_name / last_name?**

1. ✅ **Sorting**: Sort by last name (universal standard)
2. ✅ **Internationalization**: Different cultures order names differently
   - Western: "John Doe" (first last)
   - Indonesian: "Siti Nurhaliza" (first last)
   - Chinese: "李明" (last first)
   - Javanese: Single names common ("Suharto")
3. ✅ **Personalization**: Address users by first name ("Hi John")
4. ✅ **Data validation**: Ensure both provided (vs single field)
5. ✅ **Search/filtering**: Search by last name efficiently
6. ✅ **Forms**: Pre-fill first/last name separately

**Additional Fields (Best Practice):**
- `first_name` ✅ (given name)
- `last_name` ✅ (family name)
- `preferred_name` ✅ (what they want to be called - "Johnny")
- `full_name` ❌ (don't store - compute from parts with `@property`)

**✅ UGM-AICare Design is Correct:**
```python
class UserProfile:
    first_name = Column(String(100))
    last_name = Column(String(100))
    preferred_name = Column(String(100))
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def display_name(self) -> str:
        return self.preferred_name or self.first_name or "User"
```

**Sources:**
- StackOverflow: "First name, middle name, last name. Why not Full Name?" (22 answers, consensus: separate fields)
- W3C Internationalization: "Personal names around the world" (recommends separate fields)

---

## 🔍 Research Question 3: PostgreSQL Data Types Best Practices

### String Types: VARCHAR vs TEXT

**PostgreSQL Reality: NO PERFORMANCE DIFFERENCE!** 🤯

**Industry Best Practices:**

1. ✅ **TEXT for long content** (no length limit, same performance)
   - Bio, notes, descriptions, clinical summaries
   - **UGM-AICare**: `bio`, `clinical_summary`, `notes` = TEXT ✅

2. ✅ **VARCHAR(n) only when length validation needed**
   - Names: `VARCHAR(100)` (prevent abuse)
   - Email: `VARCHAR(255)` (RFC 5321 standard)
   - Phone: `VARCHAR(20)` (international format)
   - **UGM-AICare**: Applied correctly ✅

3. ❌ **NEVER use CHAR(n)** (fixed-length wastes storage with padding)

**Recommended String Lengths:**
```sql
-- Names
first_name VARCHAR(100)  -- Safe for long names (95th percentile: 50 chars)
last_name VARCHAR(100)
preferred_name VARCHAR(100)
full_name VARCHAR(200)  -- For emergency contacts

-- Contact
email VARCHAR(255)  -- RFC 5321 standard
phone VARCHAR(20)   -- International format (+62-812-3456-7890)

-- Codes
check_in_code VARCHAR(50)
student_id VARCHAR(50)  -- NIM format (21/123456/SV/12345)

-- Long content
bio TEXT  -- Unlimited
notes TEXT
clinical_summary TEXT
```

---

### Timestamp Types

**Best Practice: ALWAYS use `TIMESTAMP WITH TIME ZONE`** ✅

```python
# ✅ CORRECT
created_at = Column(DateTime(timezone=True), server_default=func.now())

# ❌ WRONG (loses timezone info)
created_at = Column(DateTime, server_default=func.now())
```

**Why?**
- UGM-AICare may expand internationally
- Indonesia has 3 time zones (WIB, WITA, WIT)
- Accurate event ordering across timezones

**✅ UGM-AICare**: Applied correctly in all 7 models

---

### JSON Types

**Best Practice: ALWAYS use JSONB (not JSON)** ✅

```python
# ✅ CORRECT
changed_fields = Column(JSONB)

# ❌ WRONG
changed_fields = Column(JSON)
```

**JSONB Advantages:**
- Faster queries (binary format, indexed)
- Better compression (lz4-based)
- GIN indexes for fast searches
- Only downside: Loses property order (doesn't matter)

**✅ UGM-AICare**: `changed_fields` uses JSONB ✅

---

### Array Types

**Best Practice: Use PostgreSQL native ARRAY** ✅

```python
# ✅ CORRECT
interests = Column(ARRAY(String))
primary_concerns = Column(ARRAY(String))

# ❌ WRONG (comma-separated strings)
interests = Column(String)  # "music,sports,reading"
```

**Advantages:**
- Native support (no parsing needed)
- Can query individual elements: `WHERE 'music' = ANY(interests)`
- Supports indexing (GIN indexes)

**✅ UGM-AICare**: Applied in 7 places ✅

---

## 📊 Best Practices Summary Table

| Data Type | Bad Practice | Good Practice | UGM-AICare |
|-----------|-------------|---------------|------------|
| **Primary Keys** | UUID everywhere | Integer (v1.0) → UUIDv7 (v2.0) | ✅ Integer |
| **Names** | full_name column | first_name + last_name + preferred_name | ✅ Separate |
| **Long text** | VARCHAR(1000) | TEXT | ✅ TEXT |
| **Short text** | TEXT | VARCHAR(n) | ✅ VARCHAR |
| **Fixed length** | CHAR(n) | NEVER USE | ✅ No CHAR |
| **Timestamps** | DateTime | DateTime(timezone=True) | ✅ With TZ |
| **JSON** | JSON | JSONB | ✅ JSONB |
| **Lists** | Comma-separated | ARRAY(String) | ✅ ARRAY |
| **Emails** | VARCHAR(100) | VARCHAR(255) | ✅ 255 |
| **Phone** | VARCHAR(255) | VARCHAR(20) | ✅ 20 |

---

## ✅ Changes Applied to UGM-AICare Migration

### Migration File: `202511050001_normalize_user_tables.py`

**✅ Confirmed Best Practices:**
1. Integer IDs (4 bytes, fast, correct for v1.0)
2. Separate first_name/last_name/preferred_name
3. TEXT for long content (bio, clinical_summary, notes)
4. VARCHAR(n) with appropriate lengths
5. ARRAY for lists (interests, warning_signs, coping_strategies)
6. JSONB for structured data (changed_fields in audit_log)
7. TIMESTAMP WITH TIME ZONE consistently

**No Changes Needed** - Migration already follows 2024/2025 industry standards! 🎉

---

## 📚 Sources

1. **Chat2DB**: "UUID vs. Auto Increment Integer/Serial: Which is Best for Primary Keys?" (Nov 2024)
2. **Medium (Anamul Akash)**: "Choosing the Best Primary Key: Integer vs. UUID vs. ULID" (Jun 2025)
3. **RFC 9562**: "Universally Unique Identifiers (UUIDs)" - UUIDv7 Standard (Aug 2024)
4. **StackOverflow**: "First name, middle name, last name. Why not Full Name?" (22 answers)
5. **SimpleBackups**: "Mastering PostgreSQL Data Types: A Comprehensive Guide" (2024)
6. **TigerData**: "Best Practices for Picking PostgreSQL Data Types" (2024)
7. **Vonng.com**: "PostgreSQL Convention 2024" (Database naming conventions)

---

## 🎯 Final Recommendations

### v1.0 (Current - November 2025)

**✅ Keep Current Design:**
- Integer IDs (correct for monolithic app)
- Separate name fields (correct for i18n + UX)
- TEXT/VARCHAR/ARRAY/JSONB (all correct)
- TIMESTAMP WITH TIME ZONE (correct)

**No changes needed to migration file!** Already follows best practices.

---

### v2.0 (Q2 2026 - International Expansion)

**🚀 Consider Migration to UUIDv7:**

**When to Migrate:**
- International expansion beyond Indonesia
- Microservices architecture planned
- Public API with external consumers
- Security audit recommends unpredictable IDs

**Migration Strategy:**
1. Add `public_id UUID` column to users table
2. Generate UUIDv7 for all existing users
3. Dual-key period (6 months):
   - Internal queries: Use integer `id`
   - External APIs: Use `public_id` (UUID)
4. Update all foreign keys to UUID
5. Remove integer `id` column

**Estimated Effort:** 40-80 hours (big change!)

**Recommendation:** **Defer to v2.0** - Not worth breaking change right now.

---

## 🏆 Conclusion

**UGM-AICare database normalization already follows 2024/2025 industry best practices!**

- ✅ Correct ID strategy (Integer for monolithic app)
- ✅ Correct name fields (Separate for flexibility)
- ✅ Correct data types (TEXT/VARCHAR/ARRAY/JSONB/TIMESTAMP WITH TZ)
- ✅ Correct indexes (Composite indexes for common queries)
- ✅ Correct constraints (NOT NULL, UNIQUE, DEFAULT, FK CASCADE)

**No changes needed to migration or models.** Ready to proceed with Phase 1! 🚀
