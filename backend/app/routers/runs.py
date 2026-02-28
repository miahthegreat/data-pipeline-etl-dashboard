from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import JobRun, Pipeline
from app.schemas import JobRun as JobRunSchema, JobRunCreate

router = APIRouter()


@router.post("", response_model=JobRunSchema, status_code=201)
async def create_run(body: JobRunCreate, db: AsyncSession = Depends(get_db)):
    """Record a job run (e.g. from dbt, Airflow, or a cron job)."""
    if body.status not in ("pending", "running", "success", "failed"):
        raise HTTPException(400, "status must be pending, running, success, or failed")
    result = await db.execute(select(Pipeline).where(Pipeline.id == body.pipeline_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Pipeline not found")
    run = JobRun(
        pipeline_id=body.pipeline_id,
        status=body.status,
        started_at=body.started_at,
        finished_at=body.finished_at,
        duration_seconds=body.duration_seconds,
        rows_affected=body.rows_affected,
        error_message=body.error_message,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


@router.get("", response_model=list[JobRunSchema])
async def list_runs(
    pipeline_id: int | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
):
    q = select(JobRun).order_by(JobRun.started_at.desc()).limit(limit)
    if pipeline_id is not None:
        q = q.where(JobRun.pipeline_id == pipeline_id)
    if status:
        q = q.where(JobRun.status == status)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.get("/recent", response_model=list[JobRunSchema])
async def recent_runs(
    hours: int = Query(24, ge=1, le=168),
    pipeline_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    q = (
        select(JobRun)
        .where(JobRun.started_at >= since)
        .order_by(JobRun.started_at.desc())
    )
    if pipeline_id is not None:
        q = q.where(JobRun.pipeline_id == pipeline_id)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.get("/{run_id}", response_model=JobRunSchema)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JobRun).where(JobRun.id == run_id).options(selectinload(JobRun.pipeline))
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Run not found")
    return run
