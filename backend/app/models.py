from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Pipeline(Base):
    __tablename__ = "pipelines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    schedule_cron: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    runs: Mapped[list["JobRun"]] = relationship("JobRun", back_populates="pipeline", order_by="JobRun.started_at.desc()")
    freshness: Mapped[list["DataFreshness"]] = relationship("DataFreshness", back_populates="pipeline")


class JobRun(Base):
    __tablename__ = "job_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pipeline_id: Mapped[int] = mapped_column(ForeignKey("pipelines.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # pending, running, success, failed
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rows_affected: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    pipeline: Mapped["Pipeline"] = relationship("Pipeline", back_populates="runs")


class DataFreshness(Base):
    __tablename__ = "data_freshness"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pipeline_id: Mapped[int] = mapped_column(ForeignKey("pipelines.id"), nullable=False, index=True)
    dataset_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    last_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expected_interval_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # SLA: refresh every N hours
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    pipeline: Mapped["Pipeline"] = relationship("Pipeline", back_populates="freshness")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    alert_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # run_failed, freshness_stale
    webhook_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Slack or generic webhook
    pipeline_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pipelines.id"), nullable=True, index=True)
    enabled: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    deliveries: Mapped[list["AlertDelivery"]] = relationship("AlertDelivery", back_populates="alert_rule")


class AlertDelivery(Base):
    __tablename__ = "alert_deliveries"
    __table_args__ = (UniqueConstraint("alert_rule_id", "incident_type", "incident_id", name="uq_alert_delivery_incident"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_rule_id: Mapped[int] = mapped_column(ForeignKey("alert_rules.id"), nullable=False, index=True)
    incident_type: Mapped[str] = mapped_column(String(32), nullable=False)
    incident_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    delivered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    alert_rule: Mapped["AlertRule"] = relationship("AlertRule", back_populates="deliveries")
