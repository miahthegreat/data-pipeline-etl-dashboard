from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DataFreshness
from app.schemas import DataFreshness as FreshnessSchema, DataFreshnessWithStatus

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
