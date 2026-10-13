"""
Cross-database compatible column types.

Why this exists: the models use PostgreSQL-native UUID and ARRAY column
types (correct and desired for production on Neon/Postgres). But the
pytest suite runs against SQLite for speed/isolation and SQLite has
neither type natively. Rather than maintain two sets of models, these
TypeDecorators detect the dialect at runtime: native UUID/ARRAY on
PostgreSQL, transparent CHAR(36)/JSON-encoded fallback on SQLite.

This is the standard SQLAlchemy pattern for dialect-portable models.
"""
import json
import uuid

from sqlalchemy import CHAR, JSON, String, TypeDecorator
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class GUID(TypeDecorator):
    """Platform-independent UUID type.

    Uses PostgreSQL's native UUID type when available, otherwise stores
    as a stringified CHAR(36), converting to/from Python uuid.UUID.
    """

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return str(value)
        if not isinstance(value, uuid.UUID):
            return str(uuid.UUID(value))
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


class StringArray(TypeDecorator):
    """Platform-independent array-of-strings type.

    Uses PostgreSQL's native ARRAY(String) when available, otherwise
    stores as a JSON-encoded string on SQLite/other dialects.
    """

    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_ARRAY(String))
        return dialect.type_descriptor(JSON)

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return value
        return list(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return value
        return list(value) if isinstance(value, list) else json.loads(value)
