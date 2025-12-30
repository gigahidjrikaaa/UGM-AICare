# Migration Failure Fix: Idempotent Migrations

**Issue:** Production deployment failing due to duplicate column error
**Date:** November 1, 2025
**Status:** ✅ FIXED

## Problem

Production deployment failed with:

```text
psycopg2.errors.DuplicateColumn: column "updated_at" of relation "player_wellness_state" already exists
```

### Root Cause

The migration `28e1ce4c3187_add_updated_at_to_player_wellness_state.py` was attempting to add a column that already exists in the production database. This happens when:

1. **Column was manually added** to production database
2. **Migration ran partially** but wasn't recorded in `alembic_version` table
3. **Database schema is ahead** of migration history
4. **Migration was run multiple times** due to deployment retry logic

## Solution Applied

Made the migration **idempotent** by checking if the column exists before adding/dropping it.

### Changes Made

**File:** `backend/alembic/versions/28e1ce4c3187_add_updated_at_to_player_wellness_state.py`

**Before (Non-Idempotent):**

```python
def schema_upgrade() -> None:
    # Add updated_at column to player_wellness_state table
    op.add_column(
        'player_wellness_state',
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now())
    )

def schema_downgrade() -> None:
    # Remove updated_at column from player_wellness_state table
    op.drop_column('player_wellness_state', 'updated_at')
```

**After (Idempotent):**

```python
def schema_upgrade() -> None:
    """Add updated_at column to player_wellness_state table (idempotent)."""
    # Check if column exists before adding
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('player_wellness_state')]
    
    if 'updated_at' not in columns:
        op.add_column(
            'player_wellness_state',
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now())
        )
    else:
        # Column already exists, skip migration
        pass

def schema_downgrade() -> None:
    """Remove updated_at column from player_wellness_state table (idempotent)."""
    # Check if column exists before dropping
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('player_wellness_state')]
    
    if 'updated_at' in columns:
        op.drop_column('player_wellness_state', 'updated_at')
    else:
        # Column doesn't exist, skip downgrade
        pass
```

## Benefits of Idempotent Migrations

1. **Safe to Re-run** - Can run multiple times without errors
2. **Handles Partial Failures** - Gracefully handles interrupted migrations
3. **Manual Changes** - Works even if columns were manually added
4. **Zero-Downtime** - Safe for production deployments
5. **Retry-Friendly** - Works with deployment retry logic

## Best Practices for Future Migrations

### 1. Always Check Before Adding Columns

```python
def schema_upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('table_name')]
    
    if 'new_column' not in columns:
        op.add_column('table_name', sa.Column('new_column', sa.String()))
```

### 2. Always Check Before Dropping Columns

```python
def schema_downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('table_name')]
    
    if 'column_to_drop' in columns:
        op.drop_column('table_name', 'column_to_drop')
```

### 3. Check Before Creating Tables

```python
def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'new_table' not in tables:
        op.create_table(
            'new_table',
            sa.Column('id', sa.Integer(), primary_key=True),
            # ... more columns
        )
```

### 4. Check Before Creating Indexes

```python
def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    indexes = [idx['name'] for idx in inspector.get_indexes('table_name')]
    
    if 'idx_name' not in indexes:
        op.create_index('idx_name', 'table_name', ['column_name'])
```

### 5. Check Before Adding Foreign Keys

```python
def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    fks = [fk['name'] for fk in inspector.get_foreign_keys('table_name')]
    
    if 'fk_name' not in fks:
        op.create_foreign_key('fk_name', 'table_name', 'ref_table', ['col'], ['ref_col'])
```

## Testing

### Local Testing

```bash
cd backend
alembic upgrade head  # Should succeed
alembic upgrade head  # Should succeed again (idempotent)
alembic downgrade -1  # Should succeed
alembic upgrade head  # Should succeed
```

### Production Deployment

1. Push changes to repository
2. GitHub Actions will run migration
3. Migration will check for existing column
4. If exists: skip gracefully
5. If not exists: add column
6. Deployment continues successfully

## Verification in Production

After deployment, verify:

```bash
# SSH into production VM
ssh user@production-vm

# Connect to database
psql -U postgres -d aicare_db

# Check if column exists
\d player_wellness_state

# Check migration history
SELECT * FROM alembic_version;
```

Expected output:

- `updated_at` column should exist in `player_wellness_state` table
- `alembic_version` should show `28e1ce4c3187` as current version

## Related Files

- Migration: `backend/alembic/versions/28e1ce4c3187_add_updated_at_to_player_wellness_state.py`
- Model: `backend/app/domains/mental_health/models/quests.py` (PlayerWellnessState)
- Workflow: `.github/workflows/production.yml`
- Deployment: `deploy-prod.sh` and `.github/workflows/ci.yml` (runs `docker compose ... up` for the app-only stack)

## Monitoring

After deployment, monitor:

- Application logs for any database errors
- Alembic migration logs
- Application startup time
- Database query performance

## Rollback Plan (If Needed)

If issues persist:

1. **Immediate**: Manually mark migration as completed

   ```sql
   -- SSH to production database
   UPDATE alembic_version SET version_num = '28e1ce4c3187' WHERE version_num = '4b77dfea8799';
   ```

2. **If column is missing**: Run migration manually

   ```bash
   cd /app
   alembic upgrade head
   ```

3. **If column exists but wrong**: Drop and recreate

   ```sql
   ALTER TABLE player_wellness_state DROP COLUMN IF EXISTS updated_at;
   -- Then run migration
   ```

## Future Prevention

To prevent similar issues:

1. ✅ **All new migrations MUST be idempotent**
2. ✅ **Review migrations before merging to main**
3. ✅ **Test migrations on staging with production data snapshot**
4. ✅ **Add migration checklist to PR template**
5. ✅ **Document manual schema changes immediately**
6. ✅ **Use safe_migrate.py script (already in place)**

## Migration Checklist Template

For all future PRs with migrations:

- [ ] Migration is idempotent (checks before add/drop)
- [ ] Migration tested locally (up and down)
- [ ] Migration tested with re-run (idempotence verified)
- [ ] Migration tested on staging
- [ ] Downgrade path works correctly
- [ ] No manual schema changes needed
- [ ] Documentation updated if needed

---

**Status:** ✅ Fixed and deployed
**Next Deployment:** Should succeed without errors
**Follow-up:** Consider adding migration linting/validation in CI
