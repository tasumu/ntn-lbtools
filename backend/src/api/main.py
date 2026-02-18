from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from src.api.limiter import limiter
from src.api.middleware.auth import ApiKeyMiddleware
from src.api.middleware.logging import logging_middleware
from src.api.routes import assets, calculations, modcod, scenarios
from src.config.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="NTN Link Budget API", version="0.1.0")
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded"},
        )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(o).rstrip("/") for o in settings.cors_origins],
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

    app.add_middleware(ApiKeyMiddleware, api_key=settings.api_key)

    @app.middleware("http")
    async def add_timing_header(request, call_next):
        return await logging_middleware(request, call_next)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request, exc: HTTPException):  # type: ignore[override]
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.get("/health", tags=["meta"])
    async def health():
        return {"status": "ok", "app_env": settings.app_env}

    app.include_router(calculations.router, prefix="/api/v1")
    app.include_router(scenarios.router, prefix="/api/v1")
    app.include_router(assets.router, prefix="/api/v1")
    app.include_router(modcod.router, prefix="/api/v1")

    return app


app = create_app()
