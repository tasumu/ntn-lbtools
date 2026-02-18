"""Configuration for NTN Agents."""

import logging

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Agent configuration settings."""

    model_config = SettingsConfigDict(
        env_prefix="NTN_AGENTS_",
        env_file=".env",
        extra="ignore",
    )

    # Backend API
    backend_api_url: str = "http://localhost:8000"

    # Anthropic
    anthropic_api_key: str = Field(default="", repr=False)
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Geocoding
    nominatim_user_agent: str = "ntn-lbtools/0.1.0"
    geocoding_timeout: int = 10

    # Graph settings
    max_iterations: int = 10
    default_mode: str = "design"

    @model_validator(mode="after")
    def _warn_missing_api_key(self):
        if not self.anthropic_api_key:
            logger.warning(
                "NTN_AGENTS_ANTHROPIC_API_KEY is not set; "
                "LLM-based parsing will be disabled."
            )
        return self


settings = Settings()
