"""add notification settings to medicine reminders

Revision ID: 0003_reminder_notifications
Revises: 0002_password_reset_tokens
Create Date: 2026-09-19
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_reminder_notifications"
down_revision = "0002_password_reset_tokens"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "medicine_reminders",
        sa.Column(
            "notification_method",
            sa.String(length=20),
            nullable=False,
            server_default="browser",
        ),
    )

    op.add_column(
        "medicine_reminders",
        sa.Column(
            "last_notified_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column(
        "medicine_reminders",
        "last_notified_at",
    )

    op.drop_column(
        "medicine_reminders",
        "notification_method",
    )