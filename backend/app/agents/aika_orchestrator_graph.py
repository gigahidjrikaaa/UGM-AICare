"""Unified Aika Orchestrator Graph - LangGraph with Aika as First Decision Node.

This module is the assembly point for the unified Aika orchestrator.  All
node logic, prompt construction, routing, and background tasks now live in
dedicated sub-modules under ``app/agents/aika/``.  This file only wires those
pieces together into a LangGraph ``StateGraph`` and exposes the two public
factory functions below.

Real-time Graph Architecture:
    START -> aika_decision_node
                 |
                 |--[high/critical]--> parallel_crisis (TCA || CMA, async fan-out)
                 |                           |
                 |--[moderate]-----> execute_sca (TCA only)
                 |                           |
                 |--[analytics]----> execute_ia  |
                 |                      |       |
                 '--[direct]---> END    '-------'--> synthesize --> END

Safety Triage Agent (STA) - Post-Conversation Background Task:
    STA does NOT participate in the real-time graph.  It runs separately:
    - Automatically triggered via asyncio.create_task() when a conversation ends.
    - Manually triggerable via the trigger_conversation_analysis tool.
    - Performs deep clinical analysis: risk trend, PHQ-9/GAD-7/DASS-21 screening,
      psychologist report, and CMA referral recommendation.
    - Results persisted to ConversationRiskAssessment and ScreeningProfile tables.

Sub-module map:
    aika/constants.py        Static data — crisis keywords, smalltalk vocab.
    aika/message_classifier.py  Pure classification helpers.
    aika/prompt_builder.py   Prompt construction helpers.
    aika/decision_node.py    aika_decision_node — first orchestrator node.
    aika/background_tasks.py Fire-and-forget STA analysis + screening update.
    aika/subgraph_nodes.py   TCA, CMA, IA, synthesize node implementations.
    aika/routing.py          Conditional edge functions for the graph.
"""
from __future__ import annotations

import logging
from functools import partial
from typing import Optional, TYPE_CHECKING

from langgraph.graph import StateGraph, END
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph_state import AikaOrchestratorState

# ---------------------------------------------------------------------------
# Re-export extracted nodes and utilities so external import paths remain
# stable.  Any code that does ``from app.agents.aika_orchestrator_graph import
# aika_decision_node`` (or any other name below) will continue to work.
# ---------------------------------------------------------------------------
from app.agents.aika.decision_node import aika_decision_node
from app.agents.aika.background_tasks import trigger_sta_conversation_analysis_background
from app.agents.aika.subgraph_nodes import (
    _AsyncInvokable,
    parallel_crisis_node,
    execute_sca_subgraph,
    execute_sda_subgraph,
    execute_ia_subgraph,
    synthesize_final_response,
    execute_sta_subgraph,
)
from app.agents.aika.routing import (
    should_invoke_agents,
    should_route_to_sca,
    ROUTE_CRISIS_PARALLEL,
    ROUTE_TCA,
    ROUTE_IA,
    ROUTE_END,
)

# Lazy TYPE_CHECKING imports kept for IDE/type-checker support only.
if TYPE_CHECKING:
    from app.agents.sta.sta_graph import create_sta_graph
    from app.agents.tca.tca_graph import create_tca_graph
    from app.agents.cma.cma_graph import create_cma_graph
    from app.agents.ia.ia_graph import create_ia_graph

logger = logging.getLogger(__name__)


# ============================================================================
# GRAPH CONSTRUCTION
# ============================================================================

def create_aika_unified_graph(db: AsyncSession) -> StateGraph:
    """Assemble and return the compiled Aika orchestrator StateGraph.

    Graph structure::

        START
          |
          +-- aika_decision --+-- [cma]   --> parallel_crisis --> synthesize --> END
                              |-- [tca]   --> execute_sca     --> synthesize --> END
                              |-- [ia]    --> execute_ia       --> synthesize --> END
                              '-- [direct]                                    --> END

    STA is NOT a node in this graph.  It runs as a fire-and-forget background
    task (trigger_sta_conversation_analysis_background) when a conversation
    ends, or can be triggered manually via the trigger_conversation_analysis
    tool.  execute_sda (CMA) is not registered as a standalone node; it is
    invoked exclusively inside parallel_crisis_node via asyncio.gather.

    Args:
        db: Database session injected into every node via functools.partial.

    Returns:
        Compiled StateGraph ready for invocation with .ainvoke() or .astream().
    """
    workflow = StateGraph(AikaOrchestratorState)

    # Bind the db session to each async node so LangGraph can call them as
    # single-argument functions (state -> state).
    workflow.add_node("aika_decision", partial(aika_decision_node, db=db))
    workflow.add_node("parallel_crisis", partial(parallel_crisis_node, db=db))
    workflow.add_node("execute_sca", partial(execute_sca_subgraph, db=db))
    workflow.add_node("execute_ia", partial(execute_ia_subgraph, db=db))
    workflow.add_node("synthesize", partial(synthesize_final_response, db=db))

    # Entry point
    workflow.set_entry_point("aika_decision")

    # Conditional fan-out after the decision node
    workflow.add_conditional_edges(
        "aika_decision",
        should_invoke_agents,
        {
            ROUTE_CRISIS_PARALLEL: "parallel_crisis",
            ROUTE_TCA: "execute_sca",
            ROUTE_IA: "execute_ia",
            ROUTE_END: END,
        },
    )

    # All non-direct paths converge at synthesize, then exit.
    workflow.add_edge("execute_sca", "synthesize")
    workflow.add_edge("parallel_crisis", "synthesize")
    workflow.add_edge("execute_ia", "synthesize")
    workflow.add_edge("synthesize", END)

    logger.info("Unified Aika orchestrator graph created.")

    return workflow


def create_aika_agent_with_checkpointing(
    db: AsyncSession,
    checkpointer: Optional[object] = None,
) -> object:
    """Compile the Aika agent with optional conversation-persistent checkpointing.

    Checkpointing is the recommended production configuration: LangGraph stores
    the full orchestrator state after each node so conversations can resume
    across requests (and even across server restarts when using an external
    checkpointer such as AsyncSqliteSaver or AsyncPostgresSaver).

    Example — in-memory (testing)::

        from langgraph.checkpoint.memory import MemorySaver
        aika = create_aika_agent_with_checkpointing(db, MemorySaver())
        result = await aika.ainvoke(state, config={"configurable": {"thread_id": f"user_{uid}"}})

    Example — SQLite (lightweight production)::

        from langgraph.checkpoint.aiosqlite import AsyncSqliteSaver
        memory = await AsyncSqliteSaver.from_conn_string("checkpoints.db")
        aika = create_aika_agent_with_checkpointing(db, memory)

    Args:
        db:           Database session for all agent operations.
        checkpointer: Optional LangGraph checkpointer.  When None, a stateless
                      (no conversation memory) graph is returned.

    Returns:
        CompiledGraph ready for direct invocation.
    """
    workflow = create_aika_unified_graph(db)

    if checkpointer:
        logger.info(
            "Aika agent compiled WITH checkpointing: %s",
            type(checkpointer).__name__,
        )
        return workflow.compile(checkpointer=checkpointer)

    logger.warning("Aika agent compiled WITHOUT checkpointing (stateless).")
    return workflow.compile()
