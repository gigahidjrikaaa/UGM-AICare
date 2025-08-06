import asyncio
from app.database import Base, async_engine

async def reset_database():
    """Reset database tables asynchronously using asyncpg"""
    print("Dropping all tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    print("Creating all tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("Done.")
    await async_engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_database())
