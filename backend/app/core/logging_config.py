"""
Structured logging configuration for production monitoring.

This module provides JSON-formatted logging for easy parsing by ELK stack.
"""
import logging
import json
import sys
from datetime import datetime
from typing import Any, Dict, Optional
import traceback


class JSONFormatter(logging.Formatter):
    """
    Format logs as JSON for easy parsing by log aggregators (ELK, Loki, etc).
    
    Outputs structured JSON with timestamp, level, message, and context fields.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON string."""
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "thread": record.thread,
            "thread_name": record.threadName,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info)
            }
        
        # Add stack trace for errors (without full exception)
        if record.levelno >= logging.ERROR and not record.exc_info:
            log_data["stack_info"] = self.formatStack(record.stack_info) if record.stack_info else None
        
        # Add custom context fields
        # User context
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "user_role"):
            log_data["user_role"] = record.user_role
        if hasattr(record, "session_id"):
            log_data["session_id"] = record.session_id
        
        # Agent context
        if hasattr(record, "agent"):
            log_data["agent"] = record.agent
        if hasattr(record, "intent"):
            log_data["intent"] = record.intent
        if hasattr(record, "risk_level"):
            log_data["risk_level"] = record.risk_level
        
        # Performance metrics
        if hasattr(record, "processing_time_ms"):
            log_data["processing_time_ms"] = record.processing_time_ms
        if hasattr(record, "response_time_ms"):
            log_data["response_time_ms"] = record.response_time_ms
        
        # Tool execution context
        if hasattr(record, "tool_name"):
            log_data["tool_name"] = record.tool_name
        if hasattr(record, "tool_success"):
            log_data["tool_success"] = record.tool_success
        
        # HTTP request context
        if hasattr(record, "method"):
            log_data["method"] = record.method
        if hasattr(record, "endpoint"):
            log_data["endpoint"] = record.endpoint
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        
        # Business context
        if hasattr(record, "intervention_plan_id"):
            log_data["intervention_plan_id"] = record.intervention_plan_id
        if hasattr(record, "counselor_id"):
            log_data["counselor_id"] = record.counselor_id
        
        return json.dumps(log_data, default=str)


def configure_logging(
    log_level: str = "INFO",
    json_format: bool = True,
    log_to_file: bool = False,
    log_file_path: str = "logs/app.log"
) -> None:
    """
    Configure structured logging for production.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Use JSON formatter (True for production, False for development)
        log_to_file: Also log to file
        log_file_path: Path to log file if log_to_file is True
    """
    # Create formatter
    if json_format:
        formatter = JSONFormatter()
    else:
        # Human-readable format for development
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    # Console handler (stdout for Docker)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    
    handlers = [console_handler]
    
    # File handler (optional)
    if log_to_file:
        import os
        os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
        file_handler = logging.FileHandler(log_file_path)
        file_handler.setFormatter(formatter)
        handlers.append(file_handler)
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Add new handlers
    for handler in handlers:
        root_logger.addHandler(handler)
    
    # Silence noisy libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    # Log configuration
    root_logger.info(
        f"Logging configured: level={log_level}, json_format={json_format}, log_to_file={log_to_file}"
    )


class ContextLogger:
    """
    Logger wrapper that adds context to log messages.
    
    Usage:
        logger = ContextLogger(__name__, user_id="123", session_id="abc")
        logger.info("User action", action="create_plan")
        logger.error("Operation failed", error_code="E001")
    """
    
    def __init__(self, name: str, **context):
        """
        Initialize context logger.
        
        Args:
            name: Logger name (usually __name__)
            **context: Context fields to add to all log messages
        """
        self.logger = logging.getLogger(name)
        self.context = context
    
    def _add_context(self, record: logging.LogRecord) -> None:
        """Add context fields to log record."""
        for key, value in self.context.items():
            setattr(record, key, value)
    
    def _log(self, level: int, msg: str, **extra):
        """Internal log method."""
        record = self.logger.makeRecord(
            self.logger.name,
            level,
            "(unknown file)",
            0,
            msg,
            (),
            None
        )
        self._add_context(record)
        for key, value in extra.items():
            setattr(record, key, value)
        self.logger.handle(record)
    
    def debug(self, msg: str, **extra):
        """Log debug message."""
        self._log(logging.DEBUG, msg, **extra)
    
    def info(self, msg: str, **extra):
        """Log info message."""
        self._log(logging.INFO, msg, **extra)
    
    def warning(self, msg: str, **extra):
        """Log warning message."""
        self._log(logging.WARNING, msg, **extra)
    
    def error(self, msg: str, **extra):
        """Log error message."""
        self._log(logging.ERROR, msg, **extra)
    
    def critical(self, msg: str, **extra):
        """Log critical message."""
        self._log(logging.CRITICAL, msg, **extra)
    
    def with_context(self, **additional_context) -> "ContextLogger":
        """
        Create a new ContextLogger with additional context.
        
        Usage:
            base_logger = ContextLogger(__name__, user_id="123")
            session_logger = base_logger.with_context(session_id="abc")
        """
        merged_context = {**self.context, **additional_context}
        return ContextLogger(self.logger.name, **merged_context)


def get_logger(name: str, **context) -> ContextLogger:
    """
    Get a context-aware logger.
    
    Args:
        name: Logger name (usually __name__)
        **context: Context fields to add to all log messages
    
    Returns:
        ContextLogger instance
    
    Usage:
        logger = get_logger(__name__, agent="STA")
        logger.info("Processing message", processing_time_ms=150)
    """
    return ContextLogger(name, **context)
