from uuid import uuid4
import logging

from src.database import neo4j_conn
from src.service.llm import LLMService

logger = logging.getLogger(__name__)

class GraphService:

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service

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
        
    async def get_top_k_entities(self, 
                                 query: str, 
                                 top_k: int = 10,
                                 ) -> list[dict]:
        try:
            query_embedding = await self.llm_service.get_embeddings(input=[query], task="RETRIEVAL_QUERY")
            if not query_embedding[0]:
                raise Exception("Fail to generate embedding") 

            query_cypher = """
            WITH $query_embedding AS embedding
            MATCH (e:Entity)
            WHERE e.embedding IS NOT NULL
            WITH e, gds.alpha.similarity.cosine(e.embedding, embedding) AS score
            RETURN e.name AS name, e.type AS type, e.description AS description, score
            ORDER BY score DESC
            LIMIT $top_k
            """

            query_cypher2 = """
            CALL db.index.vector.queryNodes('entityIndex', $top_k, $query_embedding)
            YIELD node, score
            RETURN node.name AS name, node.type AS type, node.description AS description, score
            """

            result = await neo4j_conn.execute_query(
                query=query_cypher2,
                parameters={
                    "query_embedding": query_embedding[0],
                    "top_k": top_k
                }
            )

            records = result.record if hasattr(result, "record") else result
            return [dict(record) for record in records]
        
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []

    async def graph_traversal(self, entities: list[dict]):
        pass
