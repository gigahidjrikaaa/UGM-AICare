import redis # type: ignore
import json
import os

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Connect to Redis (or replace with a database)
REDIS_HOST = os.getenv("REDIS_URL")
REDIS_PORT = os.getenv("REDIS_PORT")
REDIS_USERNAME = os.getenv("REDIS_USERNAME", None)
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True, username=REDIS_USERNAME, password=REDIS_PASSWORD)

class AikaMemory:
    @staticmethod
    def check_connection():
        """ Check if Redis connection is working """
        try:
            print("Checking Redis connection...")
            redis_client.ping()
            print("Redis connection successful")
            return True
        except redis.exceptions.ConnectionError as e:
            print(f"Cannot connect to Redis. Error: {e}")
            print("Please check the connection settings.")
            return False

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

    def __init__(self):
        self.check_connection()