"""Phase 1b unit tests: weekly self-report check-in eligibility + wiring."""
from __future__ import annotations

import pytest

from app.models import User
from app.models.proactive_message import ProactiveMessageSource
from app.services.self_report_checkin_service import (
    build_checkin_message,
    should_send_checkin,
)


@pytest.mark.unit
def test_should_send_checkin_happy_path() -> None:
    assert should_send_checkin(
        consent=True,
        is_active=True,
        has_recent_prompt=False,
        has_recent_self_report=False,
    )


@pytest.mark.unit
@pytest.mark.parametrize(
    "consent,is_active,has_recent_prompt,has_recent_self_report",
    [
        (False, True, False, False),   # no consent
        (True, False, False, False),   # inactive account
        (True, True, True, False),     # already prompted this week
        (True, True, False, True),     # already self-reported this week
        (True, True, True, True),
    ],
)
def test_should_send_checkin_skips(
    consent: bool,
    is_active: bool,
    has_recent_prompt: bool,
    has_recent_self_report: bool,
) -> None:
    assert not should_send_checkin(
        consent=consent,
        is_active=is_active,
        has_recent_prompt=has_recent_prompt,
        has_recent_self_report=has_recent_self_report,
    )


@pytest.mark.unit
def test_checkin_message_is_present() -> None:
    message = build_checkin_message()
    assert isinstance(message, str)
    assert len(message) > 20


@pytest.mark.unit
def test_self_report_checkin_source_exists() -> None:
    assert ProactiveMessageSource.self_report_checkin.value == "self_report_checkin"
    assert ProactiveMessageSource.plan_followup.value == "plan_followup"


@pytest.mark.unit
def test_user_has_self_report_consent_flag() -> None:
    assert hasattr(User, "consent_self_report")
