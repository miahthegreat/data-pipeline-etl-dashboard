# Airflow DAGs

Optional Apache Airflow integration. Start with:

```bash
docker compose --profile airflow up -d
```

Then open **http://localhost:8080** (login: `admin` / `admin`).

Add DAGs in `airflow/dags/`. Example: a DAG that runs on a schedule and calls the dashboard API to record job runs or trigger alert checks (`POST /api/alerts/check`).
