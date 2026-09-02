# Schema Dump (current_schema.sql)

This directory previously contained `current_schema.sql`, a `pg_dump` snapshot
that had gone stale — it only contained the `alembic_version` table and gave a
false sense of schema coverage. It has been renamed to
`current_schema.sql.stale` pending deletion.

## Regenerating a real schema dump

Alembic is the single source of truth for the schema. To produce a fresh,
authoritative dump for documentation or drift checks, run one of:

```bash
# From the live database (preferred — reflects actual deployed state):
pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" > current_schema.sql

# Offline, from the migration chain (no DB required):
alembic upgrade head --sql > current_schema.sql
```

A CI check should assert the dump is non-trivial (e.g., contains
`CREATE TABLE public.users`) so it can never silently go stale again.
