"""Admin sub-route package."""
from fastapi import APIRouter

from .analytics import router as analytics_router
from .appointments import router as appointments_router
from .content_resources import router as content_resources_router
from .conversations import router as conversations_router
from .dashboard import router as dashboard_router
from .flags import router as flags_router
from .interventions import router as interventions_router
from .profile import router as profile_router
from .system import router as system_router
from .triage import router as triage_router
from .users import router as users_router

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])
router.include_router(analytics_router)
router.include_router(appointments_router)
router.include_router(content_resources_router)
router.include_router(conversations_router)
router.include_router(dashboard_router)
router.include_router(flags_router)
router.include_router(interventions_router)
router.include_router(profile_router)
router.include_router(system_router)
router.include_router(triage_router)
router.include_router(users_router)

__all__ = [
    "router",
    "analytics",
    "appointments",
    "content_resources",
    "conversations",
    "dashboard",
    "flags",
    "interventions",
    "profile",
    "system",
    "triage",
    "users",
]
