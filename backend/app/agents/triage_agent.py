
import logging
import operator
import os
from typing import Annotated, Sequence, TypedDict

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph

from app.agents.tools.resource_lookup import resource_lookup
from app.agents.tools.db_resource_lookup import db_resource_lookup

logger = logging.getLogger(__name__)

# 1. Define the tools for the agent to use
tools = [db_resource_lookup, resource_lookup]

# 2. Define the agent state
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    classification: str
    recommended_resources: list[dict]

# 3. Define the nodes

_llm: ChatGoogleGenerativeAI | None = None


def get_llm() -> ChatGoogleGenerativeAI:
    """Lazily instantiate the Gemini model when credentials are available."""
    global _llm
    if _llm is not None:
        return _llm

    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_GENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Google Generative AI credentials not configured")

    _llm = ChatGoogleGenerativeAI(
        model="gemini-pro",
        temperature=0,
        google_api_key=api_key,
    )
    return _llm


def heuristic_classify(messages: Sequence[BaseMessage]) -> str:
    """Fallback lightweight classifier when Gemini credentials are unavailable."""
    text = " ".join(
        getattr(message, "content", "") for message in messages if getattr(message, "content", None)
    ).lower()

    crisis_keywords = {"suicide", "kill myself", "self harm", "end it", "hurt myself"}
    concern_keywords = {"depressed", "anxious", "panic", "overwhelmed", "can\'t cope"}

    if any(keyword in text for keyword in crisis_keywords):
        return "high"
    if any(keyword in text for keyword in concern_keywords):
        return "medium"
    return "low"


def call_model(state: AgentState):
    """Calls the LLM to classify the conversation."""
    try:
        llm = get_llm()
        response = llm.invoke(state["messages"])
        classification = response.content
    except Exception as exc:  # pragma: no cover - depends on external service
        logger.warning("Falling back to heuristic triage classification: %s", exc)
        classification = heuristic_classify(state["messages"])

    return {"classification": classification}

def call_resource_lookup(state: AgentState):
    """Looks up resources based on the classification."""
    tool = next((t for t in tools if t.name == "db_resource_lookup"), None)
    if tool:
        resources = tool.invoke({"classification": state["classification"]})
    else:
        fallback_tool = next((t for t in tools if t.name == "resource_lookup"), None)
        if fallback_tool:
            resources = fallback_tool.invoke({"classification": state["classification"]})
        else:
            resources = []
    return {"recommended_resources": resources}

# 4. Define the conditional edges
def should_lookup_resources(state: AgentState):
    """Decides whether to look up resources based on the classification."""
    if state["classification"].lower() in ["medium", "high"]:
        return "lookup_resources"
    else:
        return "end"

# 5. Define the graph
graph = StateGraph(AgentState)
graph.add_node("llm", call_model)
graph.add_node("lookup_resources", call_resource_lookup)

graph.set_entry_point("llm")
graph.add_conditional_edges(
    "llm",
    should_lookup_resources,
    {
        "lookup_resources": "lookup_resources",
        "end": END,
    },
)
graph.add_edge("lookup_resources", END)

# 6. Compile the graph
triage_agent = graph.compile()

# Example of how to run the agent
if __name__ == '__main__':
    inputs = {"messages": [HumanMessage(content="I'm feeling really down today. I don't know what to do.")]}
    for event in triage_agent.stream(inputs):
        for k, v in event.items():
            print(f"Output from node '{k}':")
            print(v)
            print("----")
