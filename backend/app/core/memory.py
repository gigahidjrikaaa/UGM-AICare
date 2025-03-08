import redis
import json
import os

# Connect to Redis (or replace with a database)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", 6379)

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

class AikaMemory:
    @staticmethod
    def save_memory(user_id: str, message: str):
        """ Store messages in Redis for conversation history """
        history = AikaMemory.get_memory(user_id)
        history.append({"role": "user", "content": message})
        redis_client.set(user_id, json.dumps(history))

    @staticmethod
    def get_memory(user_id: str):
        """ Retrieve past messages for context """
        history = redis_client.get(user_id)
        return json.loads(history) if history else []

    @staticmethod
    def clear_memory(user_id: str):
        """ Clear user conversation history """
        redis_client.delete(user_id)
