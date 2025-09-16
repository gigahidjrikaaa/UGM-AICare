"""Aggregated admin schemas for external imports."""
from .analytics import AnalyticsResponse
from .appointments import (
    AppointmentResponse,
    AppointmentUpdate,
    PsychologistResponse,
    TherapistScheduleCreate,
    TherapistScheduleResponse,
    TherapistScheduleUpdate,
)
from .content_resources import (
    ContentResourceBase,
    ContentResourceCreate,
    ContentResourceItem,
    ContentResourceResponse,
)
from .conversations import (
    ConversationDetailResponse,
    ConversationListItem,
    ConversationStats,
    ConversationsResponse,
    SessionDetailResponse,
    SessionListItem,
    SessionListResponse,
    SessionUser,
)
from .dashboard import AppointmentSummary, FeedbackSummary
from .flags import (
    FlagCreate,
    FlagResponse,
    FlagUpdate,
    FlagsBulkCloseRequest,
    FlagsBulkTagRequest,
    FlagsSummary,
)
from .users import (
    UserDetailResponse,
    UserListItem,
    UserStats,
    UsersResponse,
)

__all__ = [
    "AnalyticsResponse",
    "AppointmentResponse",
    "AppointmentSummary",
    "AppointmentUpdate",
    "ContentResourceBase",
    "ContentResourceCreate",
    "ContentResourceItem",
    "ContentResourceResponse",
    "ConversationDetailResponse",
    "ConversationListItem",
    "ConversationStats",
    "ConversationsResponse",
    "FlagCreate",
    "FlagResponse",
    "FlagUpdate",
    "FlagsBulkCloseRequest",
    "FlagsBulkTagRequest",
    "FlagsSummary",
    "FeedbackSummary",
    "PsychologistResponse",
    "SessionDetailResponse",
    "SessionListItem",
    "SessionListResponse",
    "SessionUser",
    "TherapistScheduleCreate",
    "TherapistScheduleResponse",
    "TherapistScheduleUpdate",
    "UserDetailResponse",
    "UserListItem",
    "UserStats",
    "UsersResponse",
]
