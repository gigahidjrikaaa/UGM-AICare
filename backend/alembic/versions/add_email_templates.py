"""Email templates table + seed of the four program defaults.

Revision ID: add_email_templates
Revises: add_counselor_emails
Create Date: 2026-09-18

Seeds match the code-defined defaults in counselor_email_service so the admin
editor starts from the same texts. Templates are admin-editable afterwards;
the counselor compose flow resolves DB rows first and falls back to the code
defaults only when a key is missing.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = "add_email_templates"
down_revision = "add_counselor_emails"
branch_labels = None
depends_on = None

SEED_TEMPLATES = [
    (
        "session_reminder",
        "Pengingat sesi",
        "Remind the student about an upcoming counseling session.",
        "Pengingat Sesi AICare",
        "Halo {student_name},\n\nIni pengingat dari {counselor_name} untuk sesi konseling terjadwal kita. "
        "Sampai jumpa di jadwal yang sudah disepakati — jangan ragu menghubungi aku jika perlu "
        "menyesuaikan waktu.\n\n{custom_message}",
        1,
    ),
    (
        "follow_up",
        "Tindak lanjut",
        "Check in after a session or conversation.",
        "Tindak Lanjut dari {counselor_name}",
        "Halo {student_name},\n\n{counselor_name} di sini. Aku ingin menindaklanjuti percakapan kita "
        "terakhir — bagaimana kabarmu sekarang?\n\n{custom_message}",
        2,
    ),
    (
        "resource_share",
        "Berbagi resources",
        "Share helpful resources or materials.",
        "Resources untukmu dari {counselor_name}",
        "Halo {student_name},\n\n{counselor_name} membagikan beberapa resources yang mungkin membantu:\n\n"
        "{custom_message}",
        3,
    ),
    (
        "custom",
        "Pesan khusus",
        "Write a free-form message (subject + body required).",
        "Pesan dari {counselor_name}",
        "{custom_message}",
        4,
    ),
]


def _table_exists(table_name: str) -> bool:
    inspector = Inspector.from_engine(op.get_bind())
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not _table_exists("email_templates"):
        op.create_table(
            "email_templates",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("key", sa.String(length=50), nullable=False, unique=True),
            sa.Column("label", sa.String(length=120), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("subject", sa.String(length=255), nullable=False),
            sa.Column("body_text", sa.Text(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )

    bind = op.get_bind()
    for key, label, description, subject, body, sort_order in SEED_TEMPLATES:
        bind.execute(
            sa.text(
                "INSERT INTO email_templates (key, label, description, subject, body_text, is_active, sort_order) "
                "SELECT CAST(:key AS VARCHAR), CAST(:label AS VARCHAR), CAST(:description AS VARCHAR), "
                "CAST(:subject AS VARCHAR), CAST(:body AS VARCHAR), true, CAST(:sort AS INTEGER) "
                "WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE key = CAST(:key AS VARCHAR))"
            ),
            {
                "key": key,
                "label": label,
                "description": description,
                "subject": subject,
                "body": body,
                "sort": sort_order,
            },
        )


def downgrade() -> None:
    if _table_exists("email_templates"):
        op.drop_table("email_templates")
