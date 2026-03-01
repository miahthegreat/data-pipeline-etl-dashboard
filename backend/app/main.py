import traceback
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base, async_session_factory
from app.routers import pipelines, runs, freshness, dashboard, alerts
from app.services.alert_check import run_alert_check


async def _scheduled_alert_check():
    async with async_session_factory() as db:
        try:
            await run_alert_check(db, hours=24)
        except Exception:
            pass  # Log and avoid crashing the scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    scheduler = None
    if settings.alert_check_interval_minutes > 0:
        scheduler = AsyncIOScheduler()
        scheduler.add_job(
            _scheduled_alert_check,
            "interval",
            minutes=settings.alert_check_interval_minutes,
            id="alert_check",
        )
        scheduler.start()

    yield

    if scheduler:
        scheduler.shutdown(wait=False)
    await engine.dispose()


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


def _cors_headers(origin: str | None) -> dict[str, str]:
    """Headers so error responses are not blocked by CORS."""
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    allow_origin = origin if origin and origin in origins else (origins[0] if origins else "*")
    return {
        "Access-Control-Allow-Origin": allow_origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Return 500 with error details; include CORS so the browser can read the error."""
    tb = traceback.format_exc()
    origin = request.headers.get("origin")
    headers = _cors_headers(origin)
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "traceback": tb,
        },
        headers=headers,
    )


_cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if not _cors_origins:
    _cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
app.include_router(pipelines.router, prefix="/api/pipelines", tags=["pipelines"])
app.include_router(runs.router, prefix="/api/runs", tags=["runs"])
app.include_router(freshness.router, prefix="/api/freshness", tags=["freshness"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "Data Pipeline & ETL Dashboard API", "docs": "/docs", "health": "/api/health"}
