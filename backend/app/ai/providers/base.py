"""
Base AI Provider specification and normalized response format for HealthGuardian.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class AIProviderResponse:
    success: bool
    provider: str
    model: str
    text: Optional[str] = None
    error: Optional[str] = None
    is_recoverable: bool = False

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "provider": self.provider,
            "model": self.model,
            "text": self.text,
            "error": self.error,
        }


class BaseAIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name e.g. 'gemini' or 'groq'."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if provider credentials/configuration exist."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Lightweight check if provider is reachable."""
        pass

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_instruction: str = "",
        temperature: float = 0.35,
        max_tokens: int = 800,
    ) -> AIProviderResponse:
        """Generate response and return normalized AIProviderResponse."""
        pass
