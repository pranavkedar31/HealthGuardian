"""initial schema - 11 tables, 2 enum types

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-26 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enum types are created explicitly with checkfirst=True below, and then
# referenced in column definitions with create_type=False. This avoids
# SQLAlchemy emitting a second, duplicate CREATE TYPE statement when the
# enum is first used in a column (a real bug hit during hand-authoring —
# rendering to PostgreSQL DDL in offline mode surfaced it).
user_role_enum = postgresql.ENUM("patient", "doctor", "admin", name="user_role")
appointment_status_enum = postgresql.ENUM(
    "pending", "confirmed", "cancelled", "completed", name="appointment_status"
)


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    appointment_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column(
            "role",
            postgresql.ENUM("patient", "doctor", "admin", name="user_role", create_type=False),
            nullable=False,
            server_default="patient",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "health_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("gender", sa.String(20), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("blood_group", sa.String(5), nullable=True),
        sa.Column("allergies", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("chronic_conditions", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("smoking", sa.Boolean(), nullable=True),
        sa.Column("alcohol", sa.Boolean(), nullable=True),
    )
    op.create_index("ix_health_profiles_id", "health_profiles", ["id"])

    op.create_table(
        "vitals_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("heart_rate", sa.Float(), nullable=True),
        sa.Column("blood_pressure_systolic", sa.Float(), nullable=True),
        sa.Column("blood_pressure_diastolic", sa.Float(), nullable=True),
        sa.Column("blood_sugar", sa.Float(), nullable=True),
        sa.Column("spo2", sa.Float(), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_vitals_logs_id", "vitals_logs", ["id"])
    op.create_index("ix_vitals_logs_user_id", "vitals_logs", ["user_id"])

    op.create_table(
        "symptom_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("symptoms", postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("predicted_condition", sa.String(255), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("severity", sa.String(20), nullable=True),
    )
    op.create_index("ix_symptom_logs_id", "symptom_logs", ["id"])
    op.create_index("ix_symptom_logs_user_id", "symptom_logs", ["user_id"])

    op.create_table(
        "medical_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("report_type", sa.String(50), nullable=True),
    )
    op.create_index("ix_medical_reports_id", "medical_reports", ["id"])
    op.create_index("ix_medical_reports_user_id", "medical_reports", ["user_id"])

    op.create_table(
        "diet_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("goal", sa.String(50), nullable=True),
        sa.Column("daily_calories", sa.Integer(), nullable=True),
        sa.Column("meals", sa.JSON(), nullable=True),
    )
    op.create_index("ix_diet_plans_id", "diet_plans", ["id"])
    op.create_index("ix_diet_plans_user_id", "diet_plans", ["user_id"])

    op.create_table(
        "workout_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("goal", sa.String(50), nullable=True),
        sa.Column("difficulty", sa.String(20), nullable=True),
        sa.Column("days_per_week", sa.Integer(), nullable=True),
        sa.Column("schedule", sa.JSON(), nullable=True),
    )
    op.create_index("ix_workout_plans_id", "workout_plans", ["id"])
    op.create_index("ix_workout_plans_user_id", "workout_plans", ["user_id"])

    op.create_table(
        "medicine_reminders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("medicine_name", sa.String(150), nullable=False),
        sa.Column("dosage", sa.String(50), nullable=True),
        sa.Column("reminder_time", sa.Time(), nullable=False),
        sa.Column("frequency", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_medicine_reminders_id", "medicine_reminders", ["id"])
    op.create_index("ix_medicine_reminders_user_id", "medicine_reminders", ["user_id"])

    op.create_table(
        "appointments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "pending", "confirmed", "cancelled", "completed", name="appointment_status", create_type=False
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("reason", sa.Text(), nullable=True),
    )
    op.create_index("ix_appointments_id", "appointments", ["id"])
    op.create_index("ix_appointments_patient_id", "appointments", ["patient_id"])
    op.create_index("ix_appointments_doctor_id", "appointments", ["doctor_id"])

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_from_user", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_chat_messages_id", "chat_messages", ["id"])
    op.create_index("ix_chat_messages_user_id", "chat_messages", ["user_id"])

    op.create_table(
        "ai_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("module", sa.String(50), nullable=False),
        sa.Column("input_payload", sa.JSON(), nullable=True),
        sa.Column("output_payload", sa.JSON(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_ai_logs_id", "ai_logs", ["id"])
    op.create_index("ix_ai_logs_user_id", "ai_logs", ["user_id"])


def downgrade() -> None:
    op.drop_table("ai_logs")
    op.drop_table("chat_messages")
    op.drop_table("appointments")
    op.drop_table("medicine_reminders")
    op.drop_table("workout_plans")
    op.drop_table("diet_plans")
    op.drop_table("medical_reports")
    op.drop_table("symptom_logs")
    op.drop_table("vitals_logs")
    op.drop_table("health_profiles")
    op.drop_table("users")

    bind = op.get_bind()
    appointment_status_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)
