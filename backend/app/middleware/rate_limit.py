from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Juda ko'p so'rov! Biroz kuting.",
            "retry_after": "60 sekund"
        }
    )