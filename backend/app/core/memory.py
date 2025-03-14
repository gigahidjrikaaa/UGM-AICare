import redis
import json
import os

# Connect to Redis (or replace with a database)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", 6379)
REDIS_USERNAME = os.getenv("REDIS_USERNAME", None)
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True, username=REDIS_USERNAME, password=REDIS_PASSWORD)

class AikaMemory:
    @staticmethod
    def check_connection():
        """ Check if Redis connection is working """
        try:
            redis_client.ping()
        except redis.exceptions.ConnectionError:
            print("Cannot connect to Redis. Please check the connection settings.")
            raise

    @staticmethod
    def save_memory(user_id: str, message: str):
        """ Store messages in Redis for conversation history """
        history = AikaMemory.get_memory(user_id)
        history.append({"role": "user", "content": message})
        redis_client.set(user_id, json.dumps(history))

    @staticmethod
    def save_memory_direct(user_id: str, history: list):
        """ Store complete conversation history """
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
