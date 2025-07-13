from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
import logging
import os
import time
import asyncio
import aiofiles
from typing import List

from src.service.llm import LLMService
from src.service.graph import GraphService
from src.model.schema import Entity, Relation, EvaluationDataset


router = APIRouter()
logger = logging.getLogger(__name__)

async def get_llm_service():
  return LLMService()

async def get_graph_service():
  return GraphService(llm_service = await get_llm_service())


class GenerateEvaluationDatasetBody(BaseModel):
  chunk_id: str


@router.get("/generate-evaluation-dataset")
async def generate_evaluation_dataset(
  body: GenerateEvaluationDatasetBody = Body(...),
  llm_service: LLMService = Depends(get_llm_service),
  graph_service: GraphService = Depends(get_graph_service)
):
  try:
    chunk_id = body.chunk_id
    file_path = f"./data/{chunk_id}"

    if not os.path.exists(file_path):
      raise HTTPException(status_code=404, detail=f"File not found: {chunk_id}")

    entities: list[Entity] = await graph_service.get_entities_chunk_id(chunk_id=chunk_id)
    doc = ""
    
    async with aiofiles.open(file_path, mode="r") as f:
      doc = await f.read()

    response: List[EvaluationDataset] = await llm_service.generate_evaluation_dataset(doc=doc, nodes=entities, minimum=len(entities))


    return {
      "data": response
    }
  except HTTPException:
    raise
  except Exception as e:
    logger.exception(f"Failed to generate evaluation dataset: {e}")
    raise HTTPException(status_code=500, detail=str(e))