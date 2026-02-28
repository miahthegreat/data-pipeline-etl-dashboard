"""
Seed dev database with sample pipelines, runs, and freshness records.
Run: python -m app.seed (from backend dir, with DB running)
"""
import asyncio
from datetime import datetime, timezone, timedelta

from sqlalchemy import select
from app.database import async_session_factory, engine
from app.database import Base
from app.models import Pipeline, JobRun, DataFreshness


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        result = await db.execute(select(Pipeline).limit(1))
        if result.scalar_one_or_none():
            print("Data already present, skipping seed.")
            return

        now = datetime.now(timezone.utc)
        pipelines = [
            Pipeline(name="Daily Revenue Sync", description="Sync revenue from source system", schedule_cron="0 6 * * *"),
            Pipeline(name="User Events ETL", description="Process and aggregate user events", schedule_cron="0 */2 * * *"),
            Pipeline(name="Inventory Snapshot", description="Nightly inventory snapshot", schedule_cron="0 2 * * *"),
        ]
        for p in pipelines:
            db.add(p)
        await db.flush()

        # Job runs (last 48h mix of success/failed)
        for i, p in enumerate(pipelines):
            for h in range(0, 24, 3):
                started = now - timedelta(hours=h)
                status = "failed" if (i + h) % 5 == 0 else "success"
                finished = started + timedelta(minutes=2, seconds=30)
                db.add(JobRun(
                    pipeline_id=p.id,
                    status=status,
                    started_at=started,
                    finished_at=finished,
                    duration_seconds=150,
                    rows_affected=1000 + h * 100,
                    error_message="Connection timeout" if status == "failed" else None,
                ))
        await db.flush()

        # Data freshness
        for p in pipelines:
            db.add(DataFreshness(
                pipeline_id=p.id,
                dataset_name=f"{p.name} (main)",
                last_updated_at=now - timedelta(hours=1),
                expected_interval_hours=24,
            ))
            db.add(DataFreshness(
                pipeline_id=p.id,
                dataset_name=f"{p.name} (staging)",
                last_updated_at=now - timedelta(hours=30),
                expected_interval_hours=12,
            ))
        await db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
