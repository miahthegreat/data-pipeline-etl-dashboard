from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.alerting import send_alert, slack_message
from app.database import get_db
from app.models import AlertRule, AlertDelivery, JobRun, DataFreshness
from app.schemas import AlertRuleCreate, AlertRuleUpdate, AlertRule as AlertRuleSchema, AlertCheckResult

router = APIRouter()


def _hours_since(ts: datetime) -> float:
    now = datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return (now - ts).total_seconds() / 3600.0


@router.get("", response_model=list[AlertRuleSchema])
async def list_alert_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertRule).order_by(AlertRule.name))
    return list(result.scalars().all())


@router.post("", response_model=AlertRuleSchema, status_code=201)
async def create_alert_rule(body: AlertRuleCreate, db: AsyncSession = Depends(get_db)):
    if body.alert_type not in ("run_failed", "freshness_stale"):
        raise HTTPException(400, "alert_type must be run_failed or freshness_stale")
    rule = AlertRule(
        name=body.name,
        alert_type=body.alert_type,
        webhook_url=body.webhook_url,
        pipeline_id=body.pipeline_id,
        enabled=body.enabled,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.get("/{rule_id}", response_model=AlertRuleSchema)
async def get_alert_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Alert rule not found")
    return rule


@router.patch("/{rule_id}", response_model=AlertRuleSchema)
async def update_alert_rule(
    rule_id: int,
    body: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Alert rule not found")
    if body.name is not None:
        rule.name = body.name
    if body.alert_type is not None:
        if body.alert_type not in ("run_failed", "freshness_stale"):
            raise HTTPException(400, "alert_type must be run_failed or freshness_stale")
        rule.alert_type = body.alert_type
    if body.webhook_url is not None:
        rule.webhook_url = body.webhook_url
    if body.pipeline_id is not None:
        rule.pipeline_id = body.pipeline_id
    if body.enabled is not None:
        rule.enabled = body.enabled
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=204)
async def delete_alert_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Alert rule not found")
    await db.delete(rule)
    await db.commit()


@router.post("/check", response_model=AlertCheckResult)
async def check_and_send_alerts(
    hours: int = 24,
    db: AsyncSession = Depends(get_db),
):
    """Find failed runs and stale datasets in the last `hours`, then send alerts for matching rules (deduped)."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    rules_result = await db.execute(select(AlertRule).where(AlertRule.enabled))
    rules = list(rules_result.scalars().all())

    run_failed_count = 0
    freshness_stale_count = 0
    alerts_sent = 0

    # Failed runs
    runs_result = await db.execute(
        select(JobRun).where(JobRun.started_at >= since, JobRun.status == "failed")
    )
    failed_runs = list(runs_result.scalars().all())
    run_failed_count = len(failed_runs)

    # Stale freshness (expected_interval_hours set and exceeded)
    fresh_result = await db.execute(select(DataFreshness))
    all_fresh = list(fresh_result.scalars().all())
    stale_fresh = [
        f
        for f in all_fresh
        if f.expected_interval_hours is not None
        and _hours_since(f.last_updated_at) > f.expected_interval_hours
    ]
    freshness_stale_count = len(stale_fresh)

    for rule in rules:
        if rule.alert_type == "run_failed":
            for run in failed_runs:
                if rule.pipeline_id is not None and run.pipeline_id != rule.pipeline_id:
                    continue
                incident_id = f"run_{run.id}"
                existing = await db.execute(
                    select(AlertDelivery).where(
                        AlertDelivery.alert_rule_id == rule.id,
                        AlertDelivery.incident_type == "run_failed",
                        AlertDelivery.incident_id == incident_id,
                    )
                )
                if existing.scalar_one_or_none():
                    continue
                text = f"Pipeline run failed (run_id={run.id}, pipeline_id={run.pipeline_id}). Error: {run.error_message or 'unknown'}"
                ok = await send_alert(rule.webhook_url, slack_message(text))
                if ok:
                    db.add(
                        AlertDelivery(
                            alert_rule_id=rule.id,
                            incident_type="run_failed",
                            incident_id=incident_id,
                        )
                    )
                    alerts_sent += 1
        elif rule.alert_type == "freshness_stale":
            for f in stale_fresh:
                if rule.pipeline_id is not None and f.pipeline_id != rule.pipeline_id:
                    continue
                incident_id = f"freshness_{f.id}"
                existing = await db.execute(
                    select(AlertDelivery).where(
                        AlertDelivery.alert_rule_id == rule.id,
                        AlertDelivery.incident_type == "freshness_stale",
                        AlertDelivery.incident_id == incident_id,
                    )
                )
                if existing.scalar_one_or_none():
                    continue
                hours_ago = _hours_since(f.last_updated_at)
                text = f"Data freshness stale: {f.dataset_name} (pipeline_id={f.pipeline_id}). Last updated {hours_ago:.1f}h ago (SLA: {f.expected_interval_hours}h)."
                ok = await send_alert(rule.webhook_url, slack_message(text))
                if ok:
                    db.add(
                        AlertDelivery(
                            alert_rule_id=rule.id,
                            incident_type="freshness_stale",
                            incident_id=incident_id,
                        )
                    )
                    alerts_sent += 1

    await db.commit()
    return AlertCheckResult(
        run_failed_count=run_failed_count,
        freshness_stale_count=freshness_stale_count,
        alerts_sent=alerts_sent,
    )
