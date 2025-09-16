
from typing import TypedDict, Annotated, Sequence
import operator
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from app.agents.tools.resource_lookup import resource_lookup

# 1. Define the tools for the agent to use
tools = [db_resource_lookup]

# 2. Define the agent state
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    classification: str
    recommended_resources: list[dict]

# 3. Define the nodes
def call_model(state: AgentState):
    """Calls the LLM to classify the conversation."""
    response = llm.invoke(state['messages'])
    return {"classification": response.content}

def call_resource_lookup(state: AgentState):
    """Looks up resources based on the classification."""
    tool = next((t for t in tools if t.name == "db_resource_lookup"), None)
    if tool:
        resources = tool.invoke({"classification": state["classification"]})
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
llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0)

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
