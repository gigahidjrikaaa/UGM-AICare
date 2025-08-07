# backend/app/schemas/docs.py
from pydantic import BaseModel
from typing import Any, List, Dict, Optional

# Documentation models
class EndpointExample(BaseModel):
    """Example request and response for an endpoint"""
    request: Dict[str, Any]
    response: Dict[str, Any]
    description: str

class EndpointDoc(BaseModel):
    """Documentation for a specific endpoint"""
    path: str
    method: str
    summary: str
    description: str
    parameters: Optional[List[Dict[str, Any]]] = None
    request_body: Optional[Dict[str, Any]] = None
    responses: Dict[str, Dict[str, Any]]
    examples: Optional[List[EndpointExample]] = None

class ModuleDoc(BaseModel):
    """Documentation for a module of related endpoints"""
    name: str
    description: str
    endpoints: List[EndpointDoc]