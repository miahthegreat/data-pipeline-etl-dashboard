-- Staging view of job runs for analytics.
-- Assumes job_runs (and pipelines) exist in the same DB or are synced.
-- For a standalone warehouse, replace with a source from your pipeline DB.
{{ config(materialized='view') }}

with runs as (
    select
        id as run_id,
        pipeline_id,
        status,
        started_at,
        finished_at,
        duration_seconds,
        rows_affected,
        error_message,
        created_at
    from {{ source('pipeline', 'job_runs') }}
)
select * from runs
