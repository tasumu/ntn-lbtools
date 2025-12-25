"""Configuration for the MCP server."""

from pathlib import Path

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env."""

    backend_api_url: AnyHttpUrl = Field(
        default="http://localhost:8000",
        alias="BACKEND_API_URL",
        description="Base URL for the backend API the MCP server calls.",
    )

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


settings = Settings()

