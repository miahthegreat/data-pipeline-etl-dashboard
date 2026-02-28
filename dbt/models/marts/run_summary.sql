-- Summary of job runs by pipeline and status (last 7 days).
-- Depends on stg_runs; run after staging.
{{ config(materialized='table') }}

with runs as (
    select * from {{ ref('stg_runs') }}
    where started_at >= current_timestamp - interval '7 days'
),
by_pipeline_status as (
    select
        pipeline_id,
        status,
        count(*) as run_count,
        sum(duration_seconds) as total_duration_sec,
        sum(rows_affected) as total_rows
    from runs
    group by 1, 2
)
select * from by_pipeline_status order by pipeline_id, status
