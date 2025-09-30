"""Admin sub-route package."""
from fastapi import APIRouter

from . import analytics as insights
from .appointments import router as appointments_router
from .content_resources import router as content_resources_router
from .conversations import router as conversations_router
from .dashboard import router as dashboard_router
from .flags import router as flags_router
from . import interventions as safety_coaching
from .profile import router as profile_router
from .system import router as system_router
from . import triage as safety_triage
from .users import router as users_router

analytics = insights
interventions = safety_coaching
triage = safety_triage

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])
router.include_router(insights.router)
router.include_router(appointments_router)
router.include_router(content_resources_router)
router.include_router(conversations_router)
router.include_router(dashboard_router)
router.include_router(flags_router)
router.include_router(safety_coaching.router)
router.include_router(profile_router)
router.include_router(system_router)
router.include_router(safety_triage.router)
router.include_router(users_router)

__all__ = [
    "router",
    "insights",
    "analytics",
    "appointments",
    "content_resources",
    "conversations",
    "dashboard",
    "flags",
    "safety_coaching",
    "interventions",
    "profile",
    "system",
    "safety_triage",
    "triage",
    "users",
]
