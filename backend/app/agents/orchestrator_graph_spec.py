"""Graph specification for the Orchestrator agent visualization."""

ORCHESTRATOR_GRAPH_SPEC = {
    "id": "orchestrator",
    "name": "Query Orchestrator",
    "nodes": [
        {
            "id": "receive_question",
            "label": "Receive Question",
            "description": "Accept natural language question from user interface.",
            "column": 0,
            "row": 0,
        },
        {
            "id": "classify_intent",
            "label": "Classify Intent",
            "description": "Determine which agent should handle the question using pattern matching.",
            "column": 1,
            "row": 0,
        },
        {
            "id": "route_triage",
            "label": "Route to Triage",
            "description": "Handle triage-related questions about risk assessments.",
            "column": 2,
            "row": -1,
        },
        {
            "id": "route_analytics", 
            "label": "Route to Analytics",
            "description": "Handle analytics questions using structured pipeline: interpret → run → explain.",
            "column": 2,
            "row": 0,
        },
        {
            "id": "route_intervention",
            "label": "Route to Intervention", 
            "description": "Handle intervention-related questions (future implementation).",
            "column": 2,
            "row": 1,
        },
        {
            "id": "collect_response",
            "label": "Collect Response",
            "description": "Gather results from the selected agent and format for user.",
            "column": 3,
            "row": 0,
        },
        {
            "id": "return_answer",
            "label": "Return Answer",
            "description": "Send final formatted answer back to user interface.",
            "column": 4,
            "row": 0,
        },
    ],
    "edges": [
        {"source": "receive_question", "target": "classify_intent"},
        {
            "source": "classify_intent", 
            "target": "route_triage",
            "condition": "intent == 'triage'",
            "label": "Triage Questions"
        },
        {
            "source": "classify_intent",
            "target": "route_analytics", 
            "condition": "intent == 'analytics'",
            "label": "Analytics Questions"
        },
        {
            "source": "classify_intent",
            "target": "route_intervention",
            "condition": "intent == 'intervention'", 
            "label": "Intervention Questions"
        },
        {"source": "route_triage", "target": "collect_response"},
        {"source": "route_analytics", "target": "collect_response"},
        {"source": "route_intervention", "target": "collect_response"},
        {"source": "collect_response", "target": "return_answer"},
    ],
}