import time
from collections.abc import Callable

from fastapi import Request, Response


async def logging_middleware(request: Request, call_next: Callable):
    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-ms"] = f"{duration_ms:.2f}"
    return response
