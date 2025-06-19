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


@router.post("/get-answer")
async def get_answer(
  body: GetAnswerBody = Body(...),
  graph_service: GraphService = Depends(get_graph_service),
  llm_service: LLMService = Depends(get_llm_service)
):
  try:
    query = body.query

    top_k_entities = await graph_service.get_top_k_entities(query=query, top_k=10)

    answer = await llm_service.answer_query_with_knowledge_retrieval(query=query, knowledge=top_k_entities)

    return{
      "message": "Sucessfull",
      "data": {
        "answer"    : answer,
        "knowledge" : top_k_entities,
      }
    }

  except Exception as e:
    logger.error(f"Error Get answer{e}")
    raise HTTPException(500, detail=str(e))