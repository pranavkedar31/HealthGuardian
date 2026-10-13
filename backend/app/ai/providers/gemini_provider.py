"""
Dedicated Gemini AI Provider for HealthGuardian.
Uses google-genai SDK with timeout protection and error normalization.
"""
import concurrent.futures
import logging
from typing import Optional

from app.core.config import settings
from app.ai.providers.base import AIProviderResponse, BaseAIProvider

logger = logging.getLogger("healthguardian.ai.gemini")

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None


class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.GEMINI_API_KEY
        self._model = model or settings.GEMINI_MODEL
        self._timeout = settings.AI_TIMEOUT_SECONDS

    @property
    def name(self) -> str:
        return "gemini"

    def is_configured(self) -> bool:
        return bool(self._api_key and genai is not None)

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
                error="Gemini provider is not configured or google-genai SDK is missing.",
                is_recoverable=True,
            )

        def _call():
            client = genai.Client(api_key=self._api_key)
            config_kwargs = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
            if system_instruction:
                config_kwargs["system_instruction"] = system_instruction

            config = types.GenerateContentConfig(**config_kwargs) if types else None
            response = client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=config,
            )
            return response

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_call)
                raw_response = future.result(timeout=self._timeout)

            text = getattr(raw_response, "text", None)
            if not text or not text.strip():
                return AIProviderResponse(
                    success=False,
                    provider=self.name,
                    model=self._model,
                    text=None,
                    error="Gemini returned an empty response.",
                    is_recoverable=True,
                )

            return AIProviderResponse(
                success=True,
                provider=self.name,
                model=self._model,
                text=text.strip(),
                error=None,
                is_recoverable=False,
            )

        except concurrent.futures.TimeoutError:
            logger.warning("Gemini request timed out after %ds", self._timeout)
            return AIProviderResponse(
                success=False,
                provider=self.name,
                model=self._model,
                text=None,
                error=f"Gemini request timed out after {self._timeout}s.",
                is_recoverable=True,
            )
        except Exception as exc:
            err_str = str(exc)
            logger.warning("Gemini API error: %s", err_str)
            lower = err_str.lower()
            is_recoverable = (
                "429" in lower
                or "quota" in lower
                or "resource_exhausted" in lower
                or "timeout" in lower
                or "unavailable" in lower
                or "500" in lower
                or "503" in lower
                or "connection" in lower
                or "deadline" in lower
            )
            return AIProviderResponse(
                success=False,
                provider=self.name,
                model=self._model,
                text=None,
                error=f"Gemini error: {err_str}",
                is_recoverable=is_recoverable,
            )
