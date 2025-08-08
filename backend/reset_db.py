import asyncio
import sys
from app.database import Base, async_engine

async def reset_database():
    """Reset database tables asynchronously using asyncpg"""
    print("⚠️  WARNING: This will drop all tables and delete all data.")
    # In a production environment or a shared dev environment, you might want to
    # also check an environment variable like `ALLOW_DB_RESET=true`.
    confirm = input("Are you sure you want to continue? (yes/no): ")

    if confirm.lower() != 'yes':
        print("Aborting database reset.")
        sys.exit(0)

    print("\nDropping all tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    print("Creating all tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("Done.")
    await async_engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_database())
