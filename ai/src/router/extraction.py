from fastapi import APIRouter, HTTPException, Depends
import time

from src.service.data__ingestion import DataIngestion
from src.service.llm import LLMService
from src.service.graph import GraphService


router = APIRouter()

async def get_data_ingestion_service():
  return DataIngestion()

async def get_llm_service():
  return LLMService()

async def get_graph_service():
  return GraphService()

@router.post("/extract")
async def extract_entities(
  file_path: str,
  file_type: str,
  data_ingestion_service: DataIngestion = Depends(get_data_ingestion_service),
  llm_service: LLMService = Depends(get_llm_service),
  graph_service: GraphService = Depends(get_graph_service)
):
  """Extract entities from text"""
  start_time = time.time()

  try:
    f =  open(file=file_path, mode="rb")
    texts = data_ingestion_service.extract_text_from_files(file_bytes= f.read(), type=file_type)
    # split into chunk
    text = "\n".join(texts)

    # Get Entities
    entities = await llm_service.extract_entities(text=text)
    
    # Get Entity Name
    entity_name = []
    for entity in entities:
      entity_name.append(entity["name"])
    
    # Get Relation
    relations  = await llm_service.extract_relations(text=text, entities=entity_name)

    # Gen Embedding
    source_embedding = []
    for entity in entities:
      source_embedding.append(f'{entity["name"], entity["type"], entity["description"]}')
    embeddings = await llm_service.get_embeddings(input=source_embedding)

    for index, embedding in enumerate(embeddings):
      entities[index]["embedding"] = embedding

    insert_entity = await graph_service.insert_entities(entities=entities)
    insert_relation = await graph_service.insert_relations(relations=relations)

    processing_time = time.time() - start_time
    return {
      "message": "succesfull",
      "processing_time": processing_time,
      "data" : {
        "entities": entities,
        "relations": relations,
      }
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

