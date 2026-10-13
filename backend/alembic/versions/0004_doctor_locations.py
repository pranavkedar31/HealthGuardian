"""add patient/doctor locations, doctor_profiles, notifications

Revision ID: 0004_doctor_locations
Revises: 0003_reminder_notifications
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_doctor_locations"
down_revision: Union[str, None] = "0003_reminder_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_pg = bind.dialect.name == "postgresql"
    uuid_type = postgresql.UUID(as_uuid=True) if is_pg else sa.CHAR(36)

    # 0. Add 'rejected' value to appointment_status enum (PostgreSQL only)
    if is_pg:
        op.execute("ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'rejected'")

    # 1. Add patient location columns to users
    op.add_column("users", sa.Column("location_area", sa.String(120), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("state", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("pincode", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("longitude", sa.Float(), nullable=True))

    # 2. Create doctor_profiles table
    op.create_table(
        "doctor_profiles",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("specialization", sa.String(100), nullable=False),
        sa.Column("qualification", sa.String(150), nullable=True),
        sa.Column("experience_years", sa.Integer(), nullable=True),
        sa.Column("hospital_name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(255), nullable=False),
        sa.Column("area", sa.String(120), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(100), nullable=False),
        sa.Column("pincode", sa.String(20), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("consultation_fee", sa.Float(), nullable=True),
        sa.Column("available_days", sa.String(100), nullable=True, server_default="Mon,Tue,Wed,Thu,Fri,Sat"),
        sa.Column("available_time_start", sa.String(10), nullable=True, server_default="09:00"),
        sa.Column("available_time_end", sa.String(10), nullable=True, server_default="18:00"),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("profile_image", sa.String(255), nullable=True),
    )
    op.create_index("ix_doctor_profiles_id", "doctor_profiles", ["id"])
    op.create_index("ix_doctor_profiles_user_id", "doctor_profiles", ["user_id"])
    op.create_index("ix_doctor_profiles_specialization", "doctor_profiles", ["specialization"])
    op.create_index("ix_doctor_profiles_area", "doctor_profiles", ["area"])
    op.create_index("ix_doctor_profiles_city", "doctor_profiles", ["city"])
    op.create_index("ix_doctor_profiles_pincode", "doctor_profiles", ["pincode"])

    # 3. Create notifications table
    op.create_table(
        "notifications",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", sa.String(50), nullable=False, server_default="general"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("link", sa.String(255), nullable=True),
    )
    op.create_index("ix_notifications_id", "notifications", ["id"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", "notifications")
    op.drop_index("ix_notifications_id", "notifications")
    op.drop_table("notifications")

    op.drop_index("ix_doctor_profiles_pincode", "doctor_profiles")
    op.drop_index("ix_doctor_profiles_city", "doctor_profiles")
    op.drop_index("ix_doctor_profiles_area", "doctor_profiles")
    op.drop_index("ix_doctor_profiles_specialization", "doctor_profiles")
    op.drop_index("ix_doctor_profiles_user_id", "doctor_profiles")
    op.drop_index("ix_doctor_profiles_id", "doctor_profiles")
    op.drop_table("doctor_profiles")

    op.drop_column("users", "longitude")
    op.drop_column("users", "latitude")
    op.drop_column("users", "pincode")
    op.drop_column("users", "state")
    op.drop_column("users", "city")
    op.drop_column("users", "location_area")
