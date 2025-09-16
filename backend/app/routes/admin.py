# backend/app/routes/admin.py
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, asc, or_, select, case
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
import io
import logging

from app.database import get_async_db
from app.models import User, JournalEntry, Conversation, UserBadge, Appointment, ContentResource, Psychologist, TherapistSchedule, FlaggedSession
from app.dependencies import get_current_active_user, get_admin_user
from app.services import content_resource_service as resource_service
from app.routes.admin.analytics import router as analytics_router
from app.routes.admin.users import router as users_router
from app.routes.admin.utils import decrypt_user_email, get_user_stats, hash_user_id
from app.schemas.admin import UserListItem

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
    dependencies=[]  # We'll add admin auth dependency later
)

# Mount sub-routers for maintainability
router.include_router(analytics_router)
router.include_router(users_router)

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
    # Consistency with sessions endpoint
    last_role: Optional[str] = None
    last_text: Optional[str] = None
    
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
    sentiment_score: Optional[float] = None
    
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

class SessionUser(BaseModel):
    id: int
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    sentiment_score: Optional[float] = None

    class Config:
        from_attributes = True

class SessionDetailResponse(BaseModel):
    session_id: str
    user_id_hash: str  # Censored user identifier
    user: Optional[SessionUser] = None
    conversation_count: int
    first_message_time: datetime
    last_message_time: datetime
    total_duration_minutes: float
    conversations: List[ConversationDetailResponse]
    analysis: Dict[str, Any]
    
    class Config:
        from_attributes = True

# --- AI Conversations Endpoints ---

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

        # Also compute last_text and last_role per session for consistency with sessions endpoint
        last_subq = select(
            Conversation.session_id.label('sid'),
            func.max(Conversation.timestamp).label('max_ts')
        ).filter(Conversation.session_id.in_(session_ids)).group_by(Conversation.session_id).subquery()

        role_expr = case((Conversation.response.isnot(None), 'assistant'), else_='user').label('role')
        last_join = await db.execute(
            select(Conversation.session_id, Conversation.message, Conversation.response, role_expr)
            .join(last_subq, (Conversation.session_id == last_subq.c.sid) & (Conversation.timestamp == last_subq.c.max_ts))
        )
        last_role_map: Dict[str, str] = {}
        last_text_map: Dict[str, str] = {}
        for sid, msg, resp, role in last_join.all():
            full_text = resp or msg or ""
            last_text_map[str(sid)] = full_text
            last_role_map[str(sid)] = role
    else:
        last_role_map = {}
        last_text_map = {}
    
    # Format conversations with censoring
    conversation_items = []
    for conv in conversations:
        conversation_items.append(
            ConversationListItem(
                id=conv.id,
                user_id_hash=hash_user_id(conv.user_id),
                session_id=conv.session_id,
                conversation_id=conv.conversation_id,
                message_preview=conv.message[:100] if conv.message else "",
                response_preview=conv.response[:100] if conv.response else "",
                timestamp=conv.timestamp,
                message_length=len(conv.message) if conv.message else 0,
                response_length=len(conv.response) if conv.response else 0,
                session_message_count=int(session_counts.get(conv.session_id, 1)),
                last_role=last_role_map.get(conv.session_id),
                last_text=last_text_map.get(conv.session_id),
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

@router.get("/conversations/summary", response_model=ConversationStats)
async def get_conversations_summary(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Return only aggregate conversation stats for the dashboard."""
    # Totals
    total_conversations = (await db.execute(select(func.count(Conversation.id)))).scalar() or 0
    total_sessions = (await db.execute(select(func.count(func.distinct(Conversation.session_id))))).scalar() or 0
    total_users_with_conversations = (await db.execute(select(func.count(func.distinct(Conversation.user_id))))).scalar() or 0

    # Averages
    avg_stats_res = await db.execute(select(
        func.avg(func.length(Conversation.message)).label('avg_message_length'),
        func.avg(func.length(Conversation.response)).label('avg_response_length')
    ))
    avg_stats = avg_stats_res.first()
    avg_message_length = float(avg_stats.avg_message_length) if avg_stats and getattr(avg_stats, 'avg_message_length', None) else 0.0
    avg_response_length = float(avg_stats.avg_response_length) if avg_stats and getattr(avg_stats, 'avg_response_length', None) else 0.0

    # Avg messages per session
    session_counts_subq = select(
        Conversation.session_id,
        func.count(Conversation.id).label('count')
    ).group_by(Conversation.session_id).subquery()
    session_stats_res = await db.execute(select(
        func.avg(session_counts_subq.c.count).label('avg_messages_per_session')
    ))
    avg_messages_per_session = float(session_stats_res.scalar() or 0.0)

    # Time windows
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

    return ConversationStats(
        total_conversations=total_conversations,
        total_sessions=total_sessions,
        total_users_with_conversations=total_users_with_conversations,
        avg_messages_per_session=avg_messages_per_session,
        avg_message_length=avg_message_length,
        avg_response_length=avg_response_length,
        conversations_today=int(conversations_today),
        conversations_this_week=int(conversations_this_week),
        most_active_hour=most_active_hour,
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
        user_id_hash=hash_user_id(conversation.user_id),
        session_id=conversation.session_id,
        conversation_id=conversation.conversation_id,
        message=conversation.message or "",
        response=conversation.response or "",
        timestamp=conversation.timestamp,
    )

@router.get("/conversation-session/{session_id}", response_model=SessionDetailResponse)
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
        # Simple sentiment heuristic
        sentiment_score = None
        try:
            pos_words = {"good","great","happy","calm","relief","thanks","helpful","better","improve","manage"}
            neg_words = {"bad","sad","anxious","anxiety","panic","stress","stressed","overwhelmed","angry","depress","hopeless"}
            import re as _re
            text = f"{conv.message or ''} {conv.response or ''}".lower()
            toks = _re.findall(r"[a-zà-öø-ÿ\-']+", text)
            pos = sum(1 for t in toks if t in pos_words)
            neg = sum(1 for t in toks if t in neg_words)
            total = pos + neg
            sentiment_score = ((pos - neg) / total) if total else None
        except Exception:
            sentiment_score = None
        conversation_details.append(
            ConversationDetailResponse(
                id=conv.id,
                user_id_hash=hash_user_id(conv.user_id),
                session_id=conv.session_id,
                conversation_id=conv.conversation_id,
                message=conv.message or "",
                response=conv.response or "",
                timestamp=conv.timestamp,
                sentiment_score=sentiment_score,
            )
        )
    # Build simple analysis
    total_user_chars = sum(len(conv.message) for conv in conversations if conv.message)
    total_ai_chars = sum(len(conv.response) for conv in conversations if conv.response)
    msg_count = len(conversations)
    avg_user_len = (total_user_chars / msg_count) if msg_count else 0
    avg_ai_len = (total_ai_chars / msg_count) if msg_count else 0

    # Naive keyword extraction (basic tokenization, length filter)
    import re
    all_text = " ".join([(conv.message or "") + " " + (conv.response or "") for conv in conversations])
    tokens = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ\-']{4,}", all_text.lower())
    freq: Dict[str, int] = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    top_keywords = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:10]

    analysis = {
        "message_pairs": msg_count,
        "total_user_chars": total_user_chars,
        "total_ai_chars": total_ai_chars,
        "avg_user_message_length": round(avg_user_len, 2),
        "avg_ai_message_length": round(avg_ai_len, 2),
        "top_keywords": top_keywords,
    }

    # Load user details
    session_user: Optional[SessionUser] = None
    try:
        user_res = await db.execute(select(User).filter(User.id == user_id))
        user_obj = user_res.scalar_one_or_none()
        if user_obj:
            session_user = SessionUser(
                id=user_obj.id,  # type: ignore
                email=decrypt_user_email(user_obj.email),  # type: ignore
                role=getattr(user_obj, 'role', None),  # type: ignore
                is_active=getattr(user_obj, 'is_active', None),  # type: ignore
                created_at=getattr(user_obj, 'created_at', None),  # type: ignore
                last_login=getattr(user_obj, 'last_login', None),  # type: ignore
                sentiment_score=getattr(user_obj, 'sentiment_score', None),  # type: ignore
            )
    except Exception:
        session_user = None

    return SessionDetailResponse(
        session_id=session_id, # type: ignore
        user_id_hash=hash_user_id(user_id),
        user=session_user,
        conversation_count=len(conversations),
        first_message_time=first_conv.timestamp,
        last_message_time=last_conv.timestamp,
        total_duration_minutes=duration_minutes,
        conversations=conversation_details,
        analysis=analysis
    )

# --- Sessions list (server-side) ---
class SessionListItem(BaseModel):
    session_id: str
    user_id_hash: str
    message_count: int
    first_time: datetime
    last_time: datetime
    last_preview: str
    last_role: str | None = None
    last_text: str | None = None
    open_flag_count: int = 0

class SessionListResponse(BaseModel):
    sessions: List[SessionListItem]
    total_count: int

@router.get("/conversation-sessions", response_model=SessionListResponse)
async def get_conversation_sessions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    session_search: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    base = select(
        Conversation.session_id.label('sid'),
        func.min(Conversation.user_id).label('uid'),
        func.min(Conversation.timestamp).label('first_time'),
        func.max(Conversation.timestamp).label('last_time'),
        func.count(Conversation.id).label('count')
    )
    if date_from:
        base = base.filter(func.date(Conversation.timestamp) >= date_from)
    if date_to:
        base = base.filter(func.date(Conversation.timestamp) <= date_to)
    base = base.group_by(Conversation.session_id)
    if session_search:
        like = f"%{session_search}%"
        base = base.having(func.min(Conversation.session_id).ilike(like))

    # total count
    total_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    # pagination
    offset = (page - 1) * limit
    res = await db.execute(base.order_by(desc('last_time')).offset(offset).limit(limit))
    rows = res.all()
    sessions_map = []
    sids = []
    for sid, uid, first_t, last_t, cnt in rows:
        sessions_map.append({
            'sid': sid,
            'uid': uid,
            'first_time': first_t,
            'last_time': last_t,
            'count': int(cnt)
        })
        sids.append(sid)

    last_subq = select(
        Conversation.session_id.label('sid'),
        func.max(Conversation.timestamp).label('max_ts')
    ).filter(Conversation.session_id.in_(sids)).group_by(Conversation.session_id).subquery()

    role_expr = case((Conversation.response.isnot(None), 'assistant'), else_='user').label('role')
    last_join = await db.execute(
        select(Conversation.session_id, Conversation.message, Conversation.response, role_expr)
        .join(last_subq, (Conversation.session_id == last_subq.c.sid) & (Conversation.timestamp == last_subq.c.max_ts))
    )
    last_map: Dict[str, str] = {}
    last_role_map: Dict[str, str] = {}
    last_text_map: Dict[str, str] = {}
    for sid, msg, resp, role in last_join.all():
        full_text = resp or msg or ""
        last_map[str(sid)] = full_text[:100]
        last_text_map[str(sid)] = full_text
        last_role_map[str(sid)] = role

    # Open flags count per session
    open_flags_map: Dict[str, int] = {}
    if sids:
        from app.models import FlaggedSession
        flags_q = select(FlaggedSession.session_id, func.count(FlaggedSession.id))\
            .filter(FlaggedSession.session_id.in_(sids))\
            .filter(FlaggedSession.status == 'open')\
            .group_by(FlaggedSession.session_id)
        flags_res = await db.execute(flags_q)
        for sid, cnt in flags_res.all():
            open_flags_map[str(sid)] = int(cnt)

    items: List[SessionListItem] = []
    for m in sessions_map:
        items.append(SessionListItem(
            session_id=m['sid'],
            user_id_hash=hash_user_id(int(m['uid'])) if m['uid'] is not None else 'unknown',
            message_count=m['count'],
            first_time=m['first_time'],
            last_time=m['last_time'],
            last_preview=last_map.get(m['sid'], ""),
            last_role=last_role_map.get(m['sid']),
            last_text=last_text_map.get(m['sid']),
            open_flag_count=open_flags_map.get(m['sid'], 0)
        ))

    return SessionListResponse(sessions=items, total_count=int(total))

@router.get("/conversation-sessions/export.csv")
async def export_conversation_sessions_csv(
    session_search: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    base = select(
        Conversation.session_id.label('sid'),
        func.min(Conversation.user_id).label('uid'),
        func.min(Conversation.timestamp).label('first_time'),
        func.max(Conversation.timestamp).label('last_time'),
        func.count(Conversation.id).label('count')
    )
    if date_from:
        base = base.filter(func.date(Conversation.timestamp) >= date_from)
    if date_to:
        base = base.filter(func.date(Conversation.timestamp) <= date_to)
    base = base.group_by(Conversation.session_id)
    if session_search:
        like = f"%{session_search}%"
        base = base.having(func.min(Conversation.session_id).ilike(like))

    res = await db.execute(base.order_by(desc('last_time')))
    rows = res.all()

    # Prepare CSV
    import csv
    from io import StringIO
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(["session_id","user_hash","message_count","first_time","last_time"]) 
    for sid, uid, first_t, last_t, cnt in rows:
        writer.writerow([sid, hash_user_id(int(uid)) if uid is not None else 'unknown', int(cnt), (first_t.isoformat() if first_t else ''), (last_t.isoformat() if last_t else '')])
    csv_text = buf.getvalue()
    headers = {"Content-Disposition": "attachment; filename=sessions_export.csv"}
    return Response(content=csv_text, media_type="text/csv", headers=headers)

# --- Flagged sessions ---
class FlagCreate(BaseModel):
    reason: Optional[str] = None
    tags: Optional[List[str]] = None

class FlagResponse(BaseModel):
    id: int
    session_id: str
    user_id: Optional[int] = None
    reason: Optional[str] = None
    status: str
    flagged_by_admin_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("/conversations/session/{session_id}/flag", response_model=FlagResponse, status_code=status.HTTP_201_CREATED)
async def flag_session(session_id: str, data: FlagCreate, db: AsyncSession = Depends(get_async_db), admin_user: User = Depends(get_admin_user)):
    # find any conversation to get user_id
    c = (await db.execute(select(Conversation).filter(Conversation.session_id == session_id).limit(1))).scalar_one_or_none()
    flagged = FlaggedSession(session_id=session_id, user_id=c.user_id if c else None, reason=data.reason, status="open", flagged_by_admin_id=admin_user.id, tags=data.tags)
    db.add(flagged)
    await db.commit()
    await db.refresh(flagged)
    return flagged

@router.get("/flags", response_model=List[FlagResponse])
async def list_flags(status_filter: Optional[str] = Query(None), db: AsyncSession = Depends(get_async_db), admin_user: User = Depends(get_admin_user)):
    q = select(FlaggedSession).order_by(desc(FlaggedSession.created_at))
    if status_filter:
        q = q.filter(FlaggedSession.status == status_filter)
    res = await db.execute(q)
    return list(res.scalars().all())

class FlagUpdate(BaseModel):
    status: Optional[str] = None
    reason: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

@router.put("/flags/{flag_id}", response_model=FlagResponse)
async def update_flag(flag_id: int, data: FlagUpdate, db: AsyncSession = Depends(get_async_db), admin_user: User = Depends(get_admin_user)):
    f = (await db.execute(select(FlaggedSession).filter(FlaggedSession.id == flag_id))).scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Flag not found")
    if data.status is not None:
        f.status = data.status
    if data.reason is not None:
        f.reason = data.reason
    if data.tags is not None:
        f.tags = data.tags
    if data.notes is not None:
        f.notes = data.notes
    db.add(f)
    await db.commit()
    await db.refresh(f)
    return f

# --- Flags summary & bulk operations ---
class FlagsSummary(BaseModel):
    open_count: int
    recent: List[FlagResponse]

@router.get("/flags/summary", response_model=FlagsSummary)
async def get_flags_summary(
    limit: int = Query(5, ge=1, le=50),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    # Count open flags
    open_count_res = await db.execute(
        select(func.count(FlaggedSession.id)).filter(FlaggedSession.status == "open")
    )
    open_count = int(open_count_res.scalar() or 0)

    # Recent flags
    recent_res = await db.execute(
        select(FlaggedSession).order_by(desc(FlaggedSession.created_at)).limit(limit)
    )
    recent_flags = list(recent_res.scalars().all())

    return FlagsSummary(open_count=open_count, recent=recent_flags)

class FlagsBulkCloseRequest(BaseModel):
    ids: List[int] = Field(..., description="Flag IDs to close")
    status: Optional[str] = Field("resolved", description="Status to set, default 'resolved'")

@router.post("/flags/bulk-close", response_model=List[FlagResponse])
async def bulk_close_flags(
    data: FlagsBulkCloseRequest,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    if not data.ids:
        return []
    flags_res = await db.execute(select(FlaggedSession).filter(FlaggedSession.id.in_(data.ids)))
    flags = list(flags_res.scalars().all())
    for f in flags:
        f.status = data.status or "resolved"
        f.updated_at = datetime.now()  # type: ignore
        db.add(f)
    await db.commit()
    # refresh updated
    updated: List[FlaggedSession] = []
    for f in flags:
        await db.refresh(f)
        updated.append(f)
    return updated

class FlagsBulkTagRequest(BaseModel):
    ids: List[int] = Field(..., description="Flag IDs to tag")
    tags: List[str] = Field(..., description="Tags to add/set")
    mode: Optional[str] = Field("add", description="'add' to merge, 'set' to replace")

@router.post("/flags/bulk-tag", response_model=List[FlagResponse])
async def bulk_tag_flags(
    data: FlagsBulkTagRequest,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    if not data.ids:
        return []
    mode = (data.mode or "add").lower()
    # Normalize incoming tags
    new_tags_set = {t.strip() for t in (data.tags or []) if t and t.strip()}
    flags_res = await db.execute(select(FlaggedSession).filter(FlaggedSession.id.in_(data.ids)))
    flags = list(flags_res.scalars().all())
    for f in flags:
        existing = []
        try:
            if isinstance(f.tags, list):
                existing = [str(x) for x in f.tags if isinstance(x, (str, int, float))]
            elif isinstance(f.tags, str):
                existing = [f.tags]
        except Exception:
            existing = []
        if mode == "set":
            merged = list(new_tags_set)
        else:  # add/merge unique
            merged = list({*existing, *new_tags_set})
        f.tags = merged  # type: ignore
        f.updated_at = datetime.now()  # type: ignore
        db.add(f)
    await db.commit()
    updated: List[FlaggedSession] = []
    for f in flags:
        await db.refresh(f)
        updated.append(f)
    return updated

@router.get("/conversation-session/{session_id}/export.csv")
async def export_session_csv(session_id: str, db: AsyncSession = Depends(get_async_db), admin_user: User = Depends(get_admin_user)):
    """Export a session as CSV (turn_id, role, content, timestamp, conversation_id, session_id)."""
    stmt = select(Conversation).filter(Conversation.session_id == session_id).order_by(asc(Conversation.timestamp))
    result = await db.execute(stmt)
    conversations: List[Any] = list(result.scalars().all())
    if not conversations:
        raise HTTPException(status_code=404, detail="Session not found")
    import csv
    from io import StringIO
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(["turn_id","role","content","timestamp","conversation_id","session_id"]) 
    for conv in conversations:
        ts = conv.timestamp.isoformat() if conv.timestamp else ""
        if conv.message:
            writer.writerow([conv.id, "user", conv.message, ts, conv.conversation_id, conv.session_id])
        if conv.response:
            writer.writerow([conv.id, "assistant", conv.response, ts, conv.conversation_id, conv.session_id])
    csv_text = buf.getvalue()
    headers = {"Content-Disposition": f"attachment; filename=session_{session_id}.csv"}
    return Response(content=csv_text, media_type="text/csv", headers=headers)

@router.get("/conversation-session/{session_id}/export")
async def export_session_transcript(session_id: str, db: AsyncSession = Depends(get_async_db), admin_user: User = Depends(get_admin_user)):
    """Export a session transcript as plain text sorted by time."""
    stmt = select(Conversation).filter(Conversation.session_id == session_id).order_by(asc(Conversation.timestamp))
    result = await db.execute(stmt)
    conversations: List[Any] = list(result.scalars().all())
    if not conversations:
        raise HTTPException(status_code=404, detail="Session not found")
    lines: List[str] = []
    for conv in conversations:
        ts = conv.timestamp.isoformat() if conv.timestamp else ""
        if conv.message:
            lines.append(f"[{ts}] USER: {conv.message}")
        if conv.response:
            lines.append(f"[{ts}] AI: {conv.response}")
        lines.append("")
    text = "\n".join(lines)
    headers = {"Content-Disposition": f"attachment; filename=session_{session_id}.txt"}
    return Response(content=text, media_type="text/plain; charset=utf-8", headers=headers)

@router.get("/conversations/{conversation_id}/export")
async def export_conversation_turn(conversation_id: int, db: AsyncSession = Depends(get_async_db), admin_user: User = Depends(get_admin_user)):
    result = await db.execute(select(Conversation).filter(Conversation.id == conversation_id))
    conv: Any = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    ts = conv.timestamp.isoformat() if conv.timestamp else ""
    parts = []
    if conv.message:
        parts.append(f"[{ts}] USER: {conv.message}")
    if conv.response:
        parts.append(f"[{ts}] AI: {conv.response}")
    text = "\n".join(parts) + "\n"
    headers = {"Content-Disposition": f"attachment; filename=conversation_{conversation_id}.txt"}
    return Response(content=text, media_type="text/plain; charset=utf-8", headers=headers)

# --- Content Resource Models ---
class ContentResourceBase(BaseModel):
    title: str
    type: str
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    source: Optional[str] = None


class ContentResourceCreate(ContentResourceBase):
    content: Optional[str] = None


class ContentResourceItem(ContentResourceBase):
    id: int
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="resource_metadata")
    mime_type: Optional[str] = None
    embedding_status: str
    embedding_last_processed_at: Optional[datetime]
    chunk_count: int
    storage_backend: str
    object_storage_key: Optional[str] = None
    object_storage_bucket: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ContentResourceResponse(BaseModel):
    items: List[ContentResourceItem]
    total_count: int


@router.post("/content-resources", response_model=ContentResourceItem, status_code=status.HTTP_201_CREATED)
async def create_content_resource(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    type: str = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """
    Create a new content resource suitable for retrieval augmented generation pipelines.
    """

    logger.info("Admin %s creating content resource '%s'", admin_user.id, title)
    resource_type = type.lower()
    if resource_type not in resource_service.SUPPORTED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported resource type")

    parsed_tags = [tag.strip() for tag in (tags or "").split(",") if tag.strip()]

    ingestion_result: resource_service.ResourceIngestionResult

    if resource_type == "text":
        if not content:
            raise HTTPException(status_code=400, detail="Text resources require content")
        ingestion_result = await resource_service.ingest_text_resource({"content": content})
    elif resource_type == "url":
        if not source:
            raise HTTPException(status_code=400, detail="URL resources require a source URL")
        ingestion_result = await resource_service.ingest_url_resource(source)
    else:  # pdf
        if file is None:
            raise HTTPException(status_code=400, detail="PDF resources require an uploaded file")
        ingestion_result = await resource_service.ingest_pdf_resource(file)
        if not source:
            source = file.filename

    db_resource = ContentResource(
        title=title,
        type=resource_type,
        description=description,
        tags=parsed_tags,
        source=source,
        content=ingestion_result.get("processed_content", ""),
        resource_metadata=ingestion_result.get("metadata", {}),
        mime_type=ingestion_result.get("mime_type"),
        embedding_status="pending",
        chunk_count=ingestion_result.get("chunk_count", 0),
        storage_backend=ingestion_result.get("storage_backend", "database"),
        object_storage_key=ingestion_result.get("object_storage_key"),
        object_storage_bucket=ingestion_result.get("object_storage_bucket"),
    )

    db.add(db_resource)
    await db.commit()
    await db.refresh(db_resource)

    background_tasks.add_task(resource_service.enqueue_embedding_job, db_resource.id)
    return db_resource

@router.get("/content-resources", response_model=ContentResourceResponse)
async def get_content_resources(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None, alias="type"),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Get a paginated list of content resources with filtering and sorting."""

    logger.info(
        "Admin %s requesting content resources (page=%s, limit=%s, search=%s, type=%s)",
        admin_user.id,
        page,
        limit,
        search,
        resource_type,
    )

    filters = []
    if search:
        pattern = f"%{search}%"
        filters.append(or_(ContentResource.title.ilike(pattern), ContentResource.description.ilike(pattern)))
    if resource_type:
        filters.append(ContentResource.type == resource_type)

    sort_column_map = {
        "title": ContentResource.title,
        "type": ContentResource.type,
        "created_at": ContentResource.created_at,
        "updated_at": ContentResource.updated_at,
        "embedding_status": ContentResource.embedding_status,
    }
    sort_column = sort_column_map.get(sort_by, ContentResource.created_at)
    sort_method = desc if sort_order.lower() == "desc" else asc

    base_query = select(ContentResource)
    if filters:
        for clause in filters:
            base_query = base_query.where(clause)

    count_query = select(func.count()).select_from(base_query.subquery())
    total_count = (await db.execute(count_query)).scalar() or 0

    query = base_query.order_by(sort_method(sort_column)).offset((page - 1) * limit).limit(limit)
    results = await db.execute(query)
    items = list(results.scalars().all())

    return ContentResourceResponse(items=[ContentResourceItem.from_orm(item) for item in items], total_count=total_count)

@router.get("/content-resources/{resource_id}", response_model=ContentResourceItem)
async def get_content_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Get a single content resource by ID.
    """
    logger.info("Admin %s requesting content resource %s", admin_user.id, resource_id)
    resource = await resource_service.ensure_resource_exists(db, resource_id)
    return resource


@router.get("/content-resources/types", response_model=List[str])
async def get_content_resource_types(
    admin_user: User = Depends(get_admin_user),
):
    """Return the supported resource types for the admin UI."""

    return sorted(resource_service.SUPPORTED_TYPES)


@router.get("/content-resources/{resource_id}/file")
async def download_content_resource_file(
    resource_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Stream the raw binary backing the resource (PDF or crawled HTML)."""

    resource = await resource_service.ensure_resource_exists(db, resource_id)

    media_type = resource.mime_type or "application/octet-stream"
    filename = resource.source or f"resource-{resource_id}"

    if resource.storage_backend == "minio" and resource.object_storage_key:
        bucket = resource.object_storage_bucket or resource_service.get_minio_bucket_name()
        binary = await resource_service.download_from_minio(bucket, resource.object_storage_key)
    else:
        raise HTTPException(status_code=404, detail="Resource has no stored binary")

    return StreamingResponse(
        io.BytesIO(binary),
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename=\"{filename}\""},
    )

@router.put("/content-resources/{resource_id}", response_model=ContentResourceItem)
async def update_content_resource(
    resource_id: int,
    background_tasks: BackgroundTasks,
    title: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
):
    """Update a content resource and optionally re-ingest new source material."""

    logger.info("Admin %s updating content resource %s", admin_user.id, resource_id)
    db_resource = await resource_service.ensure_resource_exists(db, resource_id)

    new_type = (type or db_resource.type).lower()
    if new_type not in resource_service.SUPPORTED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported resource type")

    ingestion_result: Optional[resource_service.ResourceIngestionResult] = None

    if new_type == "text" and content is not None:
        ingestion_result = await resource_service.ingest_text_resource({"content": content})
    elif new_type == "url" and source is not None:
        ingestion_result = await resource_service.ingest_url_resource(source)
    elif new_type == "pdf" and file is not None:
        ingestion_result = await resource_service.ingest_pdf_resource(file)
        if not source:
            source = file.filename

    if title is not None:
        db_resource.title = title
    if description is not None:
        db_resource.description = description
    if tags is not None:
        db_resource.tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
    if source is not None:
        db_resource.source = source

    db_resource.type = new_type

    if ingestion_result:
        # Clean up previous storage location if present
        if db_resource.storage_backend == "minio" and db_resource.object_storage_key:
            bucket_to_delete = db_resource.object_storage_bucket or resource_service.get_minio_bucket_name()
            await resource_service.delete_from_minio(bucket_to_delete, db_resource.object_storage_key)

        db_resource.content = ingestion_result.get("processed_content", "")
        db_resource.resource_metadata = ingestion_result.get("metadata", {})
        db_resource.mime_type = ingestion_result.get("mime_type")
        db_resource.embedding_status = "pending"
        db_resource.chunk_count = ingestion_result.get("chunk_count", 0)
        db_resource.storage_backend = ingestion_result.get("storage_backend", db_resource.storage_backend)
        db_resource.object_storage_key = ingestion_result.get("object_storage_key")
        db_resource.object_storage_bucket = ingestion_result.get("object_storage_bucket")
        background_tasks.add_task(resource_service.enqueue_embedding_job, db_resource.id)

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
    logger.info("Admin %s deleting content resource %s", admin_user.id, resource_id)
    db_resource = await resource_service.ensure_resource_exists(db, resource_id)

    if db_resource.storage_backend == "minio" and db_resource.object_storage_key:
        bucket = db_resource.object_storage_bucket or resource_service.get_minio_bucket_name()
        await resource_service.delete_from_minio(bucket, db_resource.object_storage_key)

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

# --- Dashboard Summaries ---
class AppointmentSummary(BaseModel):
    date_from: date
    date_to: date
    total: int
    completed: int
    cancelled: int
    today_total: int

@router.get("/appointments/summary", response_model=AppointmentSummary)
async def get_appointments_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Lightweight summary for appointments to power the dashboard."""
    try:
        today = datetime.now().date()
        # Default range is current month
        if not date_from or not date_to:
            first_day = today.replace(day=1)
            if today.month == 12:
                next_month = today.replace(year=today.year + 1, month=1, day=1)
            else:
                next_month = today.replace(month=today.month + 1, day=1)
            last_day = next_month - timedelta(days=1)
            date_from = date_from or first_day
            date_to = date_to or last_day

        base = select(Appointment).filter(
            func.date(Appointment.appointment_datetime) >= date_from,
            func.date(Appointment.appointment_datetime) <= date_to,
        )

        total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
        completed = (await db.execute(select(func.count(Appointment.id)).filter(Appointment.status == 'completed', func.date(Appointment.appointment_datetime) >= date_from, func.date(Appointment.appointment_datetime) <= date_to))).scalar() or 0
        cancelled = (await db.execute(select(func.count(Appointment.id)).filter(Appointment.status == 'cancelled', func.date(Appointment.appointment_datetime) >= date_from, func.date(Appointment.appointment_datetime) <= date_to))).scalar() or 0
        today_total = (await db.execute(select(func.count(Appointment.id)).filter(func.date(Appointment.appointment_datetime) == today))).scalar() or 0

        return AppointmentSummary(
            date_from=date_from,
            date_to=date_to,
            total=int(total),
            completed=int(completed),
            cancelled=int(cancelled),
            today_total=int(today_total),
        )
    except Exception as e:
        logger.error(f"Error generating appointment summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch appointment summary")


class FeedbackSummary(BaseModel):
    window_days: int
    count: int
    avg_nps: Optional[float] = None
    avg_felt_understood: Optional[float] = None

@router.get("/feedback/summary", response_model=FeedbackSummary)
async def get_feedback_summary(
    window_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user)
):
    """Compute simple feedback KPIs (NPS, felt understood) for the last N days."""
    try:
        from app.models import Feedback
        cutoff = datetime.now() - timedelta(days=window_days)
        base = select(Feedback).filter(Feedback.timestamp >= cutoff)
        count = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0

        avg_nps = (await db.execute(select(func.avg(Feedback.nps_rating)).filter(Feedback.timestamp >= cutoff))).scalar()
        avg_felt = (await db.execute(select(func.avg(Feedback.felt_understood_rating)).filter(Feedback.timestamp >= cutoff))).scalar()

        return FeedbackSummary(
            window_days=window_days,
            count=int(count),
            avg_nps=float(avg_nps) if avg_nps is not None else None,
            avg_felt_understood=float(avg_felt) if avg_felt is not None else None,
        )
    except Exception as e:
        logger.error(f"Error generating feedback summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch feedback summary")

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
    # Correlated subqueries: accurate counts without join fan-out
    journal_count_sq = (
        select(func.count(JournalEntry.id))
        .where(JournalEntry.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    conversation_count_sq = (
        select(func.count(Conversation.id))
        .where(Conversation.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    badge_count_sq = (
        select(func.count(UserBadge.id))
        .where(UserBadge.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    appointment_count_sq = (
        select(func.count(Appointment.id))
        .where(Appointment.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )

    base_query = (
        select(
            User,
            journal_count_sq.label("journal_count"),
            conversation_count_sq.label("conversation_count"),
            badge_count_sq.label("badge_count"),
            appointment_count_sq.label("appointment_count"),
        )
        .where(User.role == "therapist")
    )

    results = await db.execute(base_query)

    users: List[UserListItem] = []
    for user, journal_count, conversation_count, badge_count, appointment_count in results.all():
        users.append(
            UserListItem(
                id=user.id,
                email=decrypt_user_email(user.email),
                google_sub=user.google_sub,
                wallet_address=user.wallet_address,
                sentiment_score=user.sentiment_score,
                current_streak=user.current_streak,
                longest_streak=user.longest_streak,
                last_activity_date=user.last_activity_date,
                allow_email_checkins=user.allow_email_checkins,
                role=getattr(user, "role", "user"),
                is_active=getattr(user, "is_active", True),
                created_at=getattr(user, "created_at", None),
                total_journal_entries=int(journal_count or 0),
                total_conversations=int(conversation_count or 0),
                total_badges=int(badge_count or 0),
                total_appointments=int(appointment_count or 0),
                last_login=getattr(user, "last_login", None),
            )
        )
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

    setattr(db_appointment, 'status', appointment_data.status)
    setattr(db_appointment, 'status', appointment_data.status)
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
