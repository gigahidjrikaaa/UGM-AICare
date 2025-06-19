from fastapi import APIRouter, HTTPException, Depends
import logging

from src.service.llm import LLMService
from src.service.graph import GraphService

async def get_llm_service():
  return LLMService()

async def get_graph_service():
  return GraphService(llm_service=await get_llm_service())


logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/get-answer")
async def get_answer(
  query: str,
  graph_service: GraphService = Depends(get_graph_service)
):
  try:
    result = await graph_service.get_top_k_entities(query=query, top_k=10)
    return{
      "message": "Sucessfull",
      "data": result
    }
  except Exception as e:
    logger.error(f"Error Get answer{e}")
    raise HTTPException(500, detail=str(e))