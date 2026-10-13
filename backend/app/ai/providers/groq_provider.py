"""
Dedicated Groq AI Provider for HealthGuardian.
Uses Groq SDK with timeout protection, rate-limit recovery, and normalized output.
"""
import concurrent.futures
import logging
from typing import Optional

from app.core.config import settings
from app.ai.providers.base import AIProviderResponse, BaseAIProvider

logger = logging.getLogger("healthguardian.ai.groq")

try:
    from groq import Groq
except ImportError:
    Groq = None


class GroqProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.GROQ_API_KEY
        self._model = model or settings.GROQ_MODEL
        self._timeout = settings.AI_TIMEOUT_SECONDS

    @property
    def name(self) -> str:
        return "groq"

    def is_configured(self) -> bool:
        return bool(self._api_key and self._api_key.strip() and Groq is not None)

    def is_available(self) -> bool:
        return self.is_configured()

    def generate(
        self,
        prompt: str,
        system_instruction: str = "",
        temperature: float = 0.35,
        max_tokens: int = 800,
    ) -> AIProviderResponse:
        if not self.is_configured():
            return AIProviderResponse(
                success=False,
                provider=self.name,
                model=self._model,
                text=None,
                error="Groq provider is not configured (missing GROQ_API_KEY or groq package).",
                is_recoverable=True,
            )

        def _call():
            client = Groq(api_key=self._api_key, timeout=self._timeout)
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            completion = client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return completion

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_call)
                raw_response = future.result(timeout=self._timeout + 2)

            choices = getattr(raw_response, "choices", [])
            if not choices or not choices[0].message.content:
                return AIProviderResponse(
                    success=False,
                    provider=self.name,
                    model=self._model,
                    text=None,
                    error="Groq returned an empty response.",
                    is_recoverable=True,
                )

            text = choices[0].message.content.strip()
            return AIProviderResponse(
                success=True,
                provider=self.name,
                model=self._model,
                text=text,
                error=None,
                is_recoverable=False,
            )

        except concurrent.futures.TimeoutError:
            logger.warning("Groq request timed out after %ds", self._timeout)
            return AIProviderResponse(
                success=False,
                provider=self.name,
                model=self._model,
                text=None,
                error=f"Groq request timed out after {self._timeout}s.",
                is_recoverable=True,
            )
        except Exception as exc:
            err_str = str(exc)
            logger.warning("Groq API error: %s", err_str)
            lower = err_str.lower()
            is_recoverable = (
                "429" in lower
                or "rate" in lower
                or "timeout" in lower
                or "unavailable" in lower
                or "500" in lower
                or "503" in lower
                or "connection" in lower
            )
            return AIProviderResponse(
                success=False,
                provider=self.name,
                model=self._model,
                text=None,
                error=f"Groq error: {err_str}",
                is_recoverable=is_recoverable,
            )
