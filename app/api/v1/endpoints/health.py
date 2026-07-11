"""System health check endpoints — worker liveness, DB connectivity, and overall status."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.api import deps
from app.db.models import User

router = APIRouter()

# Thresholds — worker is considered degraded if it hasn't run within 3× its interval,
# and dead if it hasn't run in over an hour.
_DEGRADED_AFTER_MINUTES = 35   # 3× the 10-min poll interval + buffer
_DEAD_AFTER_MINUTES = 60


@router.get("/worker")
async def worker_health():
    """
    Public health check for the background resolve worker.
    Returns status: healthy | degraded | dead | pending (not yet run).

    - healthy   : last run within the last 35 minutes
    - degraded  : last run between 35 and 60 minutes ago (missed at least one cycle)
    - dead      : last run over 60 minutes ago, or loop never started
    - pending   : loop started but hasn't completed its first run yet (normal at boot)
    """
    from app.workers.resolve_worker import _last_run_at, _loop_alive, POLL_INTERVAL_SECONDS

    now = datetime.utcnow()

    if not _loop_alive:
        return {
            "status": "dead",
            "reason": "Loop never started — server may have just booted or crashed.",
            "last_run_at": None,
            "next_run_in_seconds": None,
            "poll_interval_seconds": POLL_INTERVAL_SECONDS,
        }

    if _last_run_at is None:
        return {
            "status": "pending",
            "reason": f"Loop is alive but hasn't completed its first run yet "
                      f"(first run is {POLL_INTERVAL_SECONDS // 60} minutes after boot).",
            "last_run_at": None,
            "next_run_in_seconds": POLL_INTERVAL_SECONDS,
            "poll_interval_seconds": POLL_INTERVAL_SECONDS,
        }

    age_minutes = (now - _last_run_at).total_seconds() / 60
    next_run_seconds = max(0, POLL_INTERVAL_SECONDS - int((now - _last_run_at).total_seconds()))

    if age_minutes <= _DEGRADED_AFTER_MINUTES:
        status = "healthy"
        reason = f"Last run completed {age_minutes:.1f} minutes ago."
    elif age_minutes <= _DEAD_AFTER_MINUTES:
        status = "degraded"
        reason = (
            f"Last run was {age_minutes:.1f} minutes ago — missed at least one cycle. "
            f"Worker may be struggling."
        )
    else:
        status = "dead"
        reason = (
            f"Last run was {age_minutes:.1f} minutes ago — worker appears to have crashed."
        )

    return {
        "status": status,
        "reason": reason,
        "last_run_at": _last_run_at.isoformat() + "Z",
        "age_minutes": round(age_minutes, 1),
        "next_run_in_seconds": next_run_seconds,
        "poll_interval_seconds": POLL_INTERVAL_SECONDS,
    }


@router.get("")
async def full_health(
    current_user: User = Depends(deps.get_current_active_platform_manager)
):
    """
    SUPERADMIN — Full system health check including DB connectivity and all workers.
    """
    from app.workers.resolve_worker import _last_run_at, _loop_alive, POLL_INTERVAL_SECONDS
    from app.db.database import AsyncSessionLocal
    from sqlalchemy import text

    now = datetime.utcnow()

    # 1. DB check
    db_status = "healthy"
    db_error = None
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "error"
        db_error = str(e)

    # 2. Resolve worker check
    if not _loop_alive:
        worker_status = "dead"
    elif _last_run_at is None:
        worker_status = "pending"
    else:
        age_minutes = (now - _last_run_at).total_seconds() / 60
        if age_minutes <= _DEGRADED_AFTER_MINUTES:
            worker_status = "healthy"
        elif age_minutes <= _DEAD_AFTER_MINUTES:
            worker_status = "degraded"
        else:
            worker_status = "dead"

    overall = "healthy"
    if db_status != "healthy" or worker_status in ("dead",):
        overall = "unhealthy"
    elif worker_status in ("degraded", "pending"):
        overall = "degraded"

    return {
        "overall": overall,
        "timestamp": now.isoformat() + "Z",
        "components": {
            "database": {
                "status": db_status,
                "error": db_error,
            },
            "resolve_worker": {
                "status": worker_status,
                "last_run_at": _last_run_at.isoformat() + "Z" if _last_run_at else None,
                "poll_interval_seconds": POLL_INTERVAL_SECONDS,
            },
        },
    }
