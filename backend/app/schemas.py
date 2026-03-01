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


class DataFreshnessCreate(BaseModel):
    pipeline_id: int
    dataset_name: str
    last_updated_at: Optional[datetime] = None  # default now in router
    expected_interval_hours: Optional[float] = None


class DataFreshness(DataFreshnessBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataFreshnessUpdate(BaseModel):
    dataset_name: Optional[str] = None
    last_updated_at: Optional[datetime] = None
    expected_interval_hours: Optional[float] = None


class DataFreshnessWithStatus(DataFreshness):
    is_stale: bool = False
    hours_since_update: Optional[float] = None


class DashboardSummary(BaseModel):
    total_pipelines: int
    total_runs_24h: int
    success_count_24h: int
    failed_count_24h: int
    stale_datasets_count: int


class RunsTrendDay(BaseModel):
    date: str  # YYYY-MM-DD
    success: int
    failed: int
    total: int


class RunsTrendResponse(BaseModel):
    days: list[RunsTrendDay]


class AlertRuleBase(BaseModel):
    name: str
    alert_type: str  # run_failed, freshness_stale
    webhook_url: Optional[str] = None
    pipeline_id: Optional[int] = None
    enabled: bool = True


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    alert_type: Optional[str] = None
    webhook_url: Optional[str] = None
    pipeline_id: Optional[int] = None
    enabled: Optional[bool] = None


class AlertRule(AlertRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AlertCheckResult(BaseModel):
    run_failed_count: int
    freshness_stale_count: int
    alerts_sent: int


class AlertDeliveryResponse(BaseModel):
    id: int
    alert_rule_id: int
    incident_type: str
    incident_id: str
    delivered_at: datetime

    class Config:
        from_attributes = True


class DashboardMetrics(BaseModel):
    success_rate_7d: float  # 0-100
    slowest_pipelines: list[dict]  # [{ pipeline_id, name, avg_duration_seconds, run_count }]
