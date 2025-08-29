import asyncio
import os
import sys
from app.database import Base, async_engine

async def reset_database():
    """Reset database tables asynchronously using asyncpg"""
    print("⚠️  WARNING: This will drop all tables and delete all data.")

    print("\nDropping all tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    print("Done.")
    await async_engine.dispose()

if __name__ == "__main__":
    # It's recommended to add a safeguard here for production environments,
    # such as checking an environment variable before proceeding.
    # For example:
    # if os.environ.get("ALLOW_DB_RESET") != "true":
    #     print("Database reset is disabled. Set ALLOW_DB_RESET=true to enable.")
    #     sys.exit(1)
    
    asyncio.run(reset_database())
