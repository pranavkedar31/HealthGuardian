"""
Redis-backed sliding-window rate limiting middleware. If Redis is
unreachable, requests are allowed through (fail-open) so the app stays
usable in dev/test environments without Redis running.
"""
import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._redis = None
        if settings.RATE_LIMIT_ENABLED:
            try:
                import redis

                self._redis = redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
                self._redis.ping()
            except Exception:
                self._redis = None

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED or self._redis is None:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{client_ip}:{int(time.time() // settings.RATE_LIMIT_WINDOW_SECONDS)}"

        try:
            count = self._redis.incr(key)
            if count == 1:
                self._redis.expire(key, settings.RATE_LIMIT_WINDOW_SECONDS)
            if count > settings.RATE_LIMIT_REQUESTS:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Please try again shortly."},
                )
        except Exception:
            pass  # fail-open on Redis errors

        return await call_next(request)
