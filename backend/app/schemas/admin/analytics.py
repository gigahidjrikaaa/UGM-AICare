from pydantic import BaseModel

from app.schemas.admin.users import UserStats
from app.schemas.admin.conversations import ConversationStats


class AnalyticsResponse(BaseModel):
    user_stats: UserStats
    conversation_stats: ConversationStats
