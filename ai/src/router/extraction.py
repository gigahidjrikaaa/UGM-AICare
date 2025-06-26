from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
import logging
import time
import asyncio

from src.service.data__ingestion import DataIngestion
from src.service.llm import LLMService
from src.service.graph import GraphService
from src.model.schema import EntityRelationResponse, Entity, Relation
from src.utils.extraction import remove_duplicates_by_keys


router = APIRouter()
logger = logging.getLogger(__name__)
async def get_data_ingestion_service():
  return DataIngestion()

async def get_llm_service():
  return LLMService()

async def get_graph_service():
  return GraphService(llm_service=await get_llm_service())

class ExtractEntitiesBody(BaseModel):
  file_path: str
  file_type: str

@router.post("/extract")
async def extract_entities_relations(
  body: ExtractEntitiesBody = Body(...),
  data_ingestion_service: DataIngestion = Depends(get_data_ingestion_service),
  llm_service: LLMService = Depends(get_llm_service),
  graph_service: GraphService = Depends(get_graph_service)
):
  """Extract entities from text"""
  start_time = time.time()

  try:
    file_path = body.file_path
    file_type = body.file_type
    logger.info("Entity  Relation Extraction Started")
    logger.info(body)

    if file_type == "html":
      with open(file_path, mode="r", encoding="utf-8") as f:
        logger.info("Start extract text from html doc")
        html_content = f.read()
        texts = data_ingestion_service.extract_text_from_html(html_content=html_content)
    else:
      with open(file_path, mode="rb") as f:
        file_bytes = f.read()
        texts = data_ingestion_service.extract_text_from_files(file_bytes=file_bytes, type=file_type)
    all_results = EntityRelationResponse(entities=[], relations=[])

    extraction_tasks = [llm_service.extract_entities_and_relations(text=chunk) for chunk in texts]
    chunk_results: list[EntityRelationResponse] = await asyncio.gather(*extraction_tasks, return_exceptions=True)
    
    for res in chunk_results:
      if isinstance(res, Exception):
        logger.error(f"An error occurred during chunk extraction: {res}")
        continue
      if res:
        all_results.entities.extend(res.entities)
        all_results.relations.extend(res.relations)
  
    deduped_entities:list[Entity] = remove_duplicates_by_keys(all_results.entities, keys=["name", "type"])
    deduped_relations: list[Relation] = remove_duplicates_by_keys(all_results.relations, keys=["source_entity", "target_entity", "name", "type"])

    logger.info(f"Extracted {len(deduped_entities)} entities and {len(deduped_relations)} relations.")

    source_embedding = [
       f'{entity.name}, {entity.type}, {entity.description}'
       for entity in deduped_entities
       ]
    
    embeddings = await llm_service.get_embeddings(input=source_embedding, task="RETRIEVAL_DOCUMENT")

    for entity, embedding in zip(deduped_entities, embeddings):
      entity.embeding = embedding

    insert_entity = await graph_service.insert_entities(entities=deduped_entities)
    insert_relation = await graph_service.insert_relations(relations=deduped_relations)

    processing_time = time.time() - start_time
    return {
      "message": "successful",
      "processing_time": processing_time,
      "total_entities": len(deduped_entities),
      "total_relation": len(deduped_relations),
      "data": {
        "entities": deduped_entities,
        "relations": deduped_relations
        }
        }

  except Exception as e:
    logger.error(f"Fail to Extract Entities and Relations from Documen {body.file_path} : {str(e)}")
    raise HTTPException(status_code=500, detail=str(e))