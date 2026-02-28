const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export interface DashboardSummary {
  total_pipelines: number;
  total_runs_24h: number;
  success_count_24h: number;
  failed_count_24h: number;
  stale_datasets_count: number;
}

export interface Pipeline {
  id: number;
  name: string;
  description: string | null;
  schedule_cron: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobRun {
  id: number;
  pipeline_id: number;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  rows_affected: number | null;
  error_message: string | null;
  created_at: string;
}

export interface DataFreshnessWithStatus {
  id: number;
  pipeline_id: number;
  dataset_name: string;
  last_updated_at: string;
  expected_interval_hours: number | null;
  is_stale: boolean;
  hours_since_update: number | null;
}

export const api = {
  dashboardSummary: () => get<DashboardSummary>("/dashboard/summary"),
  pipelines: () => get<Pipeline[]>("/pipelines"),
  runs: (params?: { pipeline_id?: number; status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.pipeline_id != null) q.set("pipeline_id", String(params.pipeline_id));
    if (params?.status) q.set("status", params.status);
    if (params?.limit != null) q.set("limit", String(params.limit));
    const query = q.toString();
    return get<JobRun[]>(`/runs${query ? `?${query}` : ""}`);
  },
  recentRuns: (hours = 24, pipeline_id?: number) => {
    const q = new URLSearchParams({ hours: String(hours) });
    if (pipeline_id != null) q.set("pipeline_id", String(pipeline_id));
    return get<JobRun[]>(`/runs/recent?${q}`);
  },
  freshness: (params?: { pipeline_id?: number; stale_only?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.pipeline_id != null) q.set("pipeline_id", String(params.pipeline_id));
    if (params?.stale_only) q.set("stale_only", "true");
    const query = q.toString();
    return get<DataFreshnessWithStatus[]>(`/freshness${query ? `?${query}` : ""}`);
  },
};
