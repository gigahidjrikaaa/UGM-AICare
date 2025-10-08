"""Admin sub-route package."""

from fastapi import APIRouter

from .appointments import router as appointments_router
from .content_resources import router as content_resources_router
from .conversations import router as conversations_router
from .flags import router as flags_router
from .profile import router as profile_router
from .system import router as system_router
from .users import router as users_router

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])
router.include_router(appointments_router)
router.include_router(content_resources_router)
router.include_router(conversations_router)
router.include_router(flags_router)
router.include_router(profile_router)
router.include_router(system_router)
router.include_router(users_router)

__all__ = [
    "router",
    "appointments",
    "content_resources",
    "conversations",
    "flags",
    "profile",
    "system",
    "users",
]
