"""Send alert payloads to Slack or generic webhooks."""
import json
from typing import Any

import httpx

from app.config import settings


def _webhook_url(rule_webhook_url: str | None) -> str | None:
    return rule_webhook_url or settings.slack_webhook_url


async def send_alert(webhook_url: str | None, payload: dict[str, Any]) -> bool:
    """POST JSON to webhook. For Slack, payload should be { \"text\": \"...\" }. Returns True if 2xx."""
    url = _webhook_url(webhook_url)
    if not url:
        return False
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(url, json=payload, timeout=10.0)
            return 200 <= r.status_code < 300
    except Exception:
        return False


def slack_message(text: str) -> dict[str, Any]:
    return {"text": text}
