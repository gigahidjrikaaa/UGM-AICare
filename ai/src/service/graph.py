from uuid import uuid4
import logging
from src.database import neo4j_conn


logger = logging.getLogger(__name__)

class GraphService:
    async def insert_entities(self, entities: list[dict]):
        try:
            query = """
                UNWIND $data AS row
                MERGE (e:Entity {name: row.name})
                SET e.id = row.id,
                    e.type = row.type,
                    e.description = row.description,
                    e.embedding = row.embedding
                """

            # Assign UUID to each entity
            for ent in entities:
                ent["id"] = str(uuid4())

            result = await neo4j_conn.execute_query(
                query=query,
                parameters={"data": entities}
            )
            logger.info(f"Add {len(entities)} entities on Graph Database.")
            return result
        except Exception as e:
            logger.error(f"Failed to insert entities: {e}")
            return None

    async def insert_relations(self, relations: list[dict]):
        try:
            query = """
            UNWIND $data AS row
            MATCH (source:Entity {name: row.source_entity})
            MATCH (target:Entity {name: row.target_entity})
            MERGE (source)-[r:Relation {name: row.name}]->(target)
            SET r.id = row.id
            """

            # Assign UUID if not provided
            for rel in relations:
                rel["id"] = str(uuid4())
                rel.pop("metadata", None)

            result = await neo4j_conn.execute_query(
                query=query,
                parameters={"data": relations}
            )
            logger.info(f"Add {len(relations)} relations on Graph Database.")
            return result
        except Exception as e:
            logger.error(f"Failed to insert relations: {e}")
            return None
