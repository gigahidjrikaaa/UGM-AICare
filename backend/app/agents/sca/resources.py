from __future__ import annotations

from typing import Iterable

from app.agents.sca.schemas import ResourceCard


def get_default_resources(intent: str) -> Iterable[ResourceCard]:
    """Return static resource cards until dynamic lookup is wired."""

    raise NotImplementedError("get_default_resources is pending implementation")
