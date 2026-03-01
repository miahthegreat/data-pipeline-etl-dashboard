from datetime import datetime, timezone, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Pipeline, JobRun, DataFreshness
from app.schemas import DashboardSummary, RunsTrendResponse, RunsTrendDay, DashboardMetrics

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


@router.get("/runs-trend", response_model=RunsTrendResponse)
async def runs_trend(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Daily run counts (success/failed/total) for the last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            cast(JobRun.started_at, Date).label("day"),
            JobRun.status,
            func.count(JobRun.id).label("cnt"),
        )
        .where(JobRun.started_at >= since)
        .group_by(cast(JobRun.started_at, Date), JobRun.status)
    )
    rows = result.all()
    by_date: dict[str, dict[str, int]] = defaultdict(lambda: {"success": 0, "failed": 0, "total": 0})
    for day, status, cnt in rows:
        day_str = day.isoformat() if hasattr(day, "isoformat") else str(day)
        by_date[day_str]["total"] += cnt
        if status == "success":
            by_date[day_str]["success"] += cnt
        elif status == "failed":
            by_date[day_str]["failed"] += cnt
    # Fill missing days with zeros
    out: list[RunsTrendDay] = []
    for i in range(days):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        day_str = d.isoformat()
        data = by_date.get(day_str, {"success": 0, "failed": 0, "total": 0})
        out.append(
            RunsTrendDay(date=day_str, success=data["success"], failed=data["failed"], total=data["total"])
        )
    out.reverse()
    return RunsTrendResponse(days=out)


@router.get("/metrics", response_model=DashboardMetrics)
async def dashboard_metrics(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
):
    """Success rate (last N days) and slowest pipelines by avg duration."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    # Success rate
    runs_result = await db.execute(
        select(JobRun.status, func.count(JobRun.id))
        .where(JobRun.started_at >= since)
        .group_by(JobRun.status)
    )
    rows = runs_result.all()
    total = sum(c for _, c in rows)
    success = next((c for s, c in rows if s == "success"), 0)
    success_rate_7d = (success / total * 100.0) if total else 0.0

    # Slowest pipelines: avg duration by pipeline (last N days)
    subq = (
        select(
            JobRun.pipeline_id,
            func.avg(JobRun.duration_seconds).label("avg_dur"),
            func.count(JobRun.id).label("run_count"),
        )
        .where(JobRun.started_at >= since, JobRun.duration_seconds.isnot(None))
        .group_by(JobRun.pipeline_id)
    )
    subq = subq.subquery()
    pipelines_result = await db.execute(
        select(Pipeline.id, Pipeline.name, subq.c.avg_dur, subq.c.run_count)
        .join(subq, Pipeline.id == subq.c.pipeline_id)
        .order_by(subq.c.avg_dur.desc().nulls_last())
        .limit(10)
    )
    slowest = []
    for pid, name, avg_dur, run_count in pipelines_result.all():
        slowest.append({
            "pipeline_id": pid,
            "name": name,
            "avg_duration_seconds": round(avg_dur, 2) if avg_dur else None,
            "run_count": run_count,
        })

    return DashboardMetrics(success_rate_7d=round(success_rate_7d, 1), slowest_pipelines=slowest)
