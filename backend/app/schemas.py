from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PipelineBase(BaseModel):
    name: str
    description: Optional[str] = None
    schedule_cron: Optional[str] = None


class PipelineCreate(PipelineBase):
    pass


class Pipeline(PipelineBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobRunBase(BaseModel):
    pipeline_id: int
    status: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    rows_affected: Optional[int] = None
    error_message: Optional[str] = None


class JobRunCreate(JobRunBase):
    pass


class JobRun(JobRunBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class JobRunWithPipeline(JobRun):
    pipeline_name: Optional[str] = None


class DataFreshnessBase(BaseModel):
    pipeline_id: int
    dataset_name: str
    last_updated_at: datetime
    expected_interval_hours: Optional[float] = None


class DataFreshnessCreate(DataFreshnessBase):
    pass


class DataFreshness(DataFreshnessBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataFreshnessWithStatus(DataFreshness):
    is_stale: bool = False
    hours_since_update: Optional[float] = None


class DashboardSummary(BaseModel):
    total_pipelines: int
    total_runs_24h: int
    success_count_24h: int
    failed_count_24h: int
    stale_datasets_count: int
