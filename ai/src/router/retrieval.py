from fastapi import APIRouter, HTTPException, Depends, Body
import logging
from typing import Literal, Optional
from pydantic import BaseModel

from src.service.llm import LLMService
from src.service.graph import GraphService

async def get_llm_service():
  return LLMService()

async def get_graph_service():
  return GraphService(llm_service=await get_llm_service())


logger = logging.getLogger(__name__)

router = APIRouter()

def extract_one_hop_bfs_graph_to_knowlwdge(graph: list[dict]) -> str:
  try:
      description = {}
      knowledge_set = set()

      for fact in graph:
          if fact["central_name"] not in description:
              description[fact['central_name']] = fact['central_description'] or ""
          if fact['neighbor_name'] not in description:
              description[fact['neighbor_name']] = fact['neighbor_description'] or ""

          relation = fact.get("relation_name", "terkait_dengan")

          if fact['direction'] == "OUTGOING":
              line = f"{fact['central_name']} {relation} {fact['neighbor_name']}"
          else:
              line = f"{fact['neighbor_name']} {relation} {fact['central_name']}"

          knowledge_set.add(line)

      description_lines = [f"- {name}: {desc}" for name, desc in description.items()]

      description_text = "Deskripsi:\n" + "\n".join(description_lines)
      facts_text = "Fakta:\n" + "\n".join(sorted(knowledge_set))

      knowledge = f"{description_text}\n\n{facts_text}"
      return knowledge
  except Exception as e:
     return ""
def transform_graph_to_knowledge_text(graph_results: list[dict], desc_limit: int = 100) -> str:
    """
    Transforms nested graph results into a rich, LLM-friendly knowledge text,
    including truncated neighbor descriptions.
    """
    if not graph_results:
        return ""

    knowledge_blocks = []
    for item in graph_results:
        central_name = item.get('central_name', 'N/A')
        central_type = item.get('central_type', 'N/A')
        central_desc = item.get('central_description', 'Tidak ada deskripsi.')
        score = item.get('score', 0.0)

        block = [
            f"### Entitas: {central_name} (Tipe: {central_type})",
            f"- Deskripsi: {central_desc}",
            f"- Skor Relevansi Awal: {score:.2f}",
            "- Hubungan Terkait:"
        ]

        neighborhood = item.get('neighborhood', [])
        if not any(n.get('neighbor') for n in neighborhood):
            block.append("  - Tidak ditemukan hubungan terkait.")
        else:
            for relation_info in neighborhood:
                neighbor = relation_info.get('neighbor', {})
                relation = relation_info.get('relation', {})
                
                neighbor_name = neighbor.get('name', 'N/A')
                neighbor_type = neighbor.get('type', 'N/A')
                # MENAMBAHKAN DESKRIPSI TETANGGA
                neighbor_desc = neighbor.get('description', '')
                if neighbor_desc and len(neighbor_desc) > desc_limit:
                    neighbor_desc = neighbor_desc[:desc_limit] + "..."
                
                relation_name = relation.get('name', 'terkait dengan')
                relation_type = relation.get('type', 'TERKAIT_DENGAN')
                direction = relation.get('direction', 'OUTGOING')

                desc_part = f" | Deskripsi: \"{neighbor_desc}\"" if neighbor_desc else ""
                
                if direction == 'OUTGOING':
                    line = f"  - [OUTGOING] --[{relation_name}|Tipe: {relation_type}]--> {neighbor_name} (Tipe: {neighbor_type}{desc_part})"
                else:
                    line = f"  - [INCOMING] <--[{relation_name}|Tipe: {relation_type}]-- {neighbor_name} (Tipe: {neighbor_type}{desc_part})"
                
                block.append(line)
        
        knowledge_blocks.append("\n".join(block))

    header = "Berikut adalah informasi yang ditemukan dari knowledge graph:\n"
    return header + "\n\n".join(knowledge_blocks)

def parse_full_path_knowledge(paths: list[dict]) -> str:
    try:
      description = {}
      fact_lines = set()

      for path in paths:
          nodes = path.get("path_nodes", [])
          rels = path.get("path_rels", [])

          # 1. Collect descriptions directly from node field
          for node in nodes:
              name = node.get("name", "")
              desc = node.get("description", "")
              if name and desc and name not in description:
                description[name] = desc

          # 2. Build full path fact string
          if len(nodes) >= 2 and len(rels) >= 1:
              path_str = ""
              for i in range(len(rels)):
                  source = nodes[i]["name"]
                  target = nodes[i + 1]["name"]
                  relation = rels[i].get("name", "terhubung")
                  direction = rels[i].get("direction", "OUTGOING")

                  if direction == "OUTGOING":
                      path_str += f"{source} --[{relation}]--> "
                  else:
                      path_str += f"{target} <--[{relation}]-- "

              path_str += nodes[-1]["name"]
              fact_lines.add(path_str)

      # Merge all output
      description_str = "Deskripsi:\n" + "\n".join(
          f"{name}: {desc}" for name, desc in description.items()
      )
      fakta_str = "Fakta:\n" + "\n".join(sorted(fact_lines))

      return f"{description_str}\n\n{fakta_str}"
    except Exception as e:
       logger.error(f"Fail to parse path response: {e}")
       return ""


class GetAnswerBody(BaseModel):
  query: str
  method: Literal[
     'semantic_neighbor',
     'semantic_shortest_path',
     'entity_neighbor',
     'entity_shortest_path'
     ] = 'entity_neighbor'
  max_hop: Optional[int] = 10
  limit: Optional[int] = 50
  top_k: Optional[int] = 10

@router.post("/get-answer")
async def get_answer(
  body: GetAnswerBody = Body(...),
  graph_service: GraphService = Depends(get_graph_service),
  llm_service: LLMService = Depends(get_llm_service)
):
  try:
    query   = body.query
    method  = body.method
    max_hop = body.max_hop
    limit   = body.limit
    top_k   = body.top_k

    query_class  = await llm_service.query_classification(query=query)
    candidate_entities = query_class.get("entities", [])

    method_map = {
      'semantic_neighbor': graph_service.SemanticNeighborSearch,
      'semantic_shortest_path': graph_service.SemanticAllShortestPath,
      'entity_neighbor': graph_service.EntityBasedNeighborSearch,
      'entity_shortest_path': graph_service.EntityBasedAllShortestPath
    }

    result: dict      = {}
    graph: list[dict] = []
    knowledge: list   = ""

    if method == "semantic_neighbor":
      graph = await graph_service.SemanticNeighborSearch(query=query, top_k=top_k)
      knowledge = extract_one_hop_bfs_graph_to_knowlwdge(graph=graph)

    elif method == "semantic_shortest_path":
      graph = await graph_service.SemanticAllShortestPath(query=query, max_hop = max_hop, limit= limit, top_k=top_k)
      knowledge = parse_full_path_knowledge(paths=graph)

    elif method == "entity_neighbor":
      graph = await graph_service.EntityBasedNeighborSearch(query=query, candidate_entities=candidate_entities, limit=limit)
      knowledge = transform_graph_to_knowledge_text(graph_results=graph, desc_limit=100)

    elif method == "entity_shortest_path":
      graph = await graph_service.EntityBasedAllShortestPath(query=query, candidate_entities=candidate_entities, max_hop=10, limit=50)
      knowledge = parse_full_path_knowledge(paths=graph)
    else:
       raise HTTPException(status_code=400, detail=f"Unknown method: {method}") 

    answer = await llm_service.answer_query_with_knowledge_retrieval(query=query, knowledge=knowledge)
    result['method']      = method
    result['query_class'] = query_class
    result['answer']      = answer
    result['knowledge']   = knowledge
    result['graph']       = graph


    return{
      "message": "Sucessfull",
      "data": result
    }

  except Exception as e:
    logger.error(f"Error Get answer{e}")
    raise HTTPException(500, detail=str(e))