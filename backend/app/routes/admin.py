# backend/app/routes/admin.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, asc, or_, select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
import logging

from app.database import get_async_db
from app.models import User, JournalEntry, Conversation, UserBadge, Appointment, ContentResource, Psychologist, TherapistSchedule
from app.dependencies import get_current_active_user, get_admin_user
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
    google_sub: Optional[str] = None
    wallet_address: Optional[str] = None
    sentiment_score: float
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date] = None
    allow_email_checkins: bool
    role: Optional[str] = "user"
    is_active: Optional[bool] = True
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
    google_sub: Optional[str] = None
    wallet_address: Optional[str] = None
    sentiment_score: float
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date] = None
    allow_email_checkins: bool
    role: Optional[str] = "user"
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    
    # Detailed stats
    journal_entries: List[Dict[str, Any]]
    recent_conversations: List[Dict[str, Any]]
    badges: List[Dict[str, Any]]
    appointments: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

# --- AI Conversations Models ---
class ConversationListItem(BaseModel):
    id: int
    user_id_hash: str  # Censored user identifier
    session_id: str
    conversation_id: str
    message_preview: str  # First 100 chars of user message
    response_preview: str  # First 100 chars of AI response
    timestamp: datetime
    message_length: int
    response_length: int
    session_message_count: int  # Number of messages in this session
    
    class Config:
        from_attributes = True

class ConversationDetailResponse(BaseModel):
    id: int
    user_id_hash: str  # Censored user identifier
    session_id: str
    conversation_id: str
    message: str
    response: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

class ConversationStats(BaseModel):
    total_conversations: int
    total_sessions: int
    total_users_with_conversations: int
    avg_messages_per_session: float
    avg_message_length: float
    avg_response_length: float
    conversations_today: int
    conversations_this_week: int
    most_active_hour: int

class ConversationsResponse(BaseModel):
    conversations: List[ConversationListItem]
    total_count: int
    stats: ConversationStats

class SessionDetailResponse(BaseModel):
    session_id: str
    user_id_hash: str  # Censored user identifier
    conversation_count: int
    first_message_time: datetime
    last_message_time: datetime
    total_duration_minutes: float
    conversations: List[ConversationDetailResponse]
    
    class Config:
        from_attributes = True

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

async def get_user_stats(db: AsyncSession) -> UserStats:
    """Calculate overall user statistics"""
    from datetime import timedelta
    
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # Basic counts
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    
    # Active users (users with activity in last 30/7 days)
    active_30d_res = await db.execute(select(func.count(User.id)).filter(
        User.last_activity_date >= month_ago
    ))
    active_30d = active_30d_res.scalar() or 0
    
    active_7d_res = await db.execute(select(func.count(User.id)).filter(
        User.last_activity_date >= week_ago
    ))
    active_7d = active_7d_res.scalar() or 0
    
    # New users today
    new_today_res = await db.execute(select(func.count(User.id)).filter(func.date(User.created_at) == today))
    new_today = new_today_res.scalar() or 0
    
    # Average sentiment score
    avg_sentiment_res = await db.execute(select(func.avg(User.sentiment_score)))
    avg_sentiment = avg_sentiment_res.scalar() or 0.0
    
    # Content counts
    total_journals = (await db.execute(select(func.count(JournalEntry.id)))).scalar() or 0
    total_conversations = (await db.execute(select(func.count(Conversation.id)))).scalar() or 0
    total_badges = (await db.execute(select(func.count(UserBadge.id)))).scalar() or 0
    
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

from app.agents.analytics_agent import AnalyticsAgent

class AnalyticsResponse(BaseModel):
    user_stats: UserStats
    conversation_stats: ConversationStats

# --- Admin Endpoints ---

@router.post("/analytics/run")
async def run_analytics_agent(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Trigger the analytics agent to generate a new report"""
    logger.info(f"Admin {admin_user.id} triggered analytics agent")
    try:
        agent = AnalyticsAgent(db)
        report = await agent.analyze_trends(timeframe_days=7)
        return {"message": "Analytics report generated successfully", "report": report.dict()}
    except Exception as e:
        logger.error(f"Error running analytics agent: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to run analytics agent"
        )

@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get the latest analytics report"""
    logger.info(f"Admin {admin_user.id} requesting analytics data")
    try:
        stmt = select(AnalyticsReportModel).order_by(desc(AnalyticsReportModel.generated_at))
        result = await db.execute(stmt)
        latest_report = result.scalar_one_or_none()

        if not latest_report:
            return {"message": "No analytics report found. Please run the agent first."}

        return latest_report
    except Exception as e:
        logger.error(f"Error fetching analytics data for admin {admin_user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analytics data"
        )

@router.get("/users", response_model=UsersResponse)
async def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by email or google_sub"),
    sort_by: str = Query("id", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    active_only: bool = Query(False, description="Show only active users"),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get paginated list of users with statistics"""
    logger.info(f"Admin {admin_user.id} requesting users list (page {page}, limit {limit})")
    
    try:
        # Build base query with joins for aggregated data
        base_query = select(
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
        count_query = select(func.count()).select_from(base_query.subquery())
        total_count = (await db.execute(count_query)).scalar() or 0
        
        # Apply sorting
        sort_column = getattr(User, sort_by, User.id)
        if sort_order.lower() == "desc":
            base_query = base_query.order_by(desc(sort_column))
        else:
            base_query = base_query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (page - 1) * limit
        results = (await db.execute(base_query.offset(offset).limit(limit))).all()
        
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
                role=getattr(user, 'role', 'user'),  # type: ignore
                is_active=getattr(user, 'is_active', True),  # type: ignore
                created_at=getattr(user, 'created_at', None),  # type: ignore
                total_journal_entries=journal_count,
                total_conversations=conversation_count,
                total_badges=badge_count,
                total_appointments=appointment_count,
                last_login=getattr(user, 'last_login', None)  # type: ignore
            )
            users.append(user_item)
        
        # Get overall statistics
        stats = await get_user_stats(db)
        
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
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get detailed information about a specific user"""
    logger.info(f"Admin {admin_user.id} requesting details for user {user_id}")
    
    try:
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get user's journal entries (last 10)
        journal_stmt = select(JournalEntry)\
            .filter(JournalEntry.user_id == user_id)\
            .order_by(desc(JournalEntry.created_at))\
            .limit(10)
        journal_entries_res = await db.execute(journal_stmt)
        journal_entries = journal_entries_res.scalars().all()
        
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
        conv_stmt = select(Conversation)\
            .filter(Conversation.user_id == user_id)\
            .order_by(desc(Conversation.timestamp))\
            .limit(10)
        conversations_res = await db.execute(conv_stmt)
        conversations = conversations_res.scalars().all()
        
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
        badge_stmt = select(UserBadge)\
            .filter(UserBadge.user_id == user_id)\
            .order_by(desc(UserBadge.awarded_at))
        badges_res = await db.execute(badge_stmt)
        badges = badges_res.scalars().all()
        
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
        appt_stmt = select(Appointment)\
            .filter(Appointment.user_id == user_id)\
            .order_by(desc(Appointment.created_at))
        appointments_res = await db.execute(appt_stmt)
        appointments = appointments_res.scalars().all()
        
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
            role=getattr(user, 'role', 'user'),  # type: ignore
            is_active=getattr(user, 'is_active', True),  # type: ignore
            created_at=getattr(user, 'created_at', None),  # type: ignore
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
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Toggle email checkins for a specific user"""
    logger.info(f"Admin {admin_user.id} toggling email checkins for user {user_id} to {enabled}")
    
    try:
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.allow_email_checkins = enabled  # type: ignore
        db.add(user)
        await db.commit()
        
        return {
            "message": f"Email checkins {'enabled' if enabled else 'disabled'} for user {user_id}",
            "user_id": user_id,
            "allow_email_checkins": enabled
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling email checkins for user {user_id}: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user email checkin settings"
        )


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    is_active: bool = Query(..., description="Set user active status"),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Update user active status (enable/disable user account)"""
    logger.info(f"Admin {admin_user.id} updating status for user {user_id} to active={is_active}")
    
    try:
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent admins from deactivating themselves
        if user_id == admin_user.id and not is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )
        
        user.is_active = is_active  # type: ignore
        user.updated_at = datetime.now()  # type: ignore
        db.add(user)
        await db.commit()
        
        return {
            "message": f"User {user_id} {'activated' if is_active else 'deactivated'} successfully",
            "user_id": user_id,
            "is_active": is_active
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user status for user {user_id}: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user status"
        )


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: str = Query(..., description="New user role", regex="^(user|admin|therapist)$"),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Update user role"""
    logger.info(f"Admin {admin_user.id} updating role for user {user_id} to {role}")
    
    try:
        # Only admin users can change roles
        admin_role = getattr(admin_user, 'role', None)
        if admin_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin users can change user roles"
            )
        
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent admins from removing their own admin role
        if user_id == admin_user.id and role != "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove admin role from your own account"
            )
        
        old_role = getattr(user, 'role', 'user')
        user.role = role  # type: ignore
        user.updated_at = datetime.now()  # type: ignore
        db.add(user)
        await db.commit()
        
        return {
            "message": f"User {user_id} role updated from '{old_role}' to '{role}'",
            "user_id": user_id,
            "old_role": old_role,
            "new_role": role
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user role for user {user_id}: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user role"
        )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    permanent: bool = Query(False, description="Permanently delete user data"),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Delete or deactivate a user account"""
    logger.info(f"Admin {admin_user.id} attempting to delete user {user_id} (permanent={permanent})")
    
    try:
        # Only admin users can delete accounts
        admin_role = getattr(admin_user, 'role', None)
        if admin_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin users can delete user accounts"
            )
        
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent admins from deleting themselves
        if user_id == admin_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        if permanent:
            # Permanent deletion - CASCADE will handle related records
            await db.delete(user)
            message = f"User {user_id} permanently deleted"
        else:
            # Soft delete - just deactivate
            user.is_active = False  # type: ignore
            user.updated_at = datetime.now()  # type: ignore
            db.add(user)
            message = f"User {user_id} deactivated"
        
        await db.commit()
        
        return {
            "message": message,
            "user_id": user_id,
            "permanent": permanent
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Generate a password reset token for a user"""
    logger.info(f"Admin {admin_user.id} requesting password reset for user {user_id}")
    
    try:
        # Only admin users can reset passwords
        admin_role = getattr(admin_user, 'role', None)
        if admin_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin users can reset passwords"
            )
        
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_email = decrypt_user_email(getattr(user, 'email', None))
        if not user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User does not have an email address"
            )
        
        # Generate reset token (simplified implementation)
        import secrets
        reset_token = secrets.token_urlsafe(32)
        
        # In a real implementation, you would:
        # 1. Store the reset token in a password_reset_tokens table
        # 2. Send an email to the user with the reset link
        # 3. Set an expiration time for the token
        
        logger.info(f"Password reset token generated for user {user_id}")
        
        return {
            "message": f"Password reset token generated for user {user_id}",
            "user_id": user_id,
            "email": user_email,
            "reset_token": reset_token,  # In production, don't return this directly
            "note": "In production, this token would be sent via email"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating password reset for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate password reset"
        )


# --- AI Conversations Endpoints ---

def _hash_user_id(user_id: int) -> str:
    """Create a consistent but anonymous hash for user identification."""
    import hashlib
    return hashlib.md5(f"user_{user_id}_salt".encode()).hexdigest()[:8]

@router.get("/conversations", response_model=ConversationsResponse)
async def get_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search in message or response content"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    date_from: Optional[date] = Query(None, description="Filter conversations from this date"),
    date_to: Optional[date] = Query(None, description="Filter conversations to this date"),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get paginated list of AI conversations with privacy censoring."""
    logger.info(f"Admin {admin_user.id} requesting conversations list (page {page}, limit {limit})")
    
    # Base query
    query = select(Conversation).order_by(desc(Conversation.timestamp))
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Conversation.message.ilike(search_term),
                Conversation.response.ilike(search_term)
            )
        )
    
    if session_id:
        query = query.filter(Conversation.session_id == session_id)
    
    if date_from:
        query = query.filter(func.date(Conversation.timestamp) >= date_from)
    
    if date_to:
        query = query.filter(func.date(Conversation.timestamp) <= date_to)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_count_res = await db.execute(count_query)
    total_count = total_count_res.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * limit
    conversations_res = await db.execute(query.offset(offset).limit(limit))
    conversations: List[Any] = list(conversations_res.scalars().all())
    
    # Get session message counts
    session_counts: Dict[str, int] = {}
    if conversations:
        session_ids = list(set(conv.session_id for conv in conversations))
        session_count_query = select(
            Conversation.session_id,
            func.count(Conversation.id).label('count')
        ).filter(
            Conversation.session_id.in_(session_ids)
        ).group_by(Conversation.session_id)
        
        session_count_results = await db.execute(session_count_query)
        session_counts = {session_id: count for session_id, count in session_count_results}
    
    # Format conversations with censoring
    conversation_items = []
    for conv in conversations:
        conversation_items.append(
            ConversationListItem(
                id=conv.id,
                user_id_hash=_hash_user_id(conv.user_id),
                session_id=conv.session_id,
                conversation_id=conv.conversation_id,
                message_preview=conv.message[:100] if conv.message else "",
                response_preview=conv.response[:100] if conv.response else "",
                timestamp=conv.timestamp,
                message_length=len(conv.message) if conv.message else 0,
                response_length=len(conv.response) if conv.response else 0,
                session_message_count=int(session_counts.get(conv.session_id, 1)),
            )
        )
    
    # Calculate stats with privacy in mind
    total_conversations = (await db.execute(select(func.count(Conversation.id)))).scalar() or 0
    total_sessions = (await db.execute(select(func.count(func.distinct(Conversation.session_id))))).scalar() or 0
    total_users_with_conversations = (await db.execute(select(func.count(func.distinct(Conversation.user_id))))).scalar() or 0
    
    # Calculate averages
    avg_stats_res = await db.execute(select(
        func.avg(func.length(Conversation.message)).label('avg_message_length'),
        func.avg(func.length(Conversation.response)).label('avg_response_length')
    ))
    avg_stats = avg_stats_res.first()
    
    # Session stats
    session_counts_subq = select(
        Conversation.session_id,
        func.count(Conversation.id).label('count')
    ).group_by(Conversation.session_id).subquery()
    
    session_stats_res = await db.execute(select(
        func.avg(session_counts_subq.c.count).label('avg_messages_per_session')
    ))
    session_stats = session_stats_res.first()
    
    # Time-based stats
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    
    conversations_today = (await db.execute(select(func.count(Conversation.id)).filter(func.date(Conversation.timestamp) == today))).scalar() or 0
    
    conversations_this_week = (await db.execute(select(func.count(Conversation.id)).filter(func.date(Conversation.timestamp) >= week_ago))).scalar() or 0
    
    # Most active hour
    hour_stats_res = await db.execute(select(
        func.extract('hour', Conversation.timestamp).label('hour'),
        func.count(Conversation.id).label('count')
    ).group_by(
        func.extract('hour', Conversation.timestamp)
    ).order_by(
        desc(func.count(Conversation.id))
    ))
    hour_stats = hour_stats_res.first()
    
    most_active_hour = int(hour_stats.hour) if hour_stats else 0
    
    # Safely get stats values with None checks
    avg_messages_per_session = 0.0
    if session_stats and hasattr(session_stats, 'avg_messages_per_session') and session_stats.avg_messages_per_session:
        avg_messages_per_session = float(session_stats.avg_messages_per_session)
    
    avg_message_length = 0.0
    if avg_stats and hasattr(avg_stats, 'avg_message_length') and avg_stats.avg_message_length:
        avg_message_length = float(avg_stats.avg_message_length)
    
    avg_response_length = 0.0
    if avg_stats and hasattr(avg_stats, 'avg_response_length') and avg_stats.avg_response_length:
        avg_response_length = float(avg_stats.avg_response_length)
    
    stats = ConversationStats(
        total_conversations=total_conversations,
        total_sessions=total_sessions,
        total_users_with_conversations=total_users_with_conversations,
        avg_messages_per_session=avg_messages_per_session,
        avg_message_length=avg_message_length,
        avg_response_length=avg_response_length,
        conversations_today=conversations_today,
        conversations_this_week=conversations_this_week,
        most_active_hour=most_active_hour
    )
    
    return ConversationsResponse(
        conversations=conversation_items,
        total_count=total_count,
        stats=stats
    )

@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_detail(
    conversation_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get detailed view of a specific conversation with privacy censoring."""
    logger.info(f"Admin {admin_user.id} requesting conversation detail {conversation_id}")
    
    result = await db.execute(select(Conversation).filter(Conversation.id == conversation_id))
    conversation: Any = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return ConversationDetailResponse(
        id=conversation.id,
        user_id_hash=_hash_user_id(conversation.user_id),
        session_id=conversation.session_id,
        conversation_id=conversation.conversation_id,
        message=conversation.message or "",
        response=conversation.response or "",
        timestamp=conversation.timestamp,
    )

@router.get("/conversations/session/{session_id}", response_model=SessionDetailResponse)
async def get_session_detail(
    session_id: str,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get all conversations in a specific session with privacy censoring."""
    logger.info(f"Admin {admin_user.id} requesting session detail {session_id}")
    
    # Get all conversations for this session
    stmt = select(Conversation).filter(
        Conversation.session_id == session_id
    ).order_by(asc(Conversation.timestamp))
    result = await db.execute(stmt)
    conversations: List[Any] = list(result.scalars().all())
    
    if not conversations:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Calculate session stats
    first_conv = conversations[0]
    last_conv = conversations[-1]
    user_id = first_conv.user_id
    
    duration_minutes = 0
    if len(conversations) > 1:
        duration = last_conv.timestamp - first_conv.timestamp
        duration_minutes = duration.total_seconds() / 60
    
    # Format conversations with censoring
    conversation_details = []
    for conv in conversations:
        conversation_details.append(
            ConversationDetailResponse(
                id=conv.id,
                user_id_hash=_hash_user_id(conv.user_id),
                session_id=conv.session_id,
                conversation_id=conv.conversation_id,
                message=conv.message or "",
                response=conv.response or "",
                timestamp=conv.timestamp,
            )
        )
    
    return SessionDetailResponse(
        session_id=session_id, # type: ignore
        user_id_hash=_hash_user_id(user_id),
        conversation_count=len(conversations),
        first_message_time=first_conv.timestamp,
        last_message_time=last_conv.timestamp,
        total_duration_minutes=duration_minutes,
        conversations=conversation_details
    )

# --- Content Resource Models ---
class ContentResourceBase(BaseModel):
    title: str
    content: str
    source: Optional[str] = None
    type: str

class ContentResourceCreate(ContentResourceBase):
    pass

class ContentResourceItem(ContentResourceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ContentResourceResponse(BaseModel):
    items: List[ContentResourceItem]
    total_count: int


@router.post("/content-resources", response_model=ContentResourceItem, status_code=status.HTTP_201_CREATED)
async def create_content_resource(
    resource: ContentResourceCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Create a new content resource.
    """
    logger.info(f"Admin {admin_user.id} creating new content resource: {resource.title}")
    try:
        db_resource = ContentResource(**resource.dict())
        db.add(db_resource)
        await db.commit()
        await db.refresh(db_resource)
        return db_resource
    except Exception as e:
        logger.error(f"Error creating content resource: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create content resource"
        )

@router.get("/content-resources", response_model=ContentResourceResponse)
async def get_content_resources(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Get a paginated list of content resources.
    """
    logger.info(f"Admin {admin_user.id} requesting content resources (page {page}, limit {limit})")
    try:
        # Get total count
        count_query = select(func.count()).select_from(ContentResource)
        total_count = (await db.execute(count_query)).scalar() or 0
        logger.info(f"Total content resources: {total_count}")

        # Get paginated items
        query = select(ContentResource).order_by(desc(ContentResource.created_at)).offset((page - 1) * limit).limit(limit)
        results = await db.execute(query)
        items = results.scalars().all()
        logger.info(f"Fetched {len(items)} content resources.")

        return ContentResourceResponse(items=items, total_count=total_count)
    except Exception as e:
        logger.error(f"Error fetching content resources: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch content resources"
        )

@router.get("/content-resources/{resource_id}", response_model=ContentResourceItem)
async def get_content_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Get a single content resource by ID.
    """
    logger.info(f"Admin {admin_user.id} requesting content resource {resource_id}")
    result = await db.execute(select(ContentResource).filter(ContentResource.id == resource_id))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content resource not found")
    return resource

@router.put("/content-resources/{resource_id}", response_model=ContentResourceItem)
async def update_content_resource(
    resource_id: int,
    resource_update: ContentResourceCreate,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Update a content resource.
    """
    logger.info(f"Admin {admin_user.id} updating content resource {resource_id}")
    result = await db.execute(select(ContentResource).filter(ContentResource.id == resource_id))
    db_resource = result.scalar_one_or_none()
    if not db_resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content resource not found")

    for key, value in resource_update.dict().items():
        setattr(db_resource, key, value)
    
    db_resource.updated_at = datetime.now()
    db.add(db_resource)
    await db.commit()
    await db.refresh(db_resource)
    return db_resource

@router.delete("/content-resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Delete a content resource.
    """
    logger.info(f"Admin {admin_user.id} deleting content resource {resource_id}")
    result = await db.execute(select(ContentResource).filter(ContentResource.id == resource_id))
    db_resource = result.scalar_one_or_none()
    if not db_resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content resource not found")

    await db.delete(db_resource)
    await db.commit()
    return

@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Get overall system statistics"""
    logger.info(f"Admin {admin_user.id} requesting system stats")
    
    try:
        stats = await get_user_stats(db)
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system statistics"
        )

# --- Appointment Models ---
class PsychologistResponse(BaseModel):
    id: int
    name: str
    specialization: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool

    class Config:
        from_attributes = True

class AppointmentResponse(BaseModel):
    id: int
    user: UserListItem
    psychologist: PsychologistResponse
    appointment_type: str
    appointment_datetime: datetime
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Appointment Endpoints ---
@router.get("/psychologists", response_model=List[UserListItem])
async def get_psychologists(db: AsyncSession = Depends(get_async_db)):
    base_query = select(
        User,
        func.count(JournalEntry.id).label('journal_count'),
        func.count(Conversation.id).label('conversation_count'),
        func.count(UserBadge.id).label('badge_count'),
        func.count(Appointment.id).label('appointment_count')
    ).outerjoin(JournalEntry, User.id == JournalEntry.user_id)
     .outerjoin(Conversation, User.id == Conversation.user_id)
     .outerjoin(UserBadge, User.id == UserBadge.user_id)
     .outerjoin(Appointment, User.id == Appointment.user_id)
     .group_by(User.id)
    
    results = await db.execute(base_query.filter(User.role == "therapist"))
    users = []
    for result in results.all():
        user = result[0]
        journal_count = result[1] or 0
        conversation_count = result[2] or 0
        badge_count = result[3] or 0
        appointment_count = result[4] or 0
        
        user_item = UserListItem(
            id=user.id,
            email=decrypt_user_email(user.email),
            google_sub=user.google_sub,
            wallet_address=user.wallet_address,
            sentiment_score=user.sentiment_score,
            current_streak=user.current_streak,
            longest_streak=user.longest_streak,
            last_activity_date=user.last_activity_date,
            allow_email_checkins=user.allow_email_checkins,
            role=getattr(user, 'role', 'user'),
            is_active=getattr(user, 'is_active', True),
            created_at=getattr(user, 'created_at', None),
            total_journal_entries=journal_count,
            total_conversations=conversation_count,
            total_badges=badge_count,
            total_appointments=appointment_count,
            last_login=getattr(user, 'last_login', None)
        )
        users.append(user_item)
    return users

@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.user),
            selectinload(Appointment.psychologist),
            selectinload(Appointment.appointment_type)
        )
        .order_by(desc(Appointment.appointment_datetime))
    )
    appointments = result.scalars().all()
    return appointments

@router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.user),
            selectinload(Appointment.psychologist),
            selectinload(Appointment.appointment_type)
        )
        .filter(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appointment

class AppointmentUpdate(BaseModel):
    status: str

@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: int, appointment_data: AppointmentUpdate, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Appointment).filter(Appointment.id == appointment_id))
    db_appointment = result.scalar_one_or_none()
    if not db_appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    db_appointment.status = appointment_data.status
    db.add(db_appointment)
    await db.commit()
    await db.refresh(db_appointment)
    return db_appointment

@router.delete("/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(appointment_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Appointment).filter(Appointment.id == appointment_id))
    db_appointment = result.scalar_one_or_none()
    if not db_appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    await db.delete(db_appointment)
    await db.commit()

# --- Therapist Schedule Models ---
class TherapistScheduleResponse(BaseModel):
    id: int
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool
    reason: Optional[str] = None

    class Config:
        from_attributes = True

class TherapistScheduleCreate(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool = True
    reason: Optional[str] = None

class TherapistScheduleUpdate(BaseModel):
    day_of_week: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_available: Optional[bool] = None
    reason: Optional[str] = None

# --- Therapist Schedule Endpoints ---
@router.get("/therapists/{therapist_id}/schedule", response_model=List[TherapistScheduleResponse])
async def get_therapist_schedule(therapist_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(TherapistSchedule)
        .filter(TherapistSchedule.therapist_id == therapist_id)
    )
    schedule = result.scalars().all()
    return schedule

@router.post("/therapists/{therapist_id}/schedule", response_model=TherapistScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_therapist_schedule(
    therapist_id: int,
    schedule_data: TherapistScheduleCreate,
    db: AsyncSession = Depends(get_async_db)
):
    db_schedule = TherapistSchedule(therapist_id=therapist_id, **schedule_data.dict())
    db.add(db_schedule)
    await db.commit()
    await db.refresh(db_schedule)
    return db_schedule

@router.put("/therapists/schedule/{schedule_id}", response_model=TherapistScheduleResponse)
async def update_therapist_schedule(
    schedule_id: int,
    schedule_data: TherapistScheduleUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    result = await db.execute(select(TherapistSchedule).filter(TherapistSchedule.id == schedule_id))
    db_schedule = result.scalar_one_or_none()
    if not db_schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    update_data = schedule_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_schedule, key, value)
    
    db.add(db_schedule)
    await db.commit()
    await db.refresh(db_schedule)
    return db_schedule

@router.delete("/therapists/schedule/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_therapist_schedule(schedule_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(TherapistSchedule).filter(TherapistSchedule.id == schedule_id))
    db_schedule = result.scalar_one_or_none()
    if not db_schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    await db.delete(db_schedule)
    await db.commit()
