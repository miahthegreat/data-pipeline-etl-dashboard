"""Run alert check: find failed runs and stale datasets, send webhooks (deduped)."""
from datetime import datetime, timezone, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.alerting import send_alert, slack_message
from app.models import AlertRule, AlertDelivery, JobRun, DataFreshness
from app.schemas import AlertCheckResult


def _hours_since(ts: datetime) -> float:
    now = datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return (now - ts).total_seconds() / 3600.0


async def run_alert_check(db: AsyncSession, hours: int = 24) -> AlertCheckResult:
    """Find failed runs and stale datasets in the last `hours`, send alerts for matching rules (deduped)."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    rules_result = await db.execute(select(AlertRule).where(AlertRule.enabled))
    rules = list(rules_result.scalars().all())

    run_failed_count = 0
    freshness_stale_count = 0
    alerts_sent = 0

    runs_result = await db.execute(
        select(JobRun).where(JobRun.started_at >= since, JobRun.status == "failed")
    )
    failed_runs = list(runs_result.scalars().all())
    run_failed_count = len(failed_runs)

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
