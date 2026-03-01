# Data Pipeline & ETL Dashboard

Internal platform for scheduling and monitoring data pipelines. Tracks job runs, data freshness, and key metrics with alerting. Dashboards built for stakeholder visibility and incident triage.

**Stack:** Python, SQL, Airflow, dbt, Metabase, Docker

## Features

- **Job runs** — Schedule and track ETL job executions with status, duration, and logs
- **Data freshness** — Monitor when datasets were last updated; alert on staleness
- **Key metrics** — Dashboards for stakeholder visibility and incident triage
- **Alerting** — Notifications when jobs fail or data falls behind SLA

## Project structure

```
data-pipeline-etl-dashboard/
├── backend/          # FastAPI app: APIs for jobs, runs, freshness, metrics, alerts
├── dashboard/        # React frontend: monitoring UI, job runs, freshness, alerting
├── dbt/              # dbt project: staging and marts models
├── airflow/         # Optional Airflow DAGs (--profile airflow)
├── docker-compose.yml
└── README.md
```

## Quick start (full stack)

```bash
# From repo root: start DB, backend, and dashboard
docker compose up -d

# Wait for backend to be ready, then optionally seed sample data (once)
docker compose exec backend python -m app.seed

# Backend API: http://localhost:8000
# API docs: http://localhost:8000/docs
# Dashboard UI: http://localhost:5173
```

The dashboard (React dev server on 5173) talks to the backend on port 8000; CORS is set for `localhost:5173`. To run only the database and backend, use `docker compose up -d db backend`.

## CI

GitHub Actions runs on push/PR to `main`/`master`:

- **backend:** PostgreSQL 16 service + `pytest tests/`
- **frontend:** `npm ci` + `npm run test`
- **build:** `docker compose build` for db, backend, and dashboard

Workflow: [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Development

### Backend (Python / FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env       # set DATABASE_URL etc.
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend (React / Vite)

```bash
cd dashboard
npm install
npm run dev
```

### Database

PostgreSQL. Migrations via Alembic. Set `DATABASE_URL` in backend `.env`.

## Environment

| Variable             | Description                              |
|----------------------|------------------------------------------|
| `DATABASE_URL`       | PostgreSQL connection string             |
| `API_BASE_URL`       | Backend URL for the dashboard             |
| `SLACK_WEBHOOK_URL`  | Optional default webhook for alert rules  |

## Optional services

- **Airflow:** `docker compose --profile airflow up -d` → http://localhost:8080 (admin/admin). Add DAGs in `airflow/dags/`.
- **Metabase:** `docker compose --profile metabase up -d` → http://localhost:3000. Connect to the same Postgres for ad-hoc analytics.

## Recording runs from dbt or Airflow

Create a pipeline in the dashboard (or via `POST /api/pipelines`), then record runs with `POST /api/runs`:

```bash
curl -X POST "http://localhost:8000/api/runs" \
  -H "Content-Type: application/json" \
  -d '{"pipeline_id": 1, "status": "success", "started_at": "2025-01-15T10:00:00Z", "finished_at": "2025-01-15T10:02:00Z", "duration_seconds": 120}'
```

## Roadmap

- [x] Alerting (Slack/webhook) on run failure and freshness SLA breach
- [x] dbt project and run tracking (POST /api/runs)
- [x] Optional Airflow and Metabase in Docker Compose
- [x] Scheduled alert check (APScheduler; set `ALERT_CHECK_INTERVAL_MINUTES`, default 15)
