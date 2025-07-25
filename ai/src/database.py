
from neo4j import AsyncGraphDatabase
import chromadb
from typing import Literal


from src.config import Config


class Neo4jConnection:
  def __init__(self):
        self.driver = None
    
  async def connect(self):
        self.driver = AsyncGraphDatabase.driver(
            Config.NEO4J_URI, 
            auth=(Config.NEO4J_USERNAME, Config.NEO4J_PASSWORD)
        )
    
  async def close(self):
        if self.driver:
            await self.driver.close()
    
  async def execute_query(self, query: str, parameters: dict = None, access_mode: Literal['WRITE', 'READ']='WRITE'):
        """Execute query with specified access mode"""
        async with self.driver.session(default_access_mode=access_mode) as session:
            result = await session.run(query, parameters or {})
            return await result.data()
  
  async def execute_read_query(self, query: str, parameters: dict = None):
        """Convenience method for read queries"""
        return await self.execute_query(query, parameters, access_mode='READ')
    
  async def execute_write_query(self, query: str, parameters: dict = None):
        """Convenience method for write queries"""
        return await self.execute_query(query, parameters, access_mode='WRITE')
  
class ChromaConnection:
    def __init__(self):
        self.client = None
        self.collection = None
    
    def connect(self):
        self.client = chromadb.HttpClient(
            host=Config.CHROMA_HOST,
            port=Config.CHROMA_PORT
        )
        self.collection = self.client.get_or_create_collection(
            name=Config.CHROMA_COLLECTION
        )

neo4j_conn = Neo4jConnection()
# chroma_conn = ChromaConnection()

async def init_database():
    try:
      await neo4j_conn.connect()
      # chroma_conn.connect()
      print("Connected to Neo4j Database")
    except Exception as e:
      print(f"Couldn't Connect to Neo4j Database:s {e}")
