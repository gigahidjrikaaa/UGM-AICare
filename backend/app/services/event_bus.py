"""Event bus for inter-agent communication.

Simple in-memory pub/sub system for coordinating between agents.
Future: Can be replaced with Redis Pub/Sub for distributed systems.
"""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Types of events that can be emitted by agents."""
    
    # Case events
    CASE_CREATED = "case_created"
    CASE_ASSIGNED = "case_assigned"
    CASE_STATUS_CHANGED = "case_status_changed"
    CASE_CLOSED = "case_closed"
    SLA_BREACH = "sla_breach"
    
    # Triage events
    HIGH_RISK_DETECTED = "high_risk_detected"
    CRITICAL_RISK_DETECTED = "critical_risk_detected"
    
    # Insights events
    IA_REPORT_GENERATED = "ia_report_generated"
    CAMPAIGN_TRIGGER_MATCHED = "campaign_trigger_matched"
    
    # Campaign events
    CAMPAIGN_EXECUTED = "campaign_executed"
    CAMPAIGN_MESSAGE_SENT = "campaign_message_sent"

    # Agent health events
    AGENT_ERROR = "agent_error"
    AGENT_DEGRADED = "agent_degraded"

    # Quest events
    QUEST_ISSUED = "quest_issued"
    QUEST_COMPLETED = "quest_completed"
    QUEST_ANALYTICS = "quest_analytics"


@dataclass
class Event:
    """Event payload for pub/sub."""
    
    event_type: EventType
    timestamp: datetime
    source_agent: str  # 'sta', 'sda', 'sca', 'ia', 'system'
    data: dict[str, Any]
    correlation_id: str | None = None  # For tracing related events


class EventBus:
    """In-memory event bus for agent coordination.
    
    Provides publish/subscribe pattern for loosely coupled agent communication.
    Thread-safe for async operations.
    """
    
    def __init__(self) -> None:
        self._subscribers: dict[EventType, list[Callable[[Event], Coroutine[Any, Any, None]]]] = defaultdict(list)
        self._lock = asyncio.Lock()
        logger.info("EventBus initialized (in-memory mode)")
    
    async def subscribe(
        self,
        event_type: EventType,
        handler: Callable[[Event], Coroutine[Any, Any, None]]
    ) -> None:
        """Subscribe to an event type with an async handler.
        
        Args:
            event_type: The type of event to listen for
            handler: Async function to call when event is published
        """
        async with self._lock:
            self._subscribers[event_type].append(handler)
            logger.info(f"Subscribed handler to {event_type.value}")
    
    async def publish(self, event: Event) -> None:
        """Publish an event to all subscribers.
        
        Args:
            event: The event to publish
        """
        handlers = self._subscribers.get(event.event_type, [])
        
        if not handlers:
            logger.debug(f"No subscribers for event {event.event_type.value}")
            return
        
        logger.info(
            f"Publishing event {event.event_type.value} from {event.source_agent} "
            f"to {len(handlers)} subscriber(s)"
        )
        
        # Call all handlers concurrently
        tasks = [handler(event) for handler in handlers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Log any handler errors
        for idx, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(
                    f"Handler {idx} for {event.event_type.value} failed: {result}",
                    exc_info=result
                )
    
    def unsubscribe(
        self,
        event_type: EventType,
        handler: Callable[[Event], Coroutine[Any, Any, None]]
    ) -> None:
        """Unsubscribe a handler from an event type.
        
        Args:
            event_type: The event type
            handler: The handler to remove
        """
        if handler in self._subscribers[event_type]:
            self._subscribers[event_type].remove(handler)
            logger.info(f"Unsubscribed handler from {event_type.value}")
    
    def clear_all(self) -> None:
        """Clear all subscriptions (useful for testing)."""
        self._subscribers.clear()
        logger.info("Cleared all event subscriptions")


# Global event bus instance
_event_bus: EventBus | None = None


def get_event_bus() -> EventBus:
    """Get the global event bus instance (singleton)."""
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
    return _event_bus


async def publish_event(
    event_type: EventType,
    source_agent: str,
    data: dict[str, Any],
    correlation_id: str | None = None
) -> None:
    """Convenience function to publish an event.
    
    Args:
        event_type: Type of event
        source_agent: Agent emitting the event
        data: Event payload
        correlation_id: Optional correlation ID for tracing
    """
    event = Event(
        event_type=event_type,
        timestamp=datetime.utcnow(),
        source_agent=source_agent,
        data=data,
        correlation_id=correlation_id
    )
    
    bus = get_event_bus()
    await bus.publish(event)
