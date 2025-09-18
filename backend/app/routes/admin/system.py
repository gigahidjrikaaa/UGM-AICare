"""System settings endpoints for the admin panel."""
from __future__ import annotations

import os
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.schemas.admin.system import (
    SystemSettingItem,
    SystemSettingsCategory,
    SystemSettingsResponse,
)

router = APIRouter(prefix="/system", tags=["Admin - System Settings"])


def _mask_secret(value: str | None) -> str:
    if not value:
        return "(not set)"
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}***{value[-4:]}"


@router.get("/settings", response_model=SystemSettingsResponse)
async def get_system_settings(
    db: AsyncSession = Depends(get_async_db),
    admin_user=Depends(get_admin_user),
) -> SystemSettingsResponse:
    """Return curated system configuration for the admin UI."""

    app_env = os.getenv("APP_ENV", "development")
    database_url = os.getenv("DATABASE_URL", "(not configured)")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    smtp_host = os.getenv("SMTP_HOST")

    appearance = SystemSettingsCategory(
        id="appearance",
        title="Appearance",
        description="Visual preferences applied across the admin workspace.",
        settings=[
            SystemSettingItem(
                key="theme_mode",
                label="Theme",
                value="Dark",
                type="option",
                editable=False,
                pending=True,
                help_text="Allows admins to switch between light and dark UI themes.",
            ),
            SystemSettingItem(
                key="accent_colour",
                label="Accent colour",
                value="#FFCA40",
                type="color",
                editable=False,
                pending=True,
                help_text="Used for primary call-to-action buttons and status badges.",
            ),
            SystemSettingItem(
                key="density",
                label="Navigation density",
                value="Comfortable",
                type="option",
                editable=False,
                pending=True,
            ),
        ],
    )

    collaboration = SystemSettingsCategory(
        id="collaboration",
        title="Team collaboration",
        description="Controls for human-in-the-loop workflows and shared context.",
        settings=[
            SystemSettingItem(
                key="review_mode",
                label="Require dual approval for interventions",
                value=True,
                type="toggle",
                editable=False,
                pending=True,
                help_text="When enabled, two admins must approve a manual intervention before sending.",
            ),
            SystemSettingItem(
                key="notes_visibility",
                label="Share reviewer notes",
                value="Counsellors",
                type="option",
                editable=False,
                pending=True,
                help_text="Determines which roles can view human reviewer notes in the queue.",
            ),
            SystemSettingItem(
                key="escalation_playbook",
                label="Escalation playbook",
                value="settings not yet implemented",
                type="alert",
                editable=False,
                pending=True,
            ),
        ],
    )

    notifications = SystemSettingsCategory(
        id="notifications",
        title="Notifications",
        description="Delivery channels for admin alerts and weekly summaries.",
        settings=[
            SystemSettingItem(
                key="weekly_digest",
                label="Weekly wellbeing digest",
                value=True,
                type="toggle",
                editable=False,
                pending=True,
            ),
            SystemSettingItem(
                key="queue_alerts",
                label="Queue alerts",
                value="Email",
                type="option",
                editable=False,
                pending=True,
                help_text="Preferred channel for urgent manual review notifications.",
            ),
            SystemSettingItem(
                key="incident_webhook",
                label="Incident webhook",
                value="settings not yet implemented",
                type="alert",
                editable=False,
                pending=True,
            ),
        ],
    )

    infrastructure = SystemSettingsCategory(
        id="infrastructure",
        title="Infrastructure",
        description="Environment metadata and critical integration keys.",
        settings=[
            SystemSettingItem(
                key="environment",
                label="Environment",
                value=app_env,
                type="badge",
                editable=False,
            ),
            SystemSettingItem(
                key="database_url",
                label="Database URL",
                value=_mask_secret(database_url),
                type="masked",
                editable=False,
            ),
            SystemSettingItem(
                key="openai_api_key",
                label="OpenAI API key",
                value=_mask_secret(openai_api_key),
                type="masked",
                editable=False,
            ),
            SystemSettingItem(
                key="smtp_host",
                label="SMTP host",
                value=smtp_host or "(not configured)",
                type="text",
                editable=False,
            ),
        ],
    )

    categories: List[SystemSettingsCategory] = [
        appearance,
        collaboration,
        notifications,
        infrastructure,
    ]

    return SystemSettingsResponse(
        generated_at=datetime.utcnow(),
        categories=categories,
    )
