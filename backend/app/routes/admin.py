"""Admin route aggregator."""
from fastapi import APIRouter

from app.routes.admin.analytics import router as analytics_router
from app.routes.admin.appointments import router as appointments_router
from app.routes.admin.content_resources import router as content_resources_router
from app.routes.admin.conversations import router as conversations_router
from app.routes.admin.dashboard import router as dashboard_router
from app.routes.admin.flags import router as flags_router
from app.routes.admin.users import router as users_router

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
)

router.include_router(analytics_router)
router.include_router(appointments_router)
router.include_router(content_resources_router)
router.include_router(conversations_router)
router.include_router(dashboard_router)
router.include_router(flags_router)
router.include_router(users_router)
