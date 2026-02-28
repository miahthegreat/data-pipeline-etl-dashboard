# dbt project

Minimal dbt project for the Data Pipeline & ETL Dashboard. Builds staging and marts models from the pipeline DB.

## Setup

1. Copy `profiles.yml.example` to `~/.dbt/profiles.yml` (or set `DBT_PROFILES_DIR`).
2. Point the profile at your dashboard Postgres (same DB as the FastAPI app, so `job_runs` and `pipelines` exist).

## Run

From the **repo root**:

```bash
cd dbt
dbt deps   # if you add packages
dbt run
dbt test   # optional
```

Or from anywhere:

```bash
dbt run --project-dir /path/to/data-pipeline-etl-dashboard/dbt
```

## Track dbt runs in the dashboard

To record dbt runs in the dashboard (so they appear under Job runs and can trigger alerts):

1. Create a pipeline in the dashboard (or via API) for "dbt", e.g. `POST /api/pipelines` with `{"name": "dbt", "description": "dbt models"}`.
2. After `dbt run`, call the API to record a run:

```bash
# Example: record a successful dbt run (replace PIPELINE_ID and API_BASE)
curl -X POST "$API_BASE/api/runs" \
  -H "Content-Type: application/json" \
  -d '{"pipeline_id": PIPELINE_ID, "status": "success", "started_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "finished_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "duration_seconds": 120, "rows_affected": null}'
```

A small script or Airflow task can run `dbt run` and then POST the result to `/api/runs` (and update data freshness if needed).
