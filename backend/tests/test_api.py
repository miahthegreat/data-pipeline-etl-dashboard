import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    r = await client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "message" in data
    assert "docs" in data


@pytest.mark.asyncio
async def test_dashboard_summary(client: AsyncClient):
    r = await client.get("/api/dashboard/summary")
    assert r.status_code == 200
    data = r.json()
    assert "total_pipelines" in data
    assert "total_runs_24h" in data
    assert "stale_datasets_count" in data


@pytest.mark.asyncio
async def test_pipelines_list(client: AsyncClient):
    r = await client.get("/api/pipelines")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_runs_trend(client: AsyncClient):
    r = await client.get("/api/dashboard/runs-trend?days=7")
    assert r.status_code == 200
    data = r.json()
    assert "days" in data
    assert isinstance(data["days"], list)


@pytest.mark.asyncio
async def test_dashboard_metrics(client: AsyncClient):
    r = await client.get("/api/dashboard/metrics?days=7")
    assert r.status_code == 200
    data = r.json()
    assert "success_rate_7d" in data
    assert "slowest_pipelines" in data
    assert isinstance(data["slowest_pipelines"], list)


@pytest.mark.asyncio
async def test_alerts_list(client: AsyncClient):
    r = await client.get("/api/alerts")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_alert_deliveries(client: AsyncClient):
    r = await client.get("/api/alerts/deliveries?limit=10")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_freshness_list(client: AsyncClient):
    r = await client.get("/api/freshness")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_run_create(client: AsyncClient):
    # Create a pipeline first
    p = await client.post(
        "/api/pipelines",
        json={"name": "Test Pipeline", "description": "For tests"},
    )
    assert p.status_code == 201
    pipeline_id = p.json()["id"]
    # Record a run
    from datetime import datetime, timezone
    started = datetime.now(timezone.utc).isoformat()
    r = await client.post(
        "/api/runs",
        json={
            "pipeline_id": pipeline_id,
            "status": "success",
            "started_at": started,
            "duration_seconds": 60,
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["pipeline_id"] == pipeline_id
    assert data["status"] == "success"
    assert data["duration_seconds"] == 60
