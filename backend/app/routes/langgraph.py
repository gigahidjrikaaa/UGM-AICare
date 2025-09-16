"""Admin endpoints for inspecting LangGraph agents."""
from typing import Iterable, List

from fastapi import APIRouter, Depends, Query

from app.agents.analytics_agent import ANALYTICS_GRAPH_SPEC
from app.agents.triage_agent import TRIAGE_GRAPH_SPEC
from app.dependencies import get_admin_user
from app.models import User
from app.schemas.agents import LangGraphEdge, LangGraphNode, LangGraphState

router = APIRouter(prefix="/api/v1/admin/agents-config", tags=["Admin"])

GRAPH_SPECS = {
    spec["id"]: spec
    for spec in (
        TRIAGE_GRAPH_SPEC,
        ANALYTICS_GRAPH_SPEC,
    )
}


def _flatten_specs(specs: Iterable[dict]) -> tuple[List[LangGraphNode], List[LangGraphEdge]]:
    nodes: List[LangGraphNode] = []
    edges: List[LangGraphEdge] = []

    for spec in specs:
        agent_id = spec["id"]
        prefix = f"{agent_id}::"
        for node_def in spec.get("nodes", []):
            node_id = prefix + node_def["id"]
            node_data = {
                "label": node_def.get("label", node_def["id"].replace("_", " ").title()),
                "agent": spec.get("name", agent_id.title()),
                "agentId": agent_id,
                "description": node_def.get("description", ""),
                "column": node_def.get("column", 0),
                "row": node_def.get("row", 0),
            }
            nodes.append(
                LangGraphNode(
                    id=node_id,
                    type=node_def.get("type", "process"),
                    data=node_data,
                )
            )

        for edge_def in spec.get("edges", []):
            edges.append(
                LangGraphEdge(
                    source=prefix + edge_def["source"],
                    target=prefix + edge_def["target"],
                    data={"agentId": agent_id, "label": edge_def.get("label")}
                    if edge_def.get("label")
                    else {"agentId": agent_id},
                )
            )

    return nodes, edges


@router.get("", response_model=LangGraphState)
async def get_langgraph_state(
    agent: str | None = Query(None, description="Filter nodes by agent id"),
    admin_user: User = Depends(get_admin_user),
) -> LangGraphState:
    """Return the LangGraph topology for the configured agents."""

    if agent:
        spec = GRAPH_SPECS.get(agent)
        specs = [spec] if spec else []
    else:
        specs = GRAPH_SPECS.values()

    nodes, edges = _flatten_specs(specs)
    return LangGraphState(nodes=nodes, edges=edges)
