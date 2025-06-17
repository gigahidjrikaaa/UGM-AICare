from typing import Any, Dict, Optional
import redis.asyncio as redis # type: ignore
import json
import logging
import os

# Load environment variables from .env file
from dotenv import load_dotenv

load_dotenv()

# --- Redis Configuration ---
REDIS_HOST_ENV = os.getenv("REDIS_HOST")            # Example value: "redis-19980.c334.asia-southeast2-1.gce.redns.redis-cloud.com"
REDIS_PORT_ENV = os.getenv("REDIS_PORT")            # Example value: "19980"
REDIS_DB_ENV = os.getenv("REDIS_DB", "0")           # Default to 0 if not set
REDIS_USERNAME_ENV = os.getenv("REDIS_USERNAME")    # Example value: "default"
REDIS_PASSWORD_ENV = os.getenv("REDIS_PASSWORD")    # Example value: "your_password_here"

# Set an expiration time for module state keys in seconds (e.g., 1 hour)
MODULE_STATE_EXPIRY_SECONDS = 3600

# Key prefix for Redis keys to avoid collisions
KEY_PREFIX = "ugm-aicare"

logger = logging.getLogger(__name__)

# --- Redis Client Setup ---
# Global client instance (or use a dependency injection pattern)
redis_pool = None

async def get_redis_client() -> redis.Redis:
    """
    Gets a connection from the Redis connection pool.
    Initializes the pool if it doesn't exist.
    Adjust this function based on your project's Redis setup (e.g., using FastAPI dependencies).
    """
    global redis_pool
    if redis_pool is None:
        try:
            # Check environment variables
            if not REDIS_HOST_ENV or not REDIS_PORT_ENV:
                raise ValueError("REDIS_HOST and REDIS_PORT must be set in environment variables.")
            if not REDIS_DB_ENV:
                logger.warning("REDIS_DB not set, defaulting to 0.")
            
            # Prepare connection arguments
            connection_args = {
                "host": REDIS_HOST_ENV,
                "port": int(REDIS_PORT_ENV), 
                "db": int(REDIS_DB_ENV), 
                "decode_responses": True
            }

            # Only add username and password if they are provided
            if REDIS_USERNAME_ENV:
                connection_args["username"] = REDIS_USERNAME_ENV # Changed variable name
            if REDIS_PASSWORD_ENV:
                connection_args["password"] = REDIS_PASSWORD_ENV # Changed variable name
            
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


def _get_module_state_key(session_id: str) -> str:
    """Helper function to generate the Redis key for module state."""
    return f"{KEY_PREFIX}:{session_id}:module_state"

# --- Guided Module State Functions ---

async def set_module_state(session_id: str, module_id: str, step: int, module_data: Dict[str, Any]):
    """
    Stores the current guided module state (module ID and step) in Redis for a session.
    Sets an expiration time for the key.

    Args:
        session_id: The unique ID for the chat session.
        module_id: The identifier of the active module (e.g., 'thought_record').
        step: The current step number within the module.

    Raises:
        ConnectionError: If connection to Redis fails.
        Exception: For other Redis errors.
    """
    if not session_id:
        logger.warning("set_module_state called with empty session_id")
        return

    key = _get_module_state_key(session_id)
    state_to_store = {"module_id": module_id, "step_id": step, "data": module_data}

    try:
        client = await get_redis_client()
        json_state = json.dumps(state_to_store)
        await client.set(key, json_state, ex=MODULE_STATE_EXPIRY_SECONDS)
        logger.info(f"Redis SET: Key='{key}', Value='{json_state}', EX='{MODULE_STATE_EXPIRY_SECONDS}'")
    except ConnectionError:
        # Logged in get_redis_client, re-raise
        raise
    except Exception as e:
        logger.error(f"Redis Error setting key '{key}': {e}", exc_info=True)
        raise

async def get_module_state(session_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves the current guided module state from Redis for a session.

    Args:
        session_id: The unique ID for the chat session.

    Returns:
        A dictionary containing {'module': module_id, 'step': step} if state exists,
        otherwise None.

    Raises:
        ConnectionError: If connection to Redis fails.
    """
    if not session_id:
        logger.warning("get_module_state called with empty session_id")
        return None

    key = _get_module_state_key(session_id)
    try:
        client = await get_redis_client()
        json_state = await client.get(key)

        if json_state:
            logger.debug(f"Redis GET Success: Key='{key}', Value='{json_state}'")
            try:
                state_data = json.loads(json_state)
                # --- VALIDATE and return all parts, including data ---
                if (isinstance(state_data, dict) and
                        'module_id' in state_data and
                        'step_id' in state_data and
                        'data' in state_data and isinstance(state_data['data'], dict)): # Ensure 'data' is a dict
                     return state_data
                else:
                     logger.warning(f"Redis GET: Invalid JSON structure for module state key '{key}': {json_state}")
                     return None
            except json.JSONDecodeError:
                logger.error(f"Redis GET: Failed to decode JSON for key '{key}': {json_state}", exc_info=True)
                # Optionally delete the invalid key here: await client.delete(key)
                return None
        else:
            logger.debug(f"Redis GET Miss: Key='{key}' not found.")
            return None
    except ConnectionError:
        # Logged in get_redis_client, re-raise
        raise
    except Exception as e:
        logger.error(f"Redis Error getting key '{key}': {e}", exc_info=True)
        # Depending on policy, might return None or raise exception
        return None # Return None on generic errors to potentially allow fallback

async def clear_module_state(session_id: str):
    """
    Deletes the guided module state from Redis for a session.

    Args:
        session_id: The unique ID for the chat session.

    Raises:
        ConnectionError: If connection to Redis fails.
        Exception: For other Redis errors.
    """
    if not session_id:
        logger.warning("clear_module_state called with empty session_id")
        return

    key = _get_module_state_key(session_id)
    try:
        client = await get_redis_client()
        deleted_count = await client.delete(key)
        logger.info(f"Redis DEL: Key='{key}'. Deleted count: {deleted_count}")
    except ConnectionError:
        # Logged in get_redis_client, re-raise
        raise
    except Exception as e:
        logger.error(f"Redis Error deleting key '{key}': {e}", exc_info=True)
        raise
