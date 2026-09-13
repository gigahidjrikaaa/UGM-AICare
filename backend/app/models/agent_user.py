from __future__ import annotations

import enum

from sqlalchemy import Column, DateTime, Enum, String
from sqlalchemy.sql import func

from app.database import Base


class AgentRoleEnum(str, enum.Enum):
    admin = "admin"
    counselor = "counselor"
    operator = "operator"
    student = "student"


class AgentUser(Base):
    __tablename__ = "agent_users"

    id = Column(String, primary_key=True)
    role = Column(Enum(AgentRoleEnum, name="agent_role_enum"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())



async def ensure_agent_user(
    db, agent_user_id: str, role: AgentRoleEnum = AgentRoleEnum.counselor
) -> AgentUser:
    """Get-or-create the AgentUser shadow row for a case assignee.

    ``Case.assigned_to`` is an FK to ``agent_users.id``, but the platform
    stores *Counselor profile ids* there (see cma_graph's auto-assign).
    Manual assignment paths (admin assign, CMA service) validated against
    this table and 400'd for any counselor who had never been auto-assigned
    before — the shadow row simply didn't exist yet. Call this before
    validating an assignee id.
    """
    from sqlalchemy import select

    existing = (
        await db.execute(select(AgentUser).where(AgentUser.id == agent_user_id))
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    shadow = AgentUser(id=agent_user_id, role=role)
    db.add(shadow)
    await db.flush()
    return shadow
