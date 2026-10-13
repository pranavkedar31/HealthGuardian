"""
Centralized AI Provider Manager for HealthGuardian.
Orchestrates Gemini and Groq with automatic fallback, strict retry limits,
health checks, and clinical fail-safes.
"""
import logging
from typing import Optional

from app.core.config import settings
from app.ai.providers.base import AIProviderResponse, BaseAIProvider
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.groq_provider import GroqProvider

logger = logging.getLogger("healthguardian.ai.manager")

SAFE_CLINICAL_UNAVAILABLE_MESSAGE = (
    "I'm temporarily unable to connect to the HealthGuardian AI service. "
    "Please try again shortly. If your concern is urgent, please contact a "
    "qualified healthcare professional or local emergency service."
)


class AIProviderManager:
    def __init__(
        self,
        primary_name: Optional[str] = None,
        fallback_name: Optional[str] = None,
    ):
        self._primary_name = (primary_name or settings.AI_PRIMARY_PROVIDER or "gemini").lower()
        self._fallback_name = (fallback_name or settings.AI_FALLBACK_PROVIDER or "groq").lower()

        self._providers: dict[str, BaseAIProvider] = {
            "gemini": GeminiProvider(),
            "groq": GroqProvider(),
        }

        self._log_init_status()

    def _log_init_status(self):
        gemini_cfg = "YES" if self._providers["gemini"].is_configured() else "NO"
        groq_cfg = "YES" if self._providers["groq"].is_configured() else "NO"
        logger.info(
            "\n[HealthGuardian AI]\n"
            f"Gemini configured: {gemini_cfg}\n"
            f"Groq configured: {groq_cfg}\n"
            f"Primary provider: {self._primary_name}\n"
            f"Fallback provider: {self._fallback_name}"
        )

    def get_provider(self, name: str) -> Optional[BaseAIProvider]:
        return self._providers.get(name.lower())

    def check_health(self) -> dict:
        """Returns health status of all providers without revealing secrets."""
        gemini = self._providers["gemini"]
        groq = self._providers["groq"]
        return {
            "gemini": {
                "configured": gemini.is_configured(),
                "available": gemini.is_available(),
                "model": settings.GEMINI_MODEL,
            },
            "groq": {
                "configured": groq.is_configured(),
                "available": groq.is_available(),
                "model": settings.GROQ_MODEL,
            },
            "primary_provider": self._primary_name,
            "fallback_provider": self._fallback_name,
        }

    def generate(
        self,
        prompt: str,
        system_instruction: str = "",
        temperature: float = 0.35,
        max_tokens: int = 800,
        domain: str = "HEALTH",
        intent: str = "GENERAL_HEALTH",
    ) -> AIProviderResponse:
        """
        Executes primary provider. If recoverable failure occurs,
        falls back to secondary provider. If both fail, returns safe fallback.
        """
        logger.info("[AI] Request received")
        logger.info("[AI] Domain: %s", domain)
        logger.info("[AI] Intent: %s", intent)
        logger.info("[AI] Primary: %s", self._primary_name)

        primary = self.get_provider(self._primary_name)
        fallback = self.get_provider(self._fallback_name)

        primary_response: Optional[AIProviderResponse] = None

        if primary and primary.is_configured():
            primary_response = primary.generate(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            if primary_response.success:
                logger.info("[AI] %s response: SUCCESS", self._primary_name)
                logger.info("[AI] Final provider: %s", self._primary_name)
                return primary_response
            else:
                logger.warning(
                    "[AI] %s response: FAIL (Error: %s, Recoverable: %s)",
                    self._primary_name,
                    primary_response.error,
                    primary_response.is_recoverable,
                )
        else:
            logger.warning("[AI] Primary %s not configured or missing", self._primary_name)

        # Fallback step
        if fallback and fallback.is_configured():
            logger.info("[AI] Fallback: %s", self._fallback_name)
            fallback_response = fallback.generate(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            if fallback_response.success:
                logger.info("[AI] %s response: SUCCESS", self._fallback_name)
                logger.info("[AI] Final provider: %s", self._fallback_name)
                return fallback_response
            else:
                logger.warning(
                    "[AI] %s response: FAIL (Error: %s)",
                    self._fallback_name,
                    fallback_response.error,
                )

        # Both providers failed or unavailable
        logger.error("[AI] All AI providers failed. Returning safe clinical fallback.")
        return AIProviderResponse(
            success=False,
            provider="fallback_safe",
            model="clinical_safeguard",
            text=SAFE_CLINICAL_UNAVAILABLE_MESSAGE,
            error="All AI providers unavailable or encountered an error.",
            is_recoverable=False,
        )


_manager_instance: Optional[AIProviderManager] = None


def get_ai_provider_manager() -> AIProviderManager:
    global _manager_instance
    if _manager_instance is None:
        _manager_instance = AIProviderManager()
    return _manager_instance
