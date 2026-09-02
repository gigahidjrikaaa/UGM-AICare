import asyncio
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

url = re.sub(r"\?[^?]*$", "", os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+asyncpg://"))

LEGACY = [
    "emergency_contact_name", "risk_level", "clinical_summary", "therapy_notes",
    "preferred_language", "accessibility_needs", "communication_preferences", "aicare_team_notes",
]


async def main():
    eng = create_async_engine(url, connect_args={"ssl": True, "server_settings": {"jit": "off"}})
    async with eng.begin() as conn:
        v = (await conn.execute(text("SELECT version_num FROM alembic_version"))).scalar()
        print("alembic_version:", v)

        rows = await conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name = ANY(:names)"),
            {"names": LEGACY},
        )
        print("legacy columns remaining on users (should be []):", [r[0] for r in rows])

        for t in ["user_profiles", "user_preferences", "user_clinical_records", "user_emergency_contacts"]:
            n = (await conn.execute(text(f"SELECT COUNT(*) FROM {t}"))).scalar()
            print(f"{t}: {n} rows")

        n = (await conn.execute(text(
            "SELECT COUNT(*) FROM user_clinical_records WHERE clinical_summary IS NOT NULL "
            "OR current_risk_level IS NOT NULL OR safety_plan_notes IS NOT NULL"
        ))).scalar()
        print("clinical rows with backfilled data:", n)

        rows = await conn.execute(text(
            "SELECT table_name, column_name, data_type FROM information_schema.columns "
            "WHERE table_name IN ('user_preferences','user_profiles','users','journal_entries') "
            "AND column_name IN ('created_at','updated_at') ORDER BY table_name"
        ))
        for r in rows:
            print("ts:", r[0], r[1], "=", r[2])

        n = (await conn.execute(text("SELECT COUNT(*) FROM care_token_mints"))).scalar()
        print("care_token_mints exists, rows:", n)

        rows = await conn.execute(text("SELECT conname FROM pg_constraint WHERE contype='c' AND conname LIKE 'ck_%'"))
        print("CHECK constraints:", sorted(r[0] for r in rows))

        n = (await conn.execute(text(
            "SELECT COUNT(*) FROM pg_constraint WHERE contype='f' AND conname IN ("
            "'fk_consent_ledger_user_restrict','fk_audit_log_user_restrict',"
            "'fk_alerts_seen_by_set_null','fk_revenue_reports_created_by_set_null')"
        ))).scalar()
        print("key new FKs present:", n)

    await eng.dispose()


asyncio.run(main())
