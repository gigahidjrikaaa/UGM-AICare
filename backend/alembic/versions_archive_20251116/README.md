# Archived Migration Lineage (2025-11-16)

The `*.py` files in this directory are a **historical archive** of the
pre-rebuild migration lineage (root revision `92227960c1f8`). They document the
schema evolution of tables that predate the "big bang" rebuild — quest engine,
cases, CBT modules, surveys, appointments, content resources, etc.

**Important:**

- Alembic does **NOT** track this directory. The active chain lives in
  `../versions/` (root `5f0351a53f67`, single linear head).
- These revisions were never rebased onto the active chain; their history is
  untraceable from the active head by design.
- Do not add new migrations here. New migrations always go to `../versions/`.
- `../versions_backup_20251117/migration.tar` is a related backup artifact.
