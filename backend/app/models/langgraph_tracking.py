"""
Database models for LangGraph execution tracking and analytics.
Phase 2 enhancement for historical data persistence.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, Text, JSON, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Dict, Any, Optional

from app.database import Base

class LangGraphExecution(Base):
    """
    Records for complete LangGraph execution sessions.
    Tracks overall graph execution with performance metrics.
    """
    __tablename__ = "langgraph_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(String, unique=True, index=True)  # UUID for this execution
    agent_run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=True)  # Link to AgentRun
    
    # Execution metadata
    graph_name = Column(String, index=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")  # running, completed, failed, cancelled
    
    # Performance metrics
    total_execution_time_ms = Column(Float, nullable=True)
    total_nodes_executed = Column(Integer, default=0)
    failed_nodes = Column(Integer, default=0)
    success_rate = Column(Float, nullable=True)
    
    # Context and metadata
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    execution_context = Column(JSON, nullable=True)  # Additional context data
    
    # Relationships
    node_executions = relationship("LangGraphNodeExecution", back_populates="execution")
    edge_executions = relationship("LangGraphEdgeExecution", back_populates="execution")
    performance_metrics = relationship("LangGraphPerformanceMetric", back_populates="execution")
    
    def __repr__(self):
        return f"<LangGraphExecution(id={self.id}, graph={self.graph_name}, status={self.status})>"


class LangGraphNodeExecution(Base):
    """
    Individual node execution records within a graph execution.
    Tracks detailed node-level performance and state changes.
    """
    __tablename__ = "langgraph_node_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(String, ForeignKey("langgraph_executions.execution_id"))
    
    # Node identification
    node_id = Column(String, index=True)
    agent_id = Column(String, index=True)
    node_type = Column(String)  # agent, tool, condition, etc.
    
    # Execution tracking
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")  # running, completed, failed, cancelled, skipped
    
    # Performance data
    execution_time_ms = Column(Float, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    cpu_usage_percent = Column(Float, nullable=True)
    
    # Input/Output tracking
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    error_stack_trace = Column(Text, nullable=True)
    
    # Execution context
    retry_count = Column(Integer, default=0)
    execution_order = Column(Integer, nullable=True)  # Order in which nodes were executed
    parent_node_id = Column(String, nullable=True)  # For nested executions
    
    # Custom metrics
    custom_metrics = Column(JSON, nullable=True)
    
    # Relationships
    execution = relationship("LangGraphExecution", back_populates="node_executions")
    
    def __repr__(self):
        return f"<NodeExecution(node={self.node_id}, agent={self.agent_id}, status={self.status})>"


class LangGraphEdgeExecution(Base):
    """
    Edge execution tracking for conditional flows and routing decisions.
    Records when edges are traversed and evaluation results.
    """
    __tablename__ = "langgraph_edge_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(String, ForeignKey("langgraph_executions.execution_id"))
    
    # Edge identification
    edge_id = Column(String, index=True)
    source_node_id = Column(String)
    target_node_id = Column(String)
    edge_type = Column(String, default="normal")  # normal, conditional
    
    # Execution tracking
    triggered_at = Column(DateTime, default=datetime.utcnow)
    evaluation_result = Column(Boolean, nullable=True)  # For conditional edges
    
    # Conditional edge data
    condition_expression = Column(Text, nullable=True)
    condition_context = Column(JSON, nullable=True)
    evaluation_time_ms = Column(Float, nullable=True)
    
    # Flow data
    data_passed = Column(JSON, nullable=True)  # Data passed through the edge
    execution_order = Column(Integer, nullable=True)
    
    # Relationships
    execution = relationship("LangGraphExecution", back_populates="edge_executions")
    
    def __repr__(self):
        return f"<EdgeExecution(edge={self.edge_id}, type={self.edge_type}, result={self.evaluation_result})>"


class LangGraphPerformanceMetric(Base):
    """
    Custom performance metrics and KPIs for graph executions.
    Extensible system for tracking domain-specific metrics.
    """
    __tablename__ = "langgraph_performance_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(String, ForeignKey("langgraph_executions.execution_id"))
    
    # Metric identification
    metric_name = Column(String, index=True)
    metric_category = Column(String, index=True)  # performance, business, quality, etc.
    
    # Metric data
    metric_value = Column(Float)
    metric_unit = Column(String, nullable=True)  # ms, MB, percent, count, etc.
    
    # Context
    recorded_at = Column(DateTime, default=datetime.utcnow)
    node_id = Column(String, nullable=True)  # If metric is node-specific
    tags = Column(JSON, nullable=True)  # Additional tagging for filtering
    
    # Relationships
    execution = relationship("LangGraphExecution", back_populates="performance_metrics")
    
    def __repr__(self):
        return f"<PerformanceMetric(name={self.metric_name}, value={self.metric_value}, unit={self.metric_unit})>"


class LangGraphAlert(Base):
    """
    Alert records for performance issues, failures, and anomalies.
    Phase 2 alerting system for proactive monitoring.
    """
    __tablename__ = "langgraph_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(String, ForeignKey("langgraph_executions.execution_id"), nullable=True)
    
    # Alert identification
    alert_type = Column(String, index=True)  # performance, error, anomaly, threshold
    severity = Column(String, index=True)  # low, medium, high, critical
    
    # Alert content
    title = Column(String)
    message = Column(Text)
    
    # Context
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    status = Column(String, default="active")  # active, resolved, suppressed
    
    # Alert data
    threshold_value = Column(Float, nullable=True)
    actual_value = Column(Float, nullable=True)
    metric_name = Column(String, nullable=True)
    
    # Additional context
    affected_nodes = Column(JSON, nullable=True)  # List of affected node IDs
    alert_context = Column(JSON, nullable=True)  # Additional context data
    
    def __repr__(self):
        return f"<LangGraphAlert(type={self.alert_type}, severity={self.severity}, status={self.status})>"