"""
Initialize database schema via Alembic.

Alembic is the single source of truth for the schema. This script shells out
to `alembic upgrade head` so a fresh database is created through the migration
chain (never via `Base.metadata.create_all`, which silently diverges from the
migrations).
"""
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    print("=" * 80)
    print("DATABASE INITIALIZATION VIA ALEMBIC")
    print("=" * 80)
    print()

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_ROOT,
    )

    if result.returncode != 0:
        print()
        print("=" * 80)
        print("ERROR RUNNING MIGRATIONS")
        print("=" * 80)
        print("This might happen if:")
        print("- DATABASE_URL is not configured")
        print("- The database is unreachable")
        print("- A migration failed mid-way (check alembic_version)")
        sys.exit(result.returncode)

    print()
    print("Schema is at Alembic head. Start services with ./dev.sh up")


if __name__ == "__main__":
    main()
