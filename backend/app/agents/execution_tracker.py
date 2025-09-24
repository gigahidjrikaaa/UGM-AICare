"""LangGraph execution state tracker for real-time monitoring."""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Set, Callable
from uuid import uuid4

from app.schemas.enhanced_agents import (
    GraphExecutionState,
    NodeExecutionState, 
    EdgeExecutionState,
    NodeExecutionStatus,
    EdgeType
)

class ExecutionStateTracker:
    """Tracks execution state of LangGraph agents in real-time."""
    
    def __init__(self):
        self._active_executions: Dict[str, GraphExecutionState] = {}
        self._execution_history: List[GraphExecutionState] = []
        self._subscribers: Set[Callable] = set()
        self._node_metrics: Dict[str, Dict[str, float]] = {}
        
    def start_execution(self, graph_id: str, agent_name: str) -> str:
        """Start tracking a new execution."""
        execution_id = str(uuid4())
        execution_state = GraphExecutionState(
            graph_id=graph_id,
            execution_id=execution_id,
            status=NodeExecutionStatus.RUNNING,
            started_at=datetime.now(),
            metrics={"agent_name": agent_name}
        )
        self._active_executions[execution_id] = execution_state
        self._notify_subscribers("execution_started", execution_state)
        return execution_id
    
    def start_node(self, execution_id: str, node_id: str) -> None:
        """Mark a node as started."""
        if execution_id not in self._active_executions:
            return
            
        execution = self._active_executions[execution_id]
        
        # Update current node
        execution.current_node = node_id
        
        # Find or create node state
        node_state = None
        for node in execution.nodes:
            if node.node_id == node_id:
                node_state = node
                break
                
        if not node_state:
            node_state = NodeExecutionState(
                node_id=node_id,
                status=NodeExecutionStatus.RUNNING,
                started_at=datetime.now()
            )
            execution.nodes.append(node_state)
        else:
            node_state.status = NodeExecutionStatus.RUNNING
            node_state.started_at = datetime.now()
            
        self._notify_subscribers("node_started", execution)
    
    def complete_node(self, execution_id: str, node_id: str, metrics: Optional[Dict] = None) -> None:
        """Mark a node as completed."""
        if execution_id not in self._active_executions:
            return
            
        execution = self._active_executions[execution_id]
        
        for node in execution.nodes:
            if node.node_id == node_id:
                node.status = NodeExecutionStatus.COMPLETED
                node.completed_at = datetime.now()
                if node.started_at:
                    node.execution_time_ms = int((node.completed_at - node.started_at).total_seconds() * 1000)
                if metrics:
                    node.metrics.update(metrics)
                    
                # Update global node metrics
                self._update_node_metrics(node_id, node.execution_time_ms or 0)
                break
                
        self._notify_subscribers("node_completed", execution)
    
    def fail_node(self, execution_id: str, node_id: str, error: str) -> None:
        """Mark a node as failed."""
        if execution_id not in self._active_executions:
            return
            
        execution = self._active_executions[execution_id]
        
        for node in execution.nodes:
            if node.node_id == node_id:
                node.status = NodeExecutionStatus.FAILED
                node.completed_at = datetime.now()
                node.error_message = error
                if node.started_at:
                    node.execution_time_ms = int((node.completed_at - node.started_at).total_seconds() * 1000)
                break
                
        self._notify_subscribers("node_failed", execution)
    
    def trigger_edge(self, execution_id: str, edge_id: str, condition_result: Optional[bool] = None) -> None:
        """Mark an edge as triggered."""
        if execution_id not in self._active_executions:
            return
            
        execution = self._active_executions[execution_id]
        
        # Find or create edge state
        edge_state = None
        for edge in execution.edges:
            if edge.edge_id == edge_id:
                edge_state = edge
                break
                
        if not edge_state:
            edge_state = EdgeExecutionState(
                edge_id=edge_id,
                source="",  # Will be populated from graph spec
                target="",
                edge_type=EdgeType.CONDITIONAL if condition_result is not None else EdgeType.NORMAL,
                triggered=True,
                evaluation_result=condition_result
            )
            execution.edges.append(edge_state)
        else:
            edge_state.triggered = True
            edge_state.evaluation_result = condition_result
            
        self._notify_subscribers("edge_triggered", execution)
    
    def complete_execution(self, execution_id: str, success: bool = True) -> None:
        """Complete an execution."""
        if execution_id not in self._active_executions:
            return
            
        execution = self._active_executions[execution_id]
        execution.status = NodeExecutionStatus.COMPLETED if success else NodeExecutionStatus.FAILED
        execution.completed_at = datetime.now()
        execution.current_node = None
        
        # Move to history
        self._execution_history.append(execution)
        del self._active_executions[execution_id]
        
        # Keep only last 100 executions
        if len(self._execution_history) > 100:
            self._execution_history = self._execution_history[-100:]
            
        self._notify_subscribers("execution_completed", execution)
    
    def get_active_executions(self) -> List[GraphExecutionState]:
        """Get all active executions."""
        return list(self._active_executions.values())
    
    def get_execution_history(self, limit: int = 20) -> List[GraphExecutionState]:
        """Get recent execution history."""
        return self._execution_history[-limit:]
    
    def get_node_metrics(self) -> Dict[str, Dict[str, float]]:
        """Get aggregated node performance metrics."""
        return self._node_metrics.copy()
    
    def subscribe(self, callback: Callable) -> None:
        """Subscribe to execution state changes."""
        self._subscribers.add(callback)
    
    def unsubscribe(self, callback: Callable) -> None:
        """Unsubscribe from execution state changes."""
        self._subscribers.discard(callback)
    
    def _update_node_metrics(self, node_id: str, execution_time_ms: int) -> None:
        """Update aggregated metrics for a node."""
        if node_id not in self._node_metrics:
            self._node_metrics[node_id] = {
                "total_executions": 0,
                "total_time_ms": 0,
                "avg_time_ms": 0,
                "min_time_ms": float('inf'),
                "max_time_ms": 0
            }
            
        metrics = self._node_metrics[node_id]
        metrics["total_executions"] += 1
        metrics["total_time_ms"] += execution_time_ms
        metrics["avg_time_ms"] = metrics["total_time_ms"] / metrics["total_executions"]
        metrics["min_time_ms"] = min(metrics["min_time_ms"], execution_time_ms)
        metrics["max_time_ms"] = max(metrics["max_time_ms"], execution_time_ms)
    
    def _notify_subscribers(self, event_type: str, execution: GraphExecutionState) -> None:
        """Notify all subscribers of state changes."""
        for callback in self._subscribers:
            try:
                if asyncio.iscoroutinefunction(callback):
                    asyncio.create_task(callback(event_type, execution))
                else:
                    callback(event_type, execution)
            except Exception as e:
                print(f"Error notifying subscriber: {e}")

# Global instance
execution_tracker = ExecutionStateTracker()