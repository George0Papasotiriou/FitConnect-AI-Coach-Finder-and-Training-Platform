import time
import uuid
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from app.logger import get_logger

log_req = get_logger("middleware.request_id")
log_rate = get_logger("middleware.rate_limit")


async def request_id_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Attach a request_id to every request for end-to-end traceability.

    If the client sends X-Request-Id, we honor it. Otherwise we mint one.
    The id is exposed on response headers so the frontend can log it.
    """
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    request.state.request_id = request_id

    log_req.info(
        "Request received",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
        },
    )

    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id

    log_req.info(
        "Request completed",
        extra={
            "request_id": request_id,
            "status": response.status_code,
        },
    )

    return response


# ---------------------------------------------------------------------------
# Rate limit middleware — sliding window per client IP. Stdlib only.
# 30 requests per 60 seconds. /api/health is exempt.
# ---------------------------------------------------------------------------

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 30
_RATE_LIMIT_SKIP_PATHS = frozenset({"/api/health"})

_request_timestamps: dict[str, deque[float]] = defaultdict(deque)


async def rate_limit_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Per-IP sliding-window rate limiter.

    Skips /api/health so liveness probes never get throttled. Returns 429
    with `Retry-After` header + JSON body when the window is full.
    """
    if request.url.path in _RATE_LIMIT_SKIP_PATHS:
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    timestamps = _request_timestamps[client_ip]

    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    while timestamps and timestamps[0] < cutoff:
        timestamps.popleft()

    if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        retry_after = int(RATE_LIMIT_WINDOW_SECONDS - (now - timestamps[0])) + 1
        request_id = getattr(request.state, "request_id", "unknown")
        log_rate.warning(
            "Rate limit exceeded",
            extra={
                "request_id": request_id,
                "client_ip": client_ip,
                "count": len(timestamps),
                "limit": RATE_LIMIT_MAX_REQUESTS,
                "window_seconds": RATE_LIMIT_WINDOW_SECONDS,
                "retry_after": retry_after,
            },
        )
        return JSONResponse(
            status_code=429,
            content={
                "detail": (
                    f"Rate limit: max {RATE_LIMIT_MAX_REQUESTS} requests "
                    f"per {RATE_LIMIT_WINDOW_SECONDS}s"
                ),
                "retry_after_seconds": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )

    timestamps.append(now)
    return await call_next(request)
