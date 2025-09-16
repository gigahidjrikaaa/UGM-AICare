"""Admin endpoints for inspecting LangGraph agents."""
from fastapi import APIRouter, Depends

from app.dependencies import get_admin_user
from app.models import User
from app.schemas.agents import LangGraphState, LangGraphNode, LangGraphEdge

router = APIRouter(prefix="/langgraph", tags=["Admin"])


@router.get("/state", response_model=LangGraphState)
async def get_langgraph_state(admin_user: User = Depends(get_admin_user)) -> LangGraphState:
    """Return the current LangGraph topology. Currently returns a mock payload."""
    nodes = [
        LangGraphNode(id="llm", type="node", data={"name": "LLM"}),
        LangGraphNode(id="lookup_resources", type="node", data={"name": "Resource Lookup"}),
        LangGraphNode(id="end", type="output", data={"name": "End"}),
    ]
    edges = [
        LangGraphEdge(source="llm", target="lookup_resources"),
        LangGraphEdge(source="lookup_resources", target="end"),
    ]
    return LangGraphState(nodes=nodes, edges=edges)
