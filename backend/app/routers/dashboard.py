from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Pipeline, JobRun, DataFreshness
from app.schemas import DashboardSummary

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(db: AsyncSession = Depends(get_db)):
    # Total pipelines
    pipelines_result = await db.execute(select(func.count(Pipeline.id)))
    total_pipelines = pipelines_result.scalar() or 0

    # Runs in last 24h
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    runs_result = await db.execute(
        select(JobRun.status, func.count(JobRun.id))
        .where(JobRun.started_at >= since)
        .group_by(JobRun.status)
    )
    rows = runs_result.all()
    total_runs_24h = sum(c for _, c in rows)
    success_count_24h = next((c for s, c in rows if s == "success"), 0)
    failed_count_24h = next((c for s, c in rows if s == "failed"), 0)

    # Stale datasets
    freshness_result = await db.execute(select(DataFreshness))
    freshness_rows = freshness_result.scalars().all()
    stale = 0
    for r in freshness_rows:
        if r.expected_interval_hours is None:
            continue
        delta = (datetime.now(timezone.utc) - (r.last_updated_at.replace(tzinfo=timezone.utc) if r.last_updated_at.tzinfo is None else r.last_updated_at)).total_seconds() / 3600
        if delta > r.expected_interval_hours:
            stale += 1

    return DashboardSummary(
        total_pipelines=total_pipelines,
        total_runs_24h=total_runs_24h,
        success_count_24h=success_count_24h,
        failed_count_24h=failed_count_24h,
        stale_datasets_count=stale,
    )
