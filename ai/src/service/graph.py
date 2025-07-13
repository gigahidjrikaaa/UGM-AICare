from uuid import uuid4
import logging
import asyncio

from src.database import neo4j_conn
from src.service.llm import LLMService
from src.model.schema import Entity, Relation

logger = logging.getLogger(__name__)

class GraphService:

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service

    @staticmethod
    def __remove_duplicates_dict_list(dict_list):
        seen = set()
        unique_list = []
        for d in dict_list:
            # Convert to a tuple of sorted items to ensure consistent order
            dict_tuple = tuple(sorted(d.items()))
            if dict_tuple not in seen:
                seen.add(dict_tuple)
                unique_list.append(d)
        return unique_list
    
    async def insert_entities(self, entities: list[Entity]):
        try:
            query = """
                UNWIND $data AS row
                CALL apoc.create.node([row.type, 'Entity'], {
                    name: row.name, 
                    id: row.id, 
                    chunk_id: row.chunk_id,
                    description: row.description, 
                    embedding: row.embedding
                    }) YIELD node
                RETURN node
                """

            for ent in entities:
                ent.id = str(uuid4())
            entity_dicts = [ent.model_dump() for ent in entities]
            result = await neo4j_conn.execute_query(
                query=query,
                parameters={"data": entity_dicts}
            )
            logger.info(f"Add {len(entities)} entities on Graph Database.")
            return result
        except Exception as e:
            logger.error(f"Failed to insert entities: {e}")
            return None

    async def insert_relations(self, relations: list[Relation]):
        try:
            query = """
            UNWIND $data AS row
            MATCH (source {name: row.source_entity})
            MATCH (target {name: row.target_entity})
            CALL apoc.create.relationship(
                source, 
                row.type, 
                {name: row.name, id: row.id, chunk_id: row.chunk_id}, 
                target
                ) YIELD rel
            RETURN rel
            """
            for rel in relations:
                rel.id = str(uuid4())

            relations_dicts = [ent.model_dump() for ent in relations]
            result = await neo4j_conn.execute_query(
                query=query,
                parameters={"data": relations_dicts}
            )
            logger.info(f"Add {len(relations)} relations on Graph Database.")
            return result
        except Exception as e:
            logger.error(f"Failed to insert relations: {e}")
            return None

    async def get_entities_chunk_id(self, chunk_id: str) -> list[Entity]:
        try:
            query = f"""
            MATCH (n)
            WHERE n.chunk_id = "{chunk_id}"
            RETURN n.name AS name, n.description AS description
            """
            result = await neo4j_conn.execute_query(
                query=query,
            )

            records = result.record if hasattr(result, "record") else result
            return [Entity(**dict(record)) for record in records]
        except Exception as e:
            logger.error(f"Failed to get etities: {e}")
            return []

    async def find_entity(self, entity: str, query: str, top_k: int = 3) -> list[dict]:
        """Find entity by exact, fulltext, or vector fallback match."""
        try:
            # 1. Exact match (normalized)
            # result = await self._find_by_normalized_name(entity)
            # if len(result) >= 0:
            #     return result

            # 2. Fulltext match
            result = await self._find_by_fulltext(entity, top_k=top_k)
            if len(result) >= 0:
                return result

            # 3. Vector similarity match
            result = await self._find_by_vector(name=entity, query=query, top_k=top_k)
            if len(result) >= 0:
                return result

            return []
        except Exception as e:
            logger.error(f"[ERROR] Failed to find entity: {e}")
            return []

    
    async def _find_by_normalized_name(self, name: str) -> list[dict]:
        try:
            query = """
            MATCH (e:Entity)
            WHERE toLower(trim(e.name)) = toLower(trim($name))
            RETURN e.name AS name, e.id AS id, e.type AS type, e.description AS description
            LIMIT 1
            """
            result = await neo4j_conn.execute_query(query=query, parameters={"name": name})
            return [dict(row) for row in result] if result else []
        except Exception as e:
            logger.warning(f"Cannot find Entity by exact name {e}")
            return []

    async def _find_by_fulltext(self, name: str, top_k: int = 5) -> list[dict]:
        try:
            query = """
            CALL db.index.fulltext.queryNodes('entityNameIndex', $name)
            YIELD node, score
            RETURN node.name AS name, node.id AS id, node.type AS type, node.description AS description, score
            ORDER BY score DESC
            LIMIT $top_k
            """
            result = await neo4j_conn.execute_query(
                query=query, 
                parameters={
                    "name": name,
                    "top_k": top_k
                    }
            )
            return [dict(row) for row in result] if result else []
        except Exception as e:
            logger.warning(f"Cannot find Entity by fulltext {e}")
            return []

    async def _find_by_vector(self, name: str, query: str, top_k: int = 3) -> list[dict]:
        try: 
            embedding = await self.llm_service.get_embeddings(input=[f"{name}, {query}"], task="RETRIEVAL_QUERY")
            if not embedding or not embedding[0]:
                return None

            query = """
            CALL db.index.vector.queryNodes('entityIndex', $top_k, $embedding)
            YIELD node, score
            RETURN node.name AS name, node.id AS id, node.type AS type, node.description AS description, score
            """
            result = await neo4j_conn.execute_query(
                query=query,
                parameters={
                    "embedding" : embedding[0],
                    "top_k"     : top_k
                    }
            )
            return [dict(row) for row in result] if result else []
        except Exception as e:
            logger.warning(f"Cannot find Entity by vector {e}")
            return []
        
    async def SemanticNeighborSearch(self, 
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
    async def EntityBasedNeighborSearch(
        self,
        query: str,
        candidate_entities: list[str],
        top_k: int = 3,
        limit: int = 50,
    ) -> list[dict]:
        """
        Performs neighbor search starting from specific candidate entities.
        
        Args:
            query: Original search query (for logging/context)
            candidate_entities: List of entity names to search from
            top_k: Maximum number of results to return
            relation_types: Optional list of relation types to filter by
            max_execution_time: Maximum execution time in seconds
            
        Returns:
            List of dictionaries containing entity relationship data
            
        Raises:
            ValueError: If input parameters are invalid
            TimeoutError: If execution exceeds max_execution_time
        """
        
        if not isinstance(candidate_entities, list) or not candidate_entities:
            raise ValueError("candidate_entities must be a non-empty list")
        
        try:
            logger.info(f"Starting entity-based neighbor search for {len(candidate_entities)} candidates")
            
            entities_nested = await asyncio.gather(*[
                self.find_entity(entity=e, query=query, top_k=top_k) for e in candidate_entities
            ])

            
            entities = [item for sublist in entities_nested if sublist for item in sublist]
            unique_entities_map = {item['id']: item for item in entities}
            unique_entities = list(unique_entities_map.values())
            
            if not unique_entities:
                logger.warning("No valid entities found from candidates")
                return []
            
            logger.info(f"Found {len(unique_entities)} valid entities from candidates")
            
            query_cypher = """
            UNWIND $entities AS entity
            MATCH (central:Entity) WHERE central.id = entity.id

            CALL(central) {
                OPTIONAL MATCH (central)-[r]-(neighbor)
                
                RETURN COLLECT({
                    neighbor: {
                        id: neighbor.id,
                        name: neighbor.name,
                        type: labels(neighbor),
                        description: neighbor.description
                    },
                    relation: {
                        name: r.name,
                        type: type(r),
                        direction: CASE WHEN startNode(r).id = central.id THEN 'OUTGOING' ELSE 'INCOMING' END
                    }
                })[..$neighbor_limit] AS limited_neighborhood
            }

            RETURN
                central.id AS central_id,
                central.name AS central_name,
                labels(central) AS central_type,
                central.description AS central_description,
                entity.score AS score,
                limited_neighborhood AS neighborhood
            LIMIT $limit
            """
            
            parameters = {
                "entities": unique_entities,
                "limit": limit,
                "neighbor_limit": 5,
                }
            
            result = await neo4j_conn.execute_query(
                query=query_cypher,
                parameters=parameters
            )
            
            records = result.record if hasattr(result, "record") else result
            logger.info(f"Entity-based neighbor search completed, returned {len(records)} results")
            
            return [dict(record) for record in records]
        except Exception as e:
            logger.error(f"Entity-based neighbor search failed: {e}")
            return []
        
    async def SemanticAllShortestPath(self, 
                              query: str,
                              max_hop: int = 10,
                              limit: int = 50,
                              top_k: int = 10
                              ) -> list[dict]:
        try:
            query_embedding = await self.llm_service.get_embeddings(input=[query], task="RETRIEVAL_QUERY")
            if not query_embedding[0]:
                raise Exception("Fail to generate embedding") 
            
            query_cypher = f"""
            CALL db.index.vector.queryNodes("entityIndex", $top_k, $query_embedding)
            YIELD node AS central, score

            WITH collect(central) AS centralNodes

            UNWIND centralNodes AS source
            UNWIND centralNodes AS target

            WITH source, target
            WHERE source <> target

            MATCH p = allShortestPaths((source)-[*1..{max_hop}]-(target))
            WHERE ALL(n IN nodes(p) WHERE n.id IS NOT NULL)

            WITH p, source, target, nodes(p) as path_nodes_raw, relationships(p) as path_rels_raw

            RETURN DISTINCT
            source.id AS source_id,
            target.id AS target_id,
            [i IN range(0, size(path_nodes_raw)-1) | {{
                        id: path_nodes_raw[i].id,
                        name: path_nodes_raw[i].name,
                        type: path_nodes_raw[i].type,
                        description: path_nodes_raw[i].description,
                        position: i
            }}] AS path_nodes,
            [i IN range(0, size(path_rels_raw)-1) | {{
                        type: type(path_rels_raw[i]),
                        name: path_rels_raw[i].name,
                        direction: CASE 
                            WHEN startNode(path_rels_raw[i]).id = path_nodes_raw[i].id 
                            THEN 'OUTGOING' 
                            ELSE 'INCOMING' 
                        END
            }}] AS path_rels,
            length(p) AS hops
            ORDER BY hops ASC
            LIMIT $limit
            """
            result = await neo4j_conn.execute_query(
                query=query_cypher,
                parameters={
                    "query_embedding": query_embedding[0],
                    "limit": limit,
                    "top_k": top_k
                }
            )

            records = result.record if hasattr(result, "record") else result
            return [dict(record) for record in records]
        
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []

    async def EntityBasedAllShortestPath(self, 
                              query: str, 
                              candidate_entities: list = [],
                              max_hop: int = 5,
                              limit: int = 50,
                              ) -> list[dict]:
        try:
            entities = await asyncio.gather(*[
                self.find_entity(entity=e, query=query) for e in candidate_entities
            ])
            
            entities = [e for e in entities if e]
            if len(entities) < 2:
                raise Exception("Need at least two valid entities for path finding.")
            
            entity_ids = [e["id"] for e in entities]

            query_cypher = f"""
            UNWIND $entity_ids AS source_id
            UNWIND $entity_ids AS target_id
            WITH source_id, target_id WHERE source_id <> target_id

            MATCH (source:Entity {{id: source_id}})
            MATCH (target:Entity {{id: target_id}})
            
            MATCH p = allShortestPaths((source)-[*1..{max_hop}]-(target))
            WHERE ALL(n IN nodes(p) WHERE n.id IS NOT NULL)

            WITH p, source, target, nodes(p) as path_nodes_raw, relationships(p) as path_rels_raw

            RETURN DISTINCT
            source.id AS source_id,
            target.id AS target_id,
            [i IN range(0, size(path_nodes_raw)-1) | {{
                        id: path_nodes_raw[i].id,
                        name: path_nodes_raw[i].name,
                        type: path_nodes_raw[i].type,
                        description: path_nodes_raw[i].description,
                        position: i
            }}] AS path_nodes,
            [i IN range(0, size(path_rels_raw)-1) | {{
                        type: type(path_rels_raw[i]),
                        name: path_rels_raw[i].name,
                        direction: CASE 
                            WHEN startNode(path_rels_raw[i]).id = path_nodes_raw[i].id 
                            THEN 'OUTGOING' 
                            ELSE 'INCOMING' 
                        END
            }}] AS path_rels,
            length(p) AS hops
            ORDER BY hops ASC
            LIMIT $limit
            """

            result = await neo4j_conn.execute_query(
                query=query_cypher,
                parameters={
                    "entity_ids": entity_ids,
                    "limit": limit,
                }
            )

            records = result.record if hasattr(result, "record") else result
            return [dict(record) for record in records]
        
        except Exception as e:
            logger.error(f"Entity Based All Shortest Path search failed: {e}")
            return []

    async def graph_traversal(self, entities: list[dict]):
        pass
