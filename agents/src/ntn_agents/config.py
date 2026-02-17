"""Configuration for NTN Agents."""

from pydantic_settings import BaseSettings, SettingsConfigDict


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
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Geocoding
    nominatim_user_agent: str = "ntn-lbtools/0.1.0"
    geocoding_timeout: int = 10

    # Graph settings
    max_iterations: int = 10
    default_mode: str = "design"


settings = Settings()
