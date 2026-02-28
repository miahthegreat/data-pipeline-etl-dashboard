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
├── backend/          # FastAPI app: APIs for jobs, runs, freshness, metrics
├── dashboard/        # React frontend: monitoring UI and trend dashboards
├── docker-compose.yml
└── README.md
```

## Quick start

```bash
# Run everything with Docker
docker compose up -d

# Seed sample data (optional, once)
docker compose exec backend python -m app.seed

# Backend API: http://localhost:8000
# API docs: http://localhost:8000/docs
# Dashboard UI: http://localhost:5173
```

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

| Variable        | Description                    |
|-----------------|--------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string   |
| `API_BASE_URL`  | Backend URL for the dashboard  |

## Roadmap

- [ ] Integrate Apache Airflow for job scheduling
- [ ] Add dbt project and run tracking
- [ ] Optional Metabase for ad-hoc analytics
- [ ] Alerting (email/Slack) on failure or freshness SLA breach
