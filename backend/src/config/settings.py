from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="ntn-lbtools")
    app_env: str = Field(default="development")
    database_url: str = Field(default="postgresql+asyncpg://user:pass@localhost:5432/ntn_lbtools")
    log_level: str = Field(default="info")

    api_key: str | None = Field(default=None, repr=False)

    cors_origins: list[AnyHttpUrl] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:8000"],
    )
    cors_allow_credentials: bool = Field(default=True)
    cors_allow_methods: list[str] = Field(
        default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
    cors_allow_headers: list[str] = Field(
        default_factory=lambda: ["Content-Type", "Authorization", "X-API-Key"],
    )

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() in {"dev", "development"}


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]


def get_database_url(override: str | None = None) -> str:
    settings = get_settings()
    if override:
        return override
    return settings.database_url
