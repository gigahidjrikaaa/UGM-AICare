"""Triage agent API endpoints."""
from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage

from app.agents.triage_agent import triage_agent
from app.schemas.agents import TriageClassifyRequest, TriageClassifyResponse

router = APIRouter(prefix="/api/v1/triage", tags=["Triage"])


@router.post("/classify", response_model=TriageClassifyResponse)
async def classify_message(payload: TriageClassifyRequest) -> TriageClassifyResponse:
    """Classify a single user message using the triage agent."""
    try:
        inputs = {"messages": [HumanMessage(content=payload.message)]}
        result = await triage_agent.ainvoke(inputs)
        return TriageClassifyResponse(
            classification=result.get("classification", ""),
            recommended_resources=result.get("recommended_resources", []),
        )
    except Exception as exc:  # pragma: no cover - passthrough for now
        raise HTTPException(status_code=500, detail=str(exc)) from exc
