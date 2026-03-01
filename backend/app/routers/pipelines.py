from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Pipeline as PipelineModel
from app.schemas import PipelineCreate, Pipeline as PipelineSchema

router = APIRouter()


@router.get("", response_model=list[PipelineSchema])
async def list_pipelines(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PipelineModel).order_by(PipelineModel.name))
    return list(result.scalars().all())


@router.post("", response_model=PipelineSchema, status_code=201)
async def create_pipeline(body: PipelineCreate, db: AsyncSession = Depends(get_db)):
    pipeline = PipelineModel(
        name=body.name,
        description=body.description,
        schedule_cron=body.schedule_cron,
    )
    db.add(pipeline)
    await db.commit()
    await db.refresh(pipeline)
    return pipeline


@router.get("/{pipeline_id}", response_model=PipelineSchema)
async def get_pipeline(pipeline_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PipelineModel).where(PipelineModel.id == pipeline_id))
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(404, "Pipeline not found")
    return pipeline
