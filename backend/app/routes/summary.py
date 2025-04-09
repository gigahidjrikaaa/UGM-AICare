# backend/app/routes/summary.py (New File)
from fastapi import APIRouter, Depends, HTTPException, Query # type: ignore
from sqlalchemy.orm import Session
from sqlalchemy import func, Date, cast # Import func for distinct counts/dates
from pydantic import BaseModel, Field
from datetime import date, timedelta
from typing import Dict, List, Set

from app.database import get_db
from app.models import User, JournalEntry, Conversation # Import needed models
from app.dependencies import get_current_active_user # Your auth dependency

router = APIRouter(
    prefix="/api/v1/activity-summary",
    tags=["Activity Summary"],
    dependencies=[Depends(get_current_active_user)] # Protect this route
)

# Response Model
class ActivityData(BaseModel):
    hasJournal: bool = False
    hasConversation: bool = False

class ActivitySummaryResponse(BaseModel):
    # Dictionary where key is "YYYY-MM-DD" string
    summary: Dict[str, ActivityData]

@router.get("/", response_model=ActivitySummaryResponse)
async def get_activity_summary(
    # Get month as query parameter, e.g., ?month=2025-04
    month: str = Query(..., regex=r"^\d{4}-\d{2}$"), # Validate format
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Provides a summary of user activity (journal entries, conversations)
    for a given month.
    """
    try:
        year, month_num = map(int, month.split('-'))
        start_date = date(year, month_num, 1)
        # Find the first day of the next month, then subtract one day
        next_month = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1)
        end_date = next_month - timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM.")

    # Get distinct dates with journal entries
    journal_dates_query = db.query(func.distinct(JournalEntry.entry_date))\
        .filter(
            JournalEntry.user_id == current_user.id,
            JournalEntry.entry_date >= start_date,
            JournalEntry.entry_date <= end_date
        )
    journal_dates: Set[date] = {result[0] for result in journal_dates_query.all()}

    # Get distinct dates with conversations
    # Assuming Conversation.timestamp is DateTime, cast to Date for distinct grouping
    conversation_dates_query = db.query(func.distinct(cast(Conversation.timestamp, Date)))\
        .filter(
            Conversation.user_id == current_user.id,
            Conversation.timestamp >= start_date, # Compare directly if timestamp is datetime
            Conversation.timestamp < next_month # Use less than next month start for datetime
        )
    conversation_dates: Set[date] = {result[0] for result in conversation_dates_query.all()}

    # Combine results
    summary_data: Dict[str, ActivityData] = {}
    all_dates = journal_dates.union(conversation_dates)

    for activity_date in all_dates:
        date_str = activity_date.isoformat() # "YYYY-MM-DD"
        summary_data[date_str] = ActivityData(
            hasJournal=(activity_date in journal_dates),
            hasConversation=(activity_date in conversation_dates)
        )

    return ActivitySummaryResponse(summary=summary_data)