from typing import Any
import redis.asyncio as redis # type: ignore
import logging
import os
import time

# Load environment variables from .env file
from dotenv import load_dotenv

load_dotenv()

# --- Redis Configuration ---
REDIS_HOST_ENV = os.getenv("REDIS_HOST")            # Example value: "redis-19980.c334.asia-southeast2-1.gce.redns.redis-cloud.com"
REDIS_PORT_ENV = os.getenv("REDIS_PORT")            # Example value: "19980"
REDIS_DB_ENV = os.getenv("REDIS_DB", "0")           # Default to 0 if not set
REDIS_USERNAME_ENV = os.getenv("REDIS_USERNAME")    # Example value: "default"
REDIS_PASSWORD_ENV = os.getenv("REDIS_PASSWORD")    # Example value: "your_password_here"

logger = logging.getLogger(__name__)

# --- Redis Client Setup ---
# Global client instance (or use a dependency injection pattern)
redis_pool = None
mock_redis_instance = None

class MockRedis:
    """
    A simple in-memory mock for Redis to allow the application to run without a Redis server.
    Note: Data is not persistent and is shared only within the same process.
    """
    def __init__(self):
        self.data = {}
        self.expiries = {}
        logger.warning("Using MockRedis. Data will be lost on restart and is not shared across workers.")

    async def get(self, key):
        self._check_expiry(key)
        return self.data.get(key)

    async def set(self, key, value, ex=None):
        self.data[key] = value
        if ex:
            self.expiries[key] = time.time() + ex
        elif key in self.expiries:
            del self.expiries[key]
        return True

    async def incr(self, key):
        self._check_expiry(key)
        val = self.data.get(key, 0)
        try:
            val = int(val) + 1
        except (ValueError, TypeError):
            val = 1
        self.data[key] = str(val)
        return val

    async def expire(self, key, seconds):
        if key in self.data:
            self.expiries[key] = time.time() + seconds
            return True
        return False

    async def delete(self, key):
        if key in self.data:
            del self.data[key]
            if key in self.expiries:
                del self.expiries[key]
            return 1
        return 0

    async def ping(self):
        return True
    
    async def close(self):
        pass

    def _check_expiry(self, key):
        if key in self.expiries and time.time() > self.expiries[key]:
            if key in self.data:
                del self.data[key]
            del self.expiries[key]

async def get_redis_client() -> Any:
    """
    Gets a connection from the Redis connection pool.
    Initializes the pool if it doesn't exist.
    Returns a MockRedis instance if REDIS_HOST is not set.
    """
    global redis_pool, mock_redis_instance

    # Check if Redis is configured
    if not REDIS_HOST_ENV:
        if mock_redis_instance is None:
            mock_redis_instance = MockRedis()
        return mock_redis_instance

    if redis_pool is None:
        try:
            # Check environment variables
            if not REDIS_PORT_ENV:
                raise ValueError("REDIS_PORT must be set if REDIS_HOST is set.")
            
            # Prepare connection arguments
            connection_args = {
                "host": REDIS_HOST_ENV,
                "port": int(REDIS_PORT_ENV), 
                "db": int(REDIS_DB_ENV), 
                "decode_responses": True
            }

            # Only add username and password if they are provided
            if REDIS_USERNAME_ENV:
                connection_args["username"] = REDIS_USERNAME_ENV
            if REDIS_PASSWORD_ENV:
                connection_args["password"] = REDIS_PASSWORD_ENV
            
            logger.info(f"Initializing Redis connection pool with args: {connection_args}")
            redis_pool = redis.ConnectionPool(**connection_args)
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection pool: {e}", exc_info=True)
            raise ConnectionError("Could not connect to Redis") from e

    try:
        # Create a client instance from the pool
        client = redis.Redis(connection_pool=redis_pool)
        await client.ping() # Verify connection
        return client
    except Exception as e:
        logger.error(f"Failed to get Redis client or ping failed: {e}", exc_info=True)
        raise ConnectionError("Could not connect to Redis client or ping failed") from e



