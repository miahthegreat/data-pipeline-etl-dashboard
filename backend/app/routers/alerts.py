from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AlertRule, AlertDelivery
from app.schemas import AlertRuleCreate, AlertRuleUpdate, AlertRule as AlertRuleSchema, AlertCheckResult
from app.services.alert_check import run_alert_check

router = APIRouter()


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
    return await run_alert_check(db, hours=hours)
