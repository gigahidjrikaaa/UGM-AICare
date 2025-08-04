# backend/app/routes/admin.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, or_
from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Optional, Dict, Any
import logging

from app.database import get_db
from app.models import User, JournalEntry, Conversation, UserBadge, Appointment
from app.dependencies import get_current_active_user
from app.utils.security_utils import decrypt_data

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
    dependencies=[]  # We'll add admin auth dependency later
)

# --- Response Models ---
class UserListItem(BaseModel):
    id: int
    email: Optional[str] = None
    google_sub: str
    wallet_address: Optional[str] = None
    sentiment_score: float
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date] = None
    allow_email_checkins: bool
    created_at: Optional[datetime] = None
    
    # Computed fields
    total_journal_entries: int
    total_conversations: int
    total_badges: int
    total_appointments: int
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserStats(BaseModel):
    total_users: int
    active_users_30d: int
    active_users_7d: int
    new_users_today: int
    avg_sentiment_score: float
    total_journal_entries: int
    total_conversations: int
    total_badges_awarded: int

class UsersResponse(BaseModel):
    users: List[UserListItem]
    total_count: int
    stats: UserStats

class UserDetailResponse(BaseModel):
    id: int
    email: Optional[str] = None
    google_sub: str
    wallet_address: Optional[str] = None
    sentiment_score: float
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date] = None
    allow_email_checkins: bool
    created_at: Optional[datetime] = None
    
    # Detailed stats
    journal_entries: List[Dict[str, Any]]
    recent_conversations: List[Dict[str, Any]]
    badges: List[Dict[str, Any]]
    appointments: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

# --- Admin Authentication Helper ---
async def get_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Dependency to ensure current user is an admin"""
    # TODO: Add proper admin role check
    # For now, assume all authenticated users can access admin endpoints
    # In production, add: if current_user.role != "admin": raise HTTPException(...)
    
    return current_user

# --- Helper Functions ---
def decrypt_user_email(encrypted_email: Optional[str]) -> Optional[str]:
    """Safely decrypt user email if it exists"""
    if not encrypted_email:
        return None
    try:
        return decrypt_data(encrypted_email)
    except Exception as e:
        logger.warning(f"Failed to decrypt email: {e}")
        return "[Encrypted]"

def get_user_stats(db: Session) -> UserStats:
    """Calculate overall user statistics"""
    from datetime import timedelta
    
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # Basic counts
    total_users = db.query(func.count(User.id)).scalar() or 0
    
    # Active users (users with activity in last 30/7 days)
    active_30d = db.query(func.count(User.id)).filter(
        User.last_activity_date >= month_ago
    ).scalar() or 0
    
    active_7d = db.query(func.count(User.id)).filter(
        User.last_activity_date >= week_ago
    ).scalar() or 0
    
    # New users today
    new_today = db.query(func.count(User.id)).filter(
        func.date(User.last_activity_date) == today
    ).scalar() or 0
    
    # Average sentiment score
    avg_sentiment = db.query(func.avg(User.sentiment_score)).scalar() or 0.0
    
    # Content counts
    total_journals = db.query(func.count(JournalEntry.id)).scalar() or 0
    total_conversations = db.query(func.count(Conversation.id)).scalar() or 0
    total_badges = db.query(func.count(UserBadge.id)).scalar() or 0
    
    return UserStats(
        total_users=total_users,
        active_users_30d=active_30d,
        active_users_7d=active_7d,
        new_users_today=new_today,
        avg_sentiment_score=float(avg_sentiment),
        total_journal_entries=total_journals,
        total_conversations=total_conversations,
        total_badges_awarded=total_badges
    )

# --- Admin Endpoints ---

@router.get("/users", response_model=UsersResponse)
async def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by email or google_sub"),
    sort_by: str = Query("id", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    active_only: bool = Query(False, description="Show only active users"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get paginated list of users with statistics"""
    logger.info(f"Admin {admin_user.id} requesting users list (page {page}, limit {limit})")
    
    try:
        # Build base query with joins for aggregated data
        base_query = db.query(
            User,
            func.count(JournalEntry.id).label('journal_count'),
            func.count(Conversation.id).label('conversation_count'),
            func.count(UserBadge.id).label('badge_count'),
            func.count(Appointment.id).label('appointment_count')
        ).outerjoin(JournalEntry, User.id == JournalEntry.user_id)\
         .outerjoin(Conversation, User.id == Conversation.user_id)\
         .outerjoin(UserBadge, User.id == UserBadge.user_id)\
         .outerjoin(Appointment, User.id == Appointment.user_id)\
         .group_by(User.id)
        
        # Apply search filter
        if search:
            search_conditions = []
            search_conditions.append(User.email.ilike(f"%{search}%"))
            search_conditions.append(User.google_sub.ilike(f"%{search}%"))
            base_query = base_query.filter(or_(*search_conditions))
        
        # Apply active filter
        if active_only:
            from datetime import timedelta
            thirty_days_ago = datetime.now().date() - timedelta(days=30)
            base_query = base_query.filter(User.last_activity_date >= thirty_days_ago)
        
        # Get total count before pagination
        total_count = base_query.count()
        
        # Apply sorting
        sort_column = getattr(User, sort_by, User.id)
        if sort_order.lower() == "desc":
            base_query = base_query.order_by(desc(sort_column))
        else:
            base_query = base_query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (page - 1) * limit
        results = base_query.offset(offset).limit(limit).all()
        
        # Format results
        users = []
        for result in results:
            user = result[0]  # User object
            journal_count = result[1] or 0
            conversation_count = result[2] or 0
            badge_count = result[3] or 0
            appointment_count = result[4] or 0
            
            user_item = UserListItem(
                id=user.id,  # type: ignore
                email=decrypt_user_email(user.email),  # type: ignore
                google_sub=user.google_sub,  # type: ignore
                wallet_address=user.wallet_address,  # type: ignore
                sentiment_score=user.sentiment_score,  # type: ignore
                current_streak=user.current_streak,  # type: ignore
                longest_streak=user.longest_streak,  # type: ignore
                last_activity_date=user.last_activity_date,  # type: ignore
                allow_email_checkins=user.allow_email_checkins,  # type: ignore
                created_at=None,  # TODO: Add when field is available
                total_journal_entries=journal_count,
                total_conversations=conversation_count,
                total_badges=badge_count,
                total_appointments=appointment_count,
                last_login=None  # TODO: Add when field is available
            )
            users.append(user_item)
        
        # Get overall statistics
        stats = get_user_stats(db)
        
        return UsersResponse(
            users=users,
            total_count=total_count,
            stats=stats
        )
        
    except Exception as e:
        logger.error(f"Error fetching users for admin {admin_user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get detailed information about a specific user"""
    logger.info(f"Admin {admin_user.id} requesting details for user {user_id}")
    
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get user's journal entries (last 10)
        journal_entries = db.query(JournalEntry)\
            .filter(JournalEntry.user_id == user_id)\
            .order_by(desc(JournalEntry.created_at))\
            .limit(10).all()
        
        journal_data = [
            {
                "id": entry.id,  # type: ignore
                "entry_date": entry.entry_date.isoformat(),  # type: ignore
                "content": entry.content[:200] + "..." if len(entry.content) > 200 else entry.content,  # type: ignore
                "created_at": entry.created_at.isoformat() if entry.created_at else None  # type: ignore
            }
            for entry in journal_entries
        ]
        
        # Get recent conversations (last 10)
        conversations = db.query(Conversation)\
            .filter(Conversation.user_id == user_id)\
            .order_by(desc(Conversation.timestamp))\
            .limit(10).all()
        
        conversation_data = [
            {
                "id": conv.id,  # type: ignore
                "session_id": conv.session_id,  # type: ignore
                "message": conv.message[:100] + "..." if len(conv.message) > 100 else conv.message,  # type: ignore
                "response": conv.response[:100] + "..." if len(conv.response) > 100 else conv.response,  # type: ignore
                "timestamp": conv.timestamp.isoformat() if conv.timestamp else None  # type: ignore
            }
            for conv in conversations
        ]
        
        # Get user badges
        badges = db.query(UserBadge)\
            .filter(UserBadge.user_id == user_id)\
            .order_by(desc(UserBadge.awarded_at)).all()
        
        badge_data = [
            {
                "id": badge.id,  # type: ignore
                "badge_id": badge.badge_id,  # type: ignore
                "contract_address": badge.contract_address,  # type: ignore
                "transaction_hash": badge.transaction_hash,  # type: ignore
                "awarded_at": badge.awarded_at.isoformat() if badge.awarded_at else None  # type: ignore
            }
            for badge in badges
        ]
        
        # Get appointments
        appointments = db.query(Appointment)\
            .filter(Appointment.user_id == user_id)\
            .order_by(desc(Appointment.created_at)).all()
        
        appointment_data = [
            {
                "id": appt.id,  # type: ignore
                "psychologist_id": appt.psychologist_id,  # type: ignore
                "appointment_type_id": appt.appointment_type_id,  # type: ignore
                "appointment_datetime": appt.appointment_datetime.isoformat() if appt.appointment_datetime else None,  # type: ignore
                "status": appt.status,  # type: ignore
                "notes": appt.notes[:100] + "..." if appt.notes and len(appt.notes) > 100 else appt.notes  # type: ignore
            }
            for appt in appointments
        ]
        
        return UserDetailResponse(
            id=user.id,  # type: ignore
            email=decrypt_user_email(user.email),  # type: ignore
            google_sub=user.google_sub,  # type: ignore
            wallet_address=user.wallet_address,  # type: ignore
            sentiment_score=user.sentiment_score,  # type: ignore
            current_streak=user.current_streak,  # type: ignore
            longest_streak=user.longest_streak,  # type: ignore
            last_activity_date=user.last_activity_date,  # type: ignore
            allow_email_checkins=user.allow_email_checkins,  # type: ignore
            created_at=None,  # TODO: Add when field is available
            journal_entries=journal_data,
            recent_conversations=conversation_data,
            badges=badge_data,
            appointments=appointment_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user details for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user details"
        )

@router.put("/users/{user_id}/email-checkins")
async def toggle_user_email_checkins(
    user_id: int,
    enabled: bool = Query(..., description="Enable or disable email checkins"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """Toggle email checkins for a specific user"""
    logger.info(f"Admin {admin_user.id} toggling email checkins for user {user_id} to {enabled}")
    
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.allow_email_checkins = enabled  # type: ignore
        db.commit()
        
        return {
            "message": f"Email checkins {'enabled' if enabled else 'disabled'} for user {user_id}",
            "user_id": user_id,
            "allow_email_checkins": enabled
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling email checkins for user {user_id}: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user email checkin settings"
        )

@router.get("/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get overall system statistics"""
    logger.info(f"Admin {admin_user.id} requesting system stats")
    
    try:
        stats = get_user_stats(db)
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system statistics"
        )
