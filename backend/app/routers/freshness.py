from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DataFreshness, Pipeline
from app.schemas import DataFreshnessCreate, DataFreshnessUpdate, DataFreshness as FreshnessSchema, DataFreshnessWithStatus

router = APIRouter()


def _hours_since(ts: datetime) -> float:
    now = ts.tzinfo and datetime.now(ts.tzinfo) or datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    delta = now - ts
    return delta.total_seconds() / 3600.0


@router.get("", response_model=list[DataFreshnessWithStatus])
async def list_freshness(
    pipeline_id: int | None = Query(None),
    stale_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    q = select(DataFreshness).order_by(DataFreshness.dataset_name)
    if pipeline_id is not None:
        q = q.where(DataFreshness.pipeline_id == pipeline_id)
    result = await db.execute(q)
    rows = list(result.scalars().all())
    out = []
    for r in rows:
        hours = _hours_since(r.last_updated_at)
        is_stale = False
        if r.expected_interval_hours is not None and hours > r.expected_interval_hours:
            is_stale = True
        if stale_only and not is_stale:
            continue
        out.append(
            DataFreshnessWithStatus(
                id=r.id,
                pipeline_id=r.pipeline_id,
                dataset_name=r.dataset_name,
                last_updated_at=r.last_updated_at,
                expected_interval_hours=r.expected_interval_hours,
                created_at=r.created_at,
                updated_at=r.updated_at,
                is_stale=is_stale,
                hours_since_update=round(hours, 2),
            )
        )
    return out


@router.get("/stale-count")
async def stale_count(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataFreshness))
    rows = list(result.scalars().all())
    count = 0
    for r in rows:
        hours = _hours_since(r.last_updated_at)
        if r.expected_interval_hours is not None and hours > r.expected_interval_hours:
            count += 1
    return {"count": count}


@router.post("", response_model=DataFreshnessWithStatus, status_code=201)
async def create_freshness(body: DataFreshnessCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pipeline).where(Pipeline.id == body.pipeline_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Pipeline not found")
    now = datetime.now(timezone.utc)
    row = DataFreshness(
        pipeline_id=body.pipeline_id,
        dataset_name=body.dataset_name,
        last_updated_at=body.last_updated_at or now,
        expected_interval_hours=body.expected_interval_hours,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    hours = _hours_since(row.last_updated_at)
    is_stale = row.expected_interval_hours is not None and hours > row.expected_interval_hours
    return DataFreshnessWithStatus(
        id=row.id,
        pipeline_id=row.pipeline_id,
        dataset_name=row.dataset_name,
        last_updated_at=row.last_updated_at,
        expected_interval_hours=row.expected_interval_hours,
        created_at=row.created_at,
        updated_at=row.updated_at,
        is_stale=is_stale,
        hours_since_update=round(hours, 2),
    )


@router.patch("/{freshness_id}", response_model=DataFreshnessWithStatus)
async def update_freshness(freshness_id: int, body: DataFreshnessUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataFreshness).where(DataFreshness.id == freshness_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Data freshness record not found")
    if body.dataset_name is not None:
        row.dataset_name = body.dataset_name
    if body.last_updated_at is not None:
        row.last_updated_at = body.last_updated_at
    if body.expected_interval_hours is not None:
        row.expected_interval_hours = body.expected_interval_hours
    await db.commit()
    await db.refresh(row)
    hours = _hours_since(row.last_updated_at)
    is_stale = row.expected_interval_hours is not None and hours > row.expected_interval_hours
    return DataFreshnessWithStatus(
        id=row.id,
        pipeline_id=row.pipeline_id,
        dataset_name=row.dataset_name,
        last_updated_at=row.last_updated_at,
        expected_interval_hours=row.expected_interval_hours,
        created_at=row.created_at,
        updated_at=row.updated_at,
        is_stale=is_stale,
        hours_since_update=round(hours, 2),
    )


@router.post("/{freshness_id}/refresh", response_model=DataFreshnessWithStatus)
async def refresh_freshness(freshness_id: int, db: AsyncSession = Depends(get_db)):
    """Set last_updated_at to now."""
    result = await db.execute(select(DataFreshness).where(DataFreshness.id == freshness_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Data freshness record not found")
    row.last_updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    hours = _hours_since(row.last_updated_at)
    is_stale = row.expected_interval_hours is not None and hours > row.expected_interval_hours
    return DataFreshnessWithStatus(
        id=row.id,
        pipeline_id=row.pipeline_id,
        dataset_name=row.dataset_name,
        last_updated_at=row.last_updated_at,
        expected_interval_hours=row.expected_interval_hours,
        created_at=row.created_at,
        updated_at=row.updated_at,
        is_stale=is_stale,
        hours_since_update=round(hours, 2),
    )


@router.delete("/{freshness_id}", status_code=204)
async def delete_freshness(freshness_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DataFreshness).where(DataFreshness.id == freshness_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Data freshness record not found")
    await db.delete(row)
    await db.commit()
