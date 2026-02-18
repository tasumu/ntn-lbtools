"""Optional API key authentication middleware."""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

_EXEMPT_PATHS = {"/health", "/openapi.json", "/docs", "/redoc"}


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Reject requests without a valid ``X-API-Key`` header.

    When *api_key* is ``None`` (the default), this middleware is a no-op so
    that local development works without any extra configuration.
    """

    def __init__(self, app, api_key: str | None = None) -> None:
        super().__init__(app)
        self.api_key = api_key

    async def dispatch(self, request: Request, call_next) -> Response:
        if self.api_key is None:
            return await call_next(request)

        if request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        provided = request.headers.get("X-API-Key")
        if provided != self.api_key:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API key"},
            )

        return await call_next(request)
