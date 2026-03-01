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
