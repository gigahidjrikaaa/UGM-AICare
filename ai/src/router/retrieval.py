from fastapi import APIRouter, HTTPException, Depends, Body
import logging
from pydantic import BaseModel

from src.service.llm import LLMService
from src.service.graph import GraphService

async def get_llm_service():
  return LLMService()

async def get_graph_service():
  return GraphService(llm_service=await get_llm_service())


logger = logging.getLogger(__name__)

router = APIRouter()

class GetAnswerBody(BaseModel):
  query: str
  top_k: int

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
     return []
      

@router.post("/get-answer")
async def get_answer(
  body: GetAnswerBody = Body(...),
  graph_service: GraphService = Depends(get_graph_service),
  llm_service: LLMService = Depends(get_llm_service)
):
  try:
    query = body.query

    graphBFS = await graph_service.OneHopBFS(query=query, top_k=body.top_k)
    graphAllShortestPath = await graph_service.AllShortestPath(query=query, top_k=body.top_k)

    knowledge = extract_one_hop_bfs_graph_to_knowlwdge(graph=graphBFS)

    answer = await llm_service.answer_query_with_knowledge_retrieval(query=query, knowledge=knowledge)

    return{
      "message": "Sucessfull",
      "data": {
        "answer"    : answer,
      }
    }

  except Exception as e:
    logger.error(f"Error Get answer{e}")
    raise HTTPException(500, detail=str(e))