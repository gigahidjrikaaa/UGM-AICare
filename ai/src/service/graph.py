from uuid import uuid4

from src.database import neo4j_conn

class GraphService:
  async def insert_entities(self, entities: list[dict]):
    try:
        query = """
        UNWIND $data AS row
        MERGE (e:Entity {name: row.entity})
        SET e.id = row.id,
            e.type = row.type,
            e.description = row.description
        """

        # Assign UUID to each entity
        for ent in entities:
            ent["id"] = str(uuid4())

        result = await neo4j_conn.execute_query(
            query=query,
            parameters={"data": entities}  # ✅ wrap in dict with key 'data'
        )
        return result  # Optional: return result if needed
    except Exception as e:
        print(f"[ERROR] Failed to insert entities: {e}")
        return None
