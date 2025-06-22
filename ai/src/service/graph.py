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
        
    async def OneHopBFS(self, 
                                 query: str, 
                                 top_k: int = 10,
                                 ) -> list[dict]:
        try:
            query_embedding = await self.llm_service.get_embeddings(input=[query], task="RETRIEVAL_QUERY")
            if not query_embedding[0]:
                raise Exception("Fail to generate embedding") 
            
            query_cypher = """
            CALL db.index.vector.queryNodes("entityIndex", $top_k, $query_embedding)
            YIELD node AS central, score
            MATCH (central)-[r]-(neighbor)
            WHERE central.id IS NOT NULL AND neighbor.id IS NOT NULL
            WITH central, neighbor, r, score,
                CASE WHEN central.id = startNode(r).id THEN 'OUTGOING' ELSE 'INCOMING' END AS direction
            RETURN DISTINCT
                central.id AS central_id,
                central.name AS central_name,
                central.type AS central_type,
                central.description AS central_description,
                score,
                neighbor.id AS neighbor_id,
                neighbor.name AS neighbor_name,
                neighbor.type AS neighbor_type,
                neighbor.description AS neighbor_description,
                r.name AS relation_name,
                direction
            ORDER BY score DESC
            LIMIT 50
            """
            result = await neo4j_conn.execute_query(
                query=query_cypher,
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
        
    async def AllShortestPath(self, query: str, top_k: int = 10) -> list[dict]:
        try:
            query_embedding = await self.llm_service.get_embeddings(input=[query], task="RETRIEVAL_QUERY")
            if not query_embedding[0]:
                raise Exception("Fail to generate embedding") 
            
            query_cypher = """
            CALL db.index.vector.queryNodes("entityIndex", $top_k, $query_embedding)
            YIELD node AS central, score

            WITH collect(central) AS centralNodes

            UNWIND centralNodes AS source
            UNWIND centralNodes AS target

            WITH source, target
            WHERE source <> target

            MATCH p = shortestPath((source)-[*..5]-(target))
            WHERE ALL(n IN nodes(p) WHERE n.id IS NOT NULL)

            RETURN DISTINCT
                source.id AS source_id,
                target.id AS target_id,
                [n IN nodes(p) | {id: n.id, name: n.name, type: n.type}] AS path_nodes,
                [r IN relationships(p) | {type: type(r), name: r.name}] AS path_rels,
                length(p) AS hops
            ORDER BY hops ASC
            LIMIT 50
            """
            result = await neo4j_conn.execute_query(
                query=query_cypher,
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
