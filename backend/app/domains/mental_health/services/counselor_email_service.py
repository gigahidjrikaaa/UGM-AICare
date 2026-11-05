"""Counselor outbound email service.

Lets counselors send templated, brand-styled emails to students in their
caseload directly from the counselor portal. Every send is:

- **scope-checked** — the target student must be in the counselor's caseload
  (the same conversation-scope definition the rest of the portal uses);
- **logged** — an audit row (who, to whom, which template, when, outcome) is
  persisted; the custom message body is stored redacted;
- **rate-limited** — per-counselor daily cap prevents the portal becoming a
  bulk-mail surface (bulk outreach belongs to admin campaigns);
- **consent-aware** — the send records whether the student had opted into
  email contact, and surfaces that in the result so the UI can warn.

Peer supporters deliberately do NOT get this channel: they are students, and
direct email to peers would bypass the moderated in-app chat + supervision
model. Their channel is the in-app peer thread.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app.core.redaction import sanitize_text
from app.utils.email_utils import send_email

logger = logging.getLogger(__name__)

DAILY_LIMIT_PER_COUNSELOR = 30

PREVIEW_DISCLAIMER = (
    "Pratinjau — pesan ini BELUM terkirim. Student menerima versi ber-brand "
    "dengan alamat balasan yang masuk kembali ke thread AICare."
)


@dataclass(frozen=True)
class EmailTemplate:
    key: str
    label: str
    label_id: str
    description: str
    default_subject_id: str
    default_body_id: str
    supports_custom_message: bool = True


_TEMPLATES: Dict[str, EmailTemplate] = {
    t.key: t
    for t in (
        EmailTemplate(
            key="session_reminder",
            label="Session reminder",
            label_id="Pengingat sesi",
            description="Remind the student about an upcoming counseling session.",
            default_subject_id="Pengingat Sesi AICare",
            default_body_id=(
                "Halo {student_name},\n\n"
                "Ini pengingat dari {counselor_name} untuk sesi konseling terjadwal kita. "
                "Sampai jumpa di jadwal yang sudah disepakati — jangan ragu menghubungi "
                "aku jika perlu menyesuaikan waktu.\n\n"
                "{custom_message}"
            ),
        ),
        EmailTemplate(
            key="follow_up",
            label="Follow-up",
            label_id="Tindak lanjut",
            description="Check in after a session or conversation.",
            default_subject_id="Tindak Lanjut dari {counselor_name}",
            default_body_id=(
                "Halo {student_name},\n\n"
                "{counselor_name} di sini. Aku ingin menindaklanjuti percakapan kita "
                "terakhir — bagaimana kabarmu sekarang?\n\n"
                "{custom_message}"
            ),
        ),
        EmailTemplate(
            key="resource_share",
            label="Resource share",
            label_id="Berbagi resources",
            description="Share helpful resources or materials.",
            default_subject_id="Resources untukmu dari {counselor_name}",
            default_body_id=(
                "Halo {student_name},\n\n"
                "{counselor_name} membagikan beberapa resources yang mungkin membantu:\n\n"
                "{custom_message}"
            ),
        ),
        EmailTemplate(
            key="custom",
            label="Custom message",
            label_id="Pesan khusus",
            description="Write a free-form message (subject + body required).",
            default_subject_id="Pesan dari {counselor_name}",
            default_body_id="{custom_message}",
        ),
    )
}


def list_templates() -> List[EmailTemplate]:
    return list(_TEMPLATES.values())


def get_template(key: str) -> EmailTemplate:
    template = _TEMPLATES.get(key.strip().lower())
    if template is None:
        raise KeyError(f"Unknown email template: {key!r}")
    return template


def render_email(
    template: EmailTemplate,
    *,
    counselor_name: str,
    student_name: str,
    custom_message: str = "",
) -> Dict[str, str]:
    """Render subject/body from the template. Pure; raises ValueError when a
    custom-only template receives no message."""
    custom = (custom_message or "").strip()
    if template.key == "custom" and not custom:
        raise ValueError("Custom messages require message content")

    body = template.default_body_id.format(
        counselor_name=counselor_name,
        student_name=student_name,
        custom_message=custom,
    )
    subject = template.default_subject_id.format(counselor_name=counselor_name)
    return {"subject": subject, "body": body}


def _wrap_branded_html(greeting_name: str, body_lines: List[str], footer_note: str) -> str:
    """Brand-styled HTML matching the system password-reset emails."""
    body_html = "".join(f"<p style='margin: 0 0 12px 0;'>{line}</p>" for line in body_lines)
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>UGM AICare</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f4f6fa;">
      <div class="container" style="max-width: 600px; margin: 0 auto; padding: 0;">
        <div class="header" style="background: linear-gradient(135deg, #001D58 0%, #003875 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">🕊️ UGM AICare</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.85;">Your Mental Health Companion</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 16px 0; font-weight: bold;">Halo {greeting_name},</p>
          {body_html}
          <p style="margin: 24px 0 0;">
            <a href="https://ugm-aicare.com" style="display: inline-block; background: #FFCA40; color: #001D58; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Buka AICare</a>
          </p>
        </div>
        <div class="footer" style="text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding: 0 20px 10px;">
          <p style="margin: 8px 0;">{footer_note}</p>
          <p style="margin: 8px 0;">Keadaan darurat: SEJIWA 119 tekan 8 (24 jam) · Crisis Centre UGM 0851-0111-0800</p>
        </div>
      </div>
    </body>
    </html>
    """


def build_branded_email(
    template: EmailTemplate,
    *,
    counselor_name: str,
    student_name: str,
    custom_message: str = "",
) -> Dict[str, str]:
    """Render subject + branded HTML + plain-text alternative."""
    rendered = render_email(
        template,
        counselor_name=counselor_name,
        student_name=student_name,
        custom_message=custom_message,
    )

    paragraphs = [
        line.strip() or "&nbsp;"
        for line in rendered["body"].split("\n")
        if line.strip() or line.strip() == ""
    ]
    html = _wrap_branded_html(
        student_name,
        paragraphs,
        footer_note=(
            f"Pesan ini dikirim oleh {counselor_name} melalui UGM AICare. "
            "Balas melalui fitur pesan di aplikasi bila memungkinkan."
        ),
    )
    plain = rendered["body"]

    return {
        "subject": rendered["subject"],
        "html": html,
        "plain": plain,
    }


# ---------------------------------------------------------------------------
# DB-facing send pipeline (scope check → render → send → audit)
# ---------------------------------------------------------------------------

async def send_student_email(
    db,
    *,
    counselor_user,
    student_user_id: int,
    template_key: str,
    custom_message: str = "",
) -> Dict[str, Any]:
    """Scope-check, render, send, and audit a counselor → student email.

    Raises ``PermissionError`` when the student is outside the counselor's
    caseload and ``RuntimeError`` when the daily cap is reached.
    Returns a result dict (delivered, student_email_opt_in, ...).
    """
    from datetime import datetime as _dt

    from sqlalchemy import func, select

    from app.core.redaction import prelog_redact
    from app.domains.mental_health.models import CounselorEmailLog
    from app.models.user import User
    from app.domains.mental_health.services.counselor_scope import (
        get_counselor_conversation_scope as _scope_impl,
    )
    # Module-level alias so tests can monkeypatch the scope lookup.
    get_counselor_conversation_scope = _scope_impl

    # 1. Resolve the student + their consent/opt-in state.
    student = (
        await db.execute(select(User).where(User.id == student_user_id))
    ).scalar_one_or_none()
    if student is None:
        raise ValueError("Student not found")

    student_email = (student.email or "").strip()
    if not student_email:
        raise ValueError("Student does not have an email address on file")

    # 2. Caseload scope: the counselor must have an assigned case linking
    #    them to this student (closed cases stay in scope — history).
    from app.domains.mental_health.models import Counselor as CounselorProfile

    counselor_profile = (
        await db.execute(
            select(CounselorProfile).where(CounselorProfile.user_id == counselor_user.id)
        )
    ).scalar_one_or_none()
    if counselor_profile is None:
        raise PermissionError("Counselor profile not found")

    _, scoped_user_ids = await get_counselor_conversation_scope(db, counselor_profile)
    if student_user_id not in scoped_user_ids:
        raise PermissionError("Student is not in your caseload")

    # 3. Daily cap (bulk outreach belongs to admin campaigns, not here) —
    #    checked before any thread row is created.
    day_ago = _dt.now(timezone.utc) - timedelta(hours=24)
    sent_today = int(
        await db.scalar(
            select(func.count(CounselorEmailLog.id)).where(
                CounselorEmailLog.counselor_user_id == counselor_user.id,
                CounselorEmailLog.created_at >= day_ago,
            )
        )
        or 0
    )
    if sent_today >= DAILY_LIMIT_PER_COUNSELOR:
        raise RuntimeError(
            f"Daily email limit reached ({DAILY_LIMIT_PER_COUNSELOR}/24h). Try again tomorrow."
        )

    # 2b. Resolve (or lazily create) the counselor↔student thread so the
    #     email carries a working Reply-To back into the AICare thread.
    from app.domains.mental_health.services.peer_support_service import (
        get_or_create_counselor_thread as _get_or_create_thread,
    )
    from app.domains.mental_health.services.counselor_email_service import (
        reply_address_for_thread as _reply_address,
    )

    thread = await _get_or_create_thread(
        db, student=student, counselor_profile_id=counselor_profile.id
    )
    reply_to = _reply_address(thread.id)

    # 4. Render + send off the event loop. DB template wins over code default.
    template = await resolve_template_from_db(db, template_key)
    if template is None:
        template = get_template(template_key)
    counselor_name = counselor_user.name or "Your counselor"
    student_name = student.name or "Student"
    rendered = build_branded_email(
        template,
        counselor_name=counselor_name,
        student_name=student_name,
        custom_message=custom_message,
    )

    delivered = await asyncio.to_thread(
        send_email,
        recipient_email=student_email,
        subject=rendered["subject"],
        html_content=rendered["html"],
        reply_to=reply_to,
    )

    log = CounselorEmailLog(
        counselor_user_id=counselor_user.id,
        student_user_id=student.id,
        template_key=template.key,
        subject=rendered["subject"],
        message_redacted=prelog_redact(custom_message) if custom_message else None,
        status="sent" if delivered else "failed",
        error_reason=None if delivered else "SMTP delivery failed (see server logs)",
        student_email_opt_in=bool(student.allow_email_checkins),
    )
    db.add(log)
    await db.commit()

    logger.info(
        "Counselor email: counselor=%s student=%s template=%s delivered=%s",
        counselor_user.id,
        student.id,
        template.key,
        delivered,
    )

    return {
        "delivered": delivered,
        "template": template.key,
        "template_label": template.label_id,
        "subject": rendered["subject"],
        "student_email_opt_in": bool(student.allow_email_checkins),
        "sent_today": sent_today + 1,
        "daily_limit": DAILY_LIMIT_PER_COUNSELOR,
        "thread_id": thread.id,
    }


# ---------------------------------------------------------------------------
# DB-backed templates (admin-editable) — DB rows override code defaults
# ---------------------------------------------------------------------------

def _db_row_to_template(row) -> EmailTemplate:
    return EmailTemplate(
        key=row.key,
        label=row.label,
        label_id=row.label,
        description=row.description or "",
        default_subject_id=row.subject,
        default_body_id=row.body_text,
    )


async def resolve_templates_from_db(db) -> List[EmailTemplate]:
    """Active templates from the DB (admin-editable), ordered by sort_order.
    Falls back to the code defaults when the table is empty."""
    from app.domains.mental_health.models import EmailTemplate

    rows = (
        await db.execute(
            select(EmailTemplate)
            .where(EmailTemplate.is_active == True)  # noqa: E712
            .order_by(EmailTemplate.sort_order.asc(), EmailTemplate.id.asc())
        )
    ).scalars().all()
    if rows:
        return [_db_row_to_template(row) for row in rows]
    return list_templates()


async def resolve_template_from_db(db, key: str) -> Optional[EmailTemplate]:
    normalized = key.strip().lower()
    for template in await resolve_templates_from_db(db):
        if template.key == normalized:
            return template
    return None


# ---------------------------------------------------------------------------
# Admin CRUD (email_templates table)
# ---------------------------------------------------------------------------

async def admin_list_templates(db) -> List[Any]:
    from app.domains.mental_health.models import EmailTemplate

    rows = (
        await db.execute(
            select(EmailTemplate).order_by(EmailTemplate.sort_order.asc(), EmailTemplate.id.asc())
        )
    ).scalars().all()
    return list(rows)


async def admin_get_template(db, template_id: int):
    from app.domains.mental_health.models import EmailTemplate

    row = (
        await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    ).scalar_one_or_none()
    if row is None:
        raise KeyError(f"Email template {template_id} not found")
    return row


async def admin_create_template(db, *, key: str, label: str, subject: str, body_text: str,
                                 description: str = "", sort_order: int = 0,
                                 updated_by: Optional[int] = None):
    from app.domains.mental_health.models import EmailTemplate

    normalized = key.strip().lower()
    if get_template_safe(normalized) is not None or (await _key_exists(db, normalized)):
        raise ValueError(f"Template key already exists: {normalized}")

    row = EmailTemplate(
        key=normalized,
        label=label.strip() or normalized,
        description=description.strip() or None,
        subject=subject.strip(),
        body_text=body_text,
        is_active=True,
        sort_order=sort_order,
        updated_by=updated_by,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def admin_update_template(db, template_id: int, *, label: Optional[str] = None,
                                subject: Optional[str] = None, body_text: Optional[str] = None,
                                description: Optional[str] = None, is_active: Optional[bool] = None,
                                sort_order: Optional[int] = None, updated_by: Optional[int] = None):
    from app.domains.mental_health.models import EmailTemplate

    row = (
        await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    ).scalar_one_or_none()
    if row is None:
        raise KeyError(f"Email template {template_id} not found")

    for field, value in (
        ("label", label),
        ("subject", subject),
        ("body_text", body_text),
        ("description", description),
        ("is_active", is_active),
        ("sort_order", sort_order),
    ):
        if value is not None:
            setattr(row, field, value)
    row.updated_by = updated_by
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def admin_delete_template(db, template_id: int) -> None:
    from app.domains.mental_health.models import EmailTemplate

    row = (
        await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    ).scalar_one_or_none()
    if row is None:
        raise KeyError(f"Email template {template_id} not found")
    await db.delete(row)
    await db.commit()


def get_template_safe(key: str):
    """Non-raising lookup across code defaults (DB resolution is async)."""
    return _TEMPLATES.get(key.strip().lower())


async def _key_exists(db, normalized_key: str) -> bool:
    from app.domains.mental_health.models import EmailTemplate

    row = (
        await db.execute(
            select(EmailTemplate.id).where(EmailTemplate.key == normalized_key).limit(1)
        )
    ).scalar_one_or_none()
    return row is not None


async def build_preview(
    db,
    *,
    counselor_name: str,
    student_name: str,
    template_key: str,
    custom_message: str = "",
) -> Dict[str, str]:
    """Render a template for preview WITHOUT sending. DB-backed template."""
    template = await resolve_template_from_db(db, template_key)
    if template is None:
        template = get_template(template_key)
    rendered = render_email(
        template,
        counselor_name=counselor_name,
        student_name=student_name,
        custom_message=custom_message,
    )
    branded = build_branded_email(
        template,
        counselor_name=counselor_name,
        student_name=student_name,
        custom_message=custom_message,
    )
    return {
        "template": template.key,
        "label": template.label_id,
        "subject": rendered["subject"],
        "html": branded["html"],
        "plain": branded["plain"],
        "disclaimer": PREVIEW_DISCLAIMER,
    }


# ---------------------------------------------------------------------------
# Two-way replies: reply-token addressing + inbound processing
# ---------------------------------------------------------------------------

def reply_address_for_thread(thread_id: int) -> str:
    """Stateless per-thread reply address: reply+{id}.{sig}@{domain}.

    The signature is an HMAC of the thread id so forged addresses bounce at
    the webhook without a DB lookup."""
    import hashlib
    import hmac as hmac_mod
    import os

    from app.core.settings import settings

    key = settings.inbound_email_webhook_secret or settings.jwt_secret_key
    sig = hmac_mod.new(key.encode(), f"counseling:{thread_id}".encode(), hashlib.sha256).hexdigest()[:16]
    domain = settings.inbound_email_reply_domain
    return f"reply+{thread_id}.{sig}@{domain}"


def verify_reply_address(address: str) -> Optional[int]:
    """Extract + verify the thread id from a reply address. None = forged/unknown."""
    import hashlib
    import hmac as hmac_mod
    import re

    from app.core.settings import settings

    match = re.match(r"reply\+(\d+)\.([0-9a-f]{16})@", (address or "").strip().lower())
    if not match:
        return None
    thread_id = int(match.group(1))
    sig = match.group(2)
    key = settings.inbound_email_webhook_secret or settings.jwt_secret_key
    expected = hmac_mod.new(
        key.encode(), f"counseling:{thread_id}".encode(), hashlib.sha256
    ).hexdigest()[:16]
    if not hmac_mod.compare_digest(sig, expected):
        return None
    return thread_id
