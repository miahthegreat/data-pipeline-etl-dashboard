// Call the backend directly on port 8000 (same host as the page). Avoids relying on Vite proxy.
const BASE =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : "/api";

function handleError(r: Response, body: string): never {
  try {
    const j = JSON.parse(body) as { detail?: string; type?: string };
    const msg = typeof j.detail === "string" ? j.detail : body;
    throw new Error(msg);
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error(body || r.statusText);
    if (e instanceof Error) throw e;
    throw new Error(body || r.statusText);
  }
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  if (!r.ok) handleError(r, text);
  return JSON.parse(text) as T;
}

async function post<T>(path: string, body?: object): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) handleError(r, text);
  return r.status === 204 ? (undefined as T) : (JSON.parse(text) as T);
}

async function patch<T>(path: string, body: object): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) handleError(r, text);
  return JSON.parse(text) as T;
}

async function del(path: string): Promise<void> {
  const r = await fetch(`${BASE}${path}`, { method: "DELETE" });
  const text = await r.text();
  if (!r.ok) handleError(r, text);
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

export interface AlertRule {
  id: number;
  name: string;
  alert_type: string;
  webhook_url: string | null;
  pipeline_id: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertCheckResult {
  run_failed_count: number;
  freshness_stale_count: number;
  alerts_sent: number;
}

export interface RunsTrendDay {
  date: string;
  success: number;
  failed: number;
  total: number;
}

export interface RunsTrendResponse {
  days: RunsTrendDay[];
}

export const api = {
  dashboardSummary: () => get<DashboardSummary>("/dashboard/summary"),
  runsTrend: (days = 7) => get<RunsTrendResponse>(`/dashboard/runs-trend?days=${days}`),
  pipelines: () => get<Pipeline[]>("/pipelines"),
  pipeline: (id: number) => get<Pipeline>(`/pipelines/${id}`),
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
  alertRules: () => get<AlertRule[]>("/alerts"),
  alertRuleCreate: (body: { name: string; alert_type: string; webhook_url?: string; pipeline_id?: number; enabled?: boolean }) =>
    post<AlertRule>("/alerts", body),
  alertRuleUpdate: (id: number, body: Partial<{ name: string; alert_type: string; webhook_url: string; pipeline_id: number; enabled: boolean }>) =>
    patch<AlertRule>(`/alerts/${id}`, body),
  alertRuleDelete: (id: number) => del(`/alerts/${id}`),
  alertsCheck: (hours = 24) => post<AlertCheckResult>(`/alerts/check?hours=${hours}`),
};
