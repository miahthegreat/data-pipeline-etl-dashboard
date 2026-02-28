from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Pipeline
from app.schemas import PipelineCreate, Pipeline

router = APIRouter()


@router.get("", response_model=list[Pipeline])
async def list_pipelines(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pipeline).order_by(Pipeline.name))
    return list(result.scalars().all())


@router.post("", response_model=Pipeline, status_code=201)
async def create_pipeline(body: PipelineCreate, db: AsyncSession = Depends(get_db)):
    pipeline = Pipeline(
        name=body.name,
        description=body.description,
        schedule_cron=body.schedule_cron,
    )
    db.add(pipeline)
    await db.commit()
    await db.refresh(pipeline)
    return pipeline


@router.get("/{pipeline_id}", response_model=Pipeline)
async def get_pipeline(pipeline_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id))
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(404, "Pipeline not found")
    return pipeline
