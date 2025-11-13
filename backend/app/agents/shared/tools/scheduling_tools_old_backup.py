"""Scheduling tools for appointment booking with counselors/psychologists.

This module provides conversational appointment scheduling capabilities for Aika,
allowing students to book appointments with counselors through natural language.

Tools:
- get_available_counselors: Find psychologists with availability
- get_counselor_availability: Get specific time slots for a counselor
- suggest_appointment_times: LLM-powered optimal time slot suggestions
- book_appointment: Create appointment reservation
- cancel_appointment: Cancel existing appointment
- reschedule_appointment: Modify appointment time

Integration: Used by Aika Meta-Agent and SDA (Service Desk Agent) for scheduling.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.mental_health.models.appointments import (
    Psychologist,
    Appointment,
    AppointmentType
)
from app.models.user import User

logger = logging.getLogger(__name__)


# ============================================================================
# TOOL SCHEMAS (For Gemini Function Calling)
# ============================================================================

GET_AVAILABLE_COUNSELORS_SCHEMA = {
    "name": "get_available_counselors",
    "description": """Find psychologists/counselors with availability for appointments.
    
    Use this when the student asks to book an appointment or wants to see available counselors.
    Returns list of available counselors with their profiles and general availability.
    
    Example queries:
    - "I want to talk to a counselor"
    - "Can I book an appointment?"
    - "Who are the available psychologists?"
    """,
    "parameters": {
        "type": "object",
        "properties": {
            "specialization": {
                "type": "string",
                "description": "Optional filter by specialization (e.g., 'anxiety', 'depression', 'academic stress')"
            },
            "preferred_language": {
                "type": "string",
                "description": "Optional filter by language spoken (e.g., 'English', 'Indonesian')"
            }
        }
    }
}

GET_COUNSELOR_AVAILABILITY_SCHEMA = {
    "name": "get_counselor_availability",
    "description": """Get specific available time slots for a counselor.
    
    Use this after student selects a counselor and needs to choose a time.
    Returns available time slots for the next 14 days based on counselor's schedule.
    
    Example queries:
    - "What times is Dr. Sarah available?"
    - "When can I meet with counselor ID 5?"
    - "Show me available slots for next week"
    """,
    "parameters": {
        "type": "object",
        "properties": {
            "psychologist_id": {
                "type": "integer",
                "description": "ID of the psychologist/counselor to check availability for"
            },
            "start_date": {
                "type": "string",
                "description": "Start date for availability check (ISO format: YYYY-MM-DD). Defaults to today."
            },
            "end_date": {
                "type": "string",
                "description": "End date for availability check (ISO format: YYYY-MM-DD). Defaults to 14 days from start."
            },
            "preferred_time": {
                "type": "string",
                "description": "Optional time preference: 'morning' (08:00-12:00), 'afternoon' (12:00-17:00), 'evening' (17:00-20:00)"
            }
        },
        "required": ["psychologist_id"]
    }
}

SUGGEST_APPOINTMENT_TIMES_SCHEMA = {
    "name": "suggest_appointment_times",
    "description": """Use LLM to suggest optimal appointment times based on student preferences.
    
    This tool uses Gemini 2.5 Flash to intelligently parse natural language time preferences
    and match them with counselor availability to suggest the best options.
    
    Use this when student gives flexible preferences like:
    - "I prefer mornings"
    - "Sometime next week after Tuesday"
    - "Whenever Dr. Sarah is free, but not on weekends"
    """,
    "parameters": {
        "type": "object",
        "properties": {
            "psychologist_id": {
                "type": "integer",
                "description": "ID of the psychologist/counselor"
            },
            "preferences_text": {
                "type": "string",
                "description": "Natural language description of time preferences from student"
            },
            "user_id": {
                "type": "integer",
                "description": "ID of the student requesting appointment"
            }
        },
        "required": ["psychologist_id", "preferences_text", "user_id"]
    }
}

BOOK_APPOINTMENT_SCHEMA = {
    "name": "book_appointment",
    "description": """Book an appointment for the student with a counselor.
    
    Use this after student confirms a specific time slot.
    Creates the appointment record and returns confirmation details.
    
    IMPORTANT: Always check availability first before booking!
    """,
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "integer",
                "description": "ID of the student booking the appointment"
            },
            "psychologist_id": {
                "type": "integer",
                "description": "ID of the psychologist/counselor"
            },
            "appointment_datetime": {
                "type": "string",
                "description": "Appointment date and time (ISO format: YYYY-MM-DDTHH:MM:SS)"
            },
            "appointment_type_id": {
                "type": "integer",
                "description": "Type of appointment (1=Initial Consultation, 2=Follow-up, 3=Crisis). Defaults to 1."
            },
            "notes": {
                "type": "string",
                "description": "Optional notes about the appointment reason or concerns"
            }
        },
        "required": ["user_id", "psychologist_id", "appointment_datetime"]
    }
}

CANCEL_APPOINTMENT_SCHEMA = {
    "name": "cancel_appointment",
    "description": """Cancel an existing appointment.
    
    Use this when student wants to cancel their appointment.
    """,
    "parameters": {
        "type": "object",
        "properties": {
            "appointment_id": {
                "type": "integer",
                "description": "ID of the appointment to cancel"
            },
            "user_id": {
                "type": "integer",
                "description": "ID of the student (for verification)"
            },
            "reason": {
                "type": "string",
                "description": "Optional reason for cancellation"
            }
        },
        "required": ["appointment_id", "user_id"]
    }
}

RESCHEDULE_APPOINTMENT_SCHEMA = {
    "name": "reschedule_appointment",
    "description": """Reschedule an existing appointment to a new time.
    
    Use this when student wants to change their appointment time.
    """,
    "parameters": {
        "type": "object",
        "properties": {
            "appointment_id": {
                "type": "integer",
                "description": "ID of the appointment to reschedule"
            },
            "user_id": {
                "type": "integer",
                "description": "ID of the student (for verification)"
            },
            "new_datetime": {
                "type": "string",
                "description": "New appointment date and time (ISO format: YYYY-MM-DDTHH:MM:SS)"
            }
        },
        "required": ["appointment_id", "user_id", "new_datetime"]
    }
}


# ============================================================================
# TOOL IMPLEMENTATIONS
# ============================================================================

async def get_available_counselors(
    db: AsyncSession,
    specialization: Optional[str] = None,
    preferred_language: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get list of available counselors/psychologists.
    
    Args:
        db: Database session
        specialization: Optional filter by specialization
        preferred_language: Optional filter by language
        
    Returns:
        Dict with success status and list of counselors
    """
    try:
        # Build query
        query = select(Psychologist).where(Psychologist.is_available == True)
        
        # Apply filters
        if specialization:
            query = query.where(
                Psychologist.specialization.ilike(f"%{specialization}%")
            )
        
        if preferred_language:
            query = query.where(
                Psychologist.languages.cast(str).ilike(f"%{preferred_language}%")
            )
        
        result = await db.execute(query)
        psychologists = result.scalars().all()
        
        # Format response
        counselors = []
        for p in psychologists:
            counselors.append({
                "id": p.id,
                "name": p.name,
                "specialization": p.specialization,
                "bio": p.bio[:200] if p.bio else None,  # Truncate for readability
                "years_of_experience": p.years_of_experience,
                "languages": p.languages,
                "rating": p.rating,
                "total_reviews": p.total_reviews,
                "consultation_fee": p.consultation_fee,
                "has_availability": bool(p.availability_schedule)
            })
        
        return {
            "success": True,
            "counselors": counselors,
            "count": len(counselors),
            "message": f"Found {len(counselors)} available counselor(s)"
        }
        
    except Exception as e:
        logger.error(f"Error getting available counselors: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "counselors": [],
            "message": "Failed to fetch counselors"
        }


async def get_counselor_availability(
    db: AsyncSession,
    psychologist_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    preferred_time: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get available time slots for a specific counselor.
    
    Args:
        db: Database session
        psychologist_id: ID of psychologist
        start_date: Start date (ISO format)
        end_date: End date (ISO format)
        preferred_time: Time preference ('morning', 'afternoon', 'evening')
        
    Returns:
        Dict with success status and available slots
    """
    try:
        # Get psychologist
        result = await db.execute(
            select(Psychologist).where(Psychologist.id == psychologist_id)
        )
        psychologist = result.scalar_one_or_none()
        
        if not psychologist:
            return {
                "success": False,
                "error": f"Psychologist with ID {psychologist_id} not found",
                "available_slots": []
            }
        
        if not psychologist.is_available:
            return {
                "success": False,
                "error": f"{psychologist.name} is currently not accepting appointments",
                "available_slots": []
            }
        
        # Parse dates
        start = datetime.fromisoformat(start_date) if start_date else datetime.now()
        end = datetime.fromisoformat(end_date) if end_date else start + timedelta(days=14)
        
        # Get availability schedule
        schedule = psychologist.availability_schedule or {}
        
        # Generate available slots
        available_slots = _generate_time_slots(
            schedule=schedule,
            start_date=start,
            end_date=end,
            preferred_time=preferred_time
        )
        
        # Check for conflicts with existing appointments
        conflicts_result = await db.execute(
            select(Appointment.appointment_datetime).where(
                and_(
                    Appointment.psychologist_id == psychologist_id,
                    Appointment.appointment_datetime >= start,
                    Appointment.appointment_datetime <= end,
                    Appointment.status.in_(["scheduled", "confirmed"])
                )
            )
        )
        booked_times = {apt.strftime("%Y-%m-%dT%H:%M:%S") for apt in conflicts_result.scalars().all()}
        
        # Filter out booked slots
        available_slots = [
            slot for slot in available_slots
            if slot["datetime"] not in booked_times
        ]
        
        return {
            "success": True,
            "psychologist_name": psychologist.name,
            "psychologist_id": psychologist_id,
            "available_slots": available_slots[:20],  # Limit to 20 slots
            "total_slots": len(available_slots),
            "date_range": {
                "start": start.strftime("%Y-%m-%d"),
                "end": end.strftime("%Y-%m-%d")
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting counselor availability: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "available_slots": [],
            "message": "Failed to fetch availability"
        }


async def suggest_appointment_times(
    db: AsyncSession,
    psychologist_id: int,
    preferences_text: str,
    user_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Use LLM to suggest optimal appointment times based on preferences.
    
    Args:
        db: Database session
        psychologist_id: ID of psychologist
        preferences_text: Natural language preferences
        user_id: Student user ID
        
    Returns:
        Dict with LLM-suggested time slots
    """
    try:
        # First, get all available slots
        availability = await get_counselor_availability(
            db=db,
            psychologist_id=psychologist_id
        )
        
        if not availability["success"]:
            return availability
        
        # Use Gemini 2.5 Flash to intelligently match preferences
        from app.core.llm import get_gemini_client, GEMINI_FLASH_MODEL
        
        client = get_gemini_client()
        
        prompt = f"""You are an appointment scheduling assistant. A student wants to book an appointment and has these preferences:

"{preferences_text}"

Here are the available time slots:
{_format_slots_for_llm(availability["available_slots"])}

Task: Select the TOP 3 most suitable time slots that match the student's preferences.

Consider:
1. Explicit time preferences (morning/afternoon/evening)
2. Day preferences (weekday/weekend/specific days)
3. "ASAP" or urgency keywords → suggest earliest slots
4. "Flexible" → suggest well-distributed options

Return your answer as a JSON array with exactly 3 slots, each containing:
- datetime (ISO format from the available slots)
- reason (short explanation why this matches their preferences)

Example output format:
[
  {{"datetime": "2025-11-15T09:00:00", "reason": "Morning slot as requested, earliest available"}},
  {{"datetime": "2025-11-16T10:00:00", "reason": "Alternative morning option next day"}},
  {{"datetime": "2025-11-18T09:30:00", "reason": "Monday morning for fresh start of week"}}
]
"""
        
        response = client.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,  # Lower temp for more consistent scheduling
                "response_mime_type": "application/json"
            }
        )
        
        import json
        suggestions = json.loads(response.text)
        
        return {
            "success": True,
            "psychologist_id": psychologist_id,
            "psychologist_name": availability.get("psychologist_name"),
            "suggested_slots": suggestions,
            "preferences_analyzed": preferences_text,
            "message": f"Found {len(suggestions)} time slots matching your preferences"
        }
        
    except Exception as e:
        logger.error(f"Error suggesting appointment times: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "suggested_slots": [],
            "message": "Failed to suggest times. Please try selecting from available slots directly."
        }


async def book_appointment(
    db: AsyncSession,
    user_id: int,
    psychologist_id: int,
    appointment_datetime: str,
    appointment_type_id: int = 1,
    notes: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Book an appointment for the student.
    
    Args:
        db: Database session
        user_id: Student user ID
        psychologist_id: Psychologist ID
        appointment_datetime: Appointment time (ISO format)
        appointment_type_id: Type of appointment (defaults to 1)
        notes: Optional notes
        
    Returns:
        Dict with booking confirmation
    """
    try:
        # Parse datetime
        apt_time = datetime.fromisoformat(appointment_datetime)
        
        # Verify psychologist exists
        psych_result = await db.execute(
            select(Psychologist).where(Psychologist.id == psychologist_id)
        )
        psychologist = psych_result.scalar_one_or_none()
        
        if not psychologist:
            return {
                "success": False,
                "error": f"Psychologist with ID {psychologist_id} not found"
            }
        
        # Check for conflicts
        conflict_result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.psychologist_id == psychologist_id,
                    Appointment.appointment_datetime == apt_time,
                    Appointment.status.in_(["scheduled", "confirmed"])
                )
            )
        )
        conflict = conflict_result.scalar_one_or_none()
        
        if conflict:
            return {
                "success": False,
                "error": "This time slot is no longer available. Please choose another time.",
                "conflict": True
            }
        
        # Create appointment
        new_appointment = Appointment(
            user_id=user_id,
            psychologist_id=psychologist_id,
            appointment_type_id=appointment_type_id,
            appointment_datetime=apt_time,
            notes=notes,
            status="scheduled"
        )
        
        db.add(new_appointment)
        await db.commit()
        await db.refresh(new_appointment)
        
        # Get appointment type details
        type_result = await db.execute(
            select(AppointmentType).where(AppointmentType.id == appointment_type_id)
        )
        apt_type = type_result.scalar_one_or_none()
        
        return {
            "success": True,
            "appointment_id": new_appointment.id,
            "psychologist_name": psychologist.name,
            "appointment_datetime": apt_time.strftime("%Y-%m-%d %H:%M"),
            "appointment_type": apt_type.name if apt_type else "Consultation",
            "duration_minutes": apt_type.duration_minutes if apt_type else 60,
            "status": "scheduled",
            "message": f"✅ Appointment booked successfully with {psychologist.name} on {apt_time.strftime('%A, %B %d at %I:%M %p')}"
        }
        
    except Exception as e:
        logger.error(f"Error booking appointment: {e}", exc_info=True)
        await db.rollback()
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to book appointment. Please try again."
        }


async def cancel_appointment(
    db: AsyncSession,
    appointment_id: int,
    user_id: int,
    reason: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Cancel an existing appointment.
    
    Args:
        db: Database session
        appointment_id: ID of appointment to cancel
        user_id: Student user ID (for verification)
        reason: Optional cancellation reason
        
    Returns:
        Dict with cancellation confirmation
    """
    try:
        # Get appointment
        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.id == appointment_id,
                    Appointment.user_id == user_id
                )
            )
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            return {
                "success": False,
                "error": "Appointment not found or you don't have permission to cancel it"
            }
        
        if appointment.status == "cancelled":
            return {
                "success": False,
                "error": "This appointment is already cancelled"
            }
        
        # Update status
        appointment.status = "cancelled"
        if reason:
            appointment.notes = f"{appointment.notes or ''}\n[Cancelled: {reason}]".strip()
        
        await db.commit()
        
        return {
            "success": True,
            "appointment_id": appointment_id,
            "message": "Appointment cancelled successfully"
        }
        
    except Exception as e:
        logger.error(f"Error cancelling appointment: {e}", exc_info=True)
        await db.rollback()
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to cancel appointment"
        }


async def reschedule_appointment(
    db: AsyncSession,
    appointment_id: int,
    user_id: int,
    new_datetime: str,
    **kwargs
) -> Dict[str, Any]:
    """Reschedule an existing appointment.
    
    Args:
        db: Database session
        appointment_id: ID of appointment to reschedule
        user_id: Student user ID (for verification)
        new_datetime: New appointment time (ISO format)
        
    Returns:
        Dict with rescheduling confirmation
    """
    try:
        # Get appointment
        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.id == appointment_id,
                    Appointment.user_id == user_id
                )
            )
        )
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            return {
                "success": False,
                "error": "Appointment not found or you don't have permission to reschedule it"
            }
        
        # Parse new datetime
        new_time = datetime.fromisoformat(new_datetime)
        
        # Check for conflicts
        conflict_result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.psychologist_id == appointment.psychologist_id,
                    Appointment.appointment_datetime == new_time,
                    Appointment.status.in_(["scheduled", "confirmed"]),
                    Appointment.id != appointment_id  # Exclude current appointment
                )
            )
        )
        conflict = conflict_result.scalar_one_or_none()
        
        if conflict:
            return {
                "success": False,
                "error": "The new time slot is not available. Please choose another time.",
                "conflict": True
            }
        
        # Update appointment
        old_time = appointment.appointment_datetime
        appointment.appointment_datetime = new_time
        appointment.notes = f"{appointment.notes or ''}\n[Rescheduled from {old_time.strftime('%Y-%m-%d %H:%M')}]".strip()
        
        await db.commit()
        
        return {
            "success": True,
            "appointment_id": appointment_id,
            "old_datetime": old_time.strftime("%Y-%m-%d %H:%M"),
            "new_datetime": new_time.strftime("%Y-%m-%d %H:%M"),
            "message": f"Appointment rescheduled successfully to {new_time.strftime('%A, %B %d at %I:%M %p')}"
        }
        
    except Exception as e:
        logger.error(f"Error rescheduling appointment: {e}", exc_info=True)
        await db.rollback()
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to reschedule appointment"
        }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _generate_time_slots(
    schedule: Dict[str, Any],
    start_date: datetime,
    end_date: datetime,
    preferred_time: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Generate available time slots from counselor schedule.
    
    Args:
        schedule: Counselor availability schedule (JSON format)
        start_date: Start date
        end_date: End date
        preferred_time: Optional time preference filter
        
    Returns:
        List of available time slots
    """
    slots = []
    
    # Define time ranges
    time_ranges = {
        "morning": (8, 12),
        "afternoon": (12, 17),
        "evening": (17, 20)
    }
    
    # Iterate through days
    current_date = start_date.date()
    while current_date <= end_date.date():
        day_name = current_date.strftime("%A").lower()
        
        # Check if counselor works this day
        day_schedule = schedule.get(day_name, {})
        if not day_schedule or not day_schedule.get("available", False):
            current_date += timedelta(days=1)
            continue
        
        # Get working hours for this day
        work_start = day_schedule.get("start", "09:00")
        work_end = day_schedule.get("end", "17:00")
        
        # Parse hours
        start_hour = int(work_start.split(":")[0])
        end_hour = int(work_end.split(":")[0])
        
        # Apply time preference filter
        if preferred_time and preferred_time in time_ranges:
            pref_start, pref_end = time_ranges[preferred_time]
            start_hour = max(start_hour, pref_start)
            end_hour = min(end_hour, pref_end)
        
        # Generate hourly slots
        for hour in range(start_hour, end_hour):
            slot_time = datetime.combine(current_date, datetime.min.time()).replace(hour=hour)
            
            # Only include future slots
            if slot_time > datetime.now():
                slots.append({
                    "datetime": slot_time.strftime("%Y-%m-%dT%H:%M:%S"),
                    "display": slot_time.strftime("%A, %B %d at %I:%M %p"),
                    "day": day_name,
                    "time_of_day": _get_time_of_day(hour)
                })
        
        current_date += timedelta(days=1)
    
    return slots


def _get_time_of_day(hour: int) -> str:
    """Get time of day label for an hour."""
    if 8 <= hour < 12:
        return "morning"
    elif 12 <= hour < 17:
        return "afternoon"
    elif 17 <= hour < 20:
        return "evening"
    else:
        return "other"


def _format_slots_for_llm(slots: List[Dict[str, Any]]) -> str:
    """Format slots for LLM prompt."""
    formatted = []
    for i, slot in enumerate(slots[:30], 1):  # Limit to 30 for token efficiency
        formatted.append(f"{i}. {slot['display']} ({slot['datetime']})")
    return "\n".join(formatted)


# ============================================================================
# REGISTRY (Auto-registered when module imported)
# ============================================================================

def register_scheduling_tools():
    """Register all scheduling tools with the global registry."""
    from app.agents.shared.tools import tool_registry
    
    tools = [
        ("get_available_counselors", get_available_counselors, GET_AVAILABLE_COUNSELORS_SCHEMA),
        ("get_counselor_availability", get_counselor_availability, GET_COUNSELOR_AVAILABILITY_SCHEMA),
        ("suggest_appointment_times", suggest_appointment_times, SUGGEST_APPOINTMENT_TIMES_SCHEMA),
        ("book_appointment", book_appointment, BOOK_APPOINTMENT_SCHEMA),
        ("cancel_appointment", cancel_appointment, CANCEL_APPOINTMENT_SCHEMA),
        ("reschedule_appointment", reschedule_appointment, RESCHEDULE_APPOINTMENT_SCHEMA),
    ]
    
    for name, func, schema in tools:
        tool_registry.register(
            name=name,
            func=func,
            schema=schema,
            category="scheduling"
        )
    
    logger.info(f"✅ Registered {len(tools)} scheduling tools")


# Auto-register on import
register_scheduling_tools()
