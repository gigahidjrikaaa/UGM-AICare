"""Admin sub-route package."""

from fastapi import APIRouter

from .appointments import router as appointments_router
from .content_resources import router as content_resources_router
from .conversations import router as conversations_router
from .flags import router as flags_router
from .profile import router as profile_router
from .dashboard import router as dashboard_router
from .interventions import router as interventions_router
from .cases import router as cases_router
from .counselors import router as counselors_router
from .system import router as system_router
from .users import router as users_router
from .testing import router as testing_router
from .insights import router as insights_router
from .alerts import router as alerts_router
from .sse import router as sse_router
from .campaigns import router as campaigns_router
from .quests import router as quests_router
from .database import router as database_router
from .screening import router as screening_router

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])
router.include_router(appointments_router)
router.include_router(content_resources_router)
router.include_router(conversations_router)
router.include_router(flags_router)
router.include_router(profile_router)
router.include_router(system_router)
router.include_router(users_router)
router.include_router(dashboard_router)
router.include_router(interventions_router)
router.include_router(cases_router)
router.include_router(counselors_router)
router.include_router(testing_router)
router.include_router(insights_router)
router.include_router(alerts_router)
router.include_router(sse_router)
router.include_router(campaigns_router)
router.include_router(quests_router)
router.include_router(database_router)
router.include_router(screening_router)

__all__ = [
    "router",
    "appointments",
    "content_resources",
    "conversations",
    "flags",
    "profile",
    "system",
    "counselors",
    "users",
    "quests",
    "database",
    "screening",
]
