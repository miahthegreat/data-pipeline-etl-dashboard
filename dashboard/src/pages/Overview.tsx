import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type DashboardSummary, type Pipeline, type RunsTrendResponse, type DashboardMetrics } from "../api";
import { Database, CheckCircle, XCircle, AlertTriangle, ArrowRight, TrendingUp, Clock } from "lucide-react";

export default function Overview() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [trend, setTrend] = useState<RunsTrendResponse | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.dashboardSummary(), api.pipelines(), api.runsTrend(7), api.dashboardMetrics(7)])
      .then(([s, p, t, m]) => {
        setSummary(s);
        setPipelines(p);
        setTrend(t);
        setMetrics(m);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-[var(--muted)]">Loading…</div>;
  if (error) return <div className="text-[var(--error)]">Error: {error}</div>;
  if (!summary) return null;

  const cards = [
    { label: "Pipelines", value: summary.total_pipelines, icon: Database, color: "text-[var(--accent)]" },
    { label: "Runs (24h)", value: summary.total_runs_24h, icon: ArrowRight, color: "text-[var(--muted)]" },
    { label: "Success (24h)", value: summary.success_count_24h, icon: CheckCircle, color: "text-[var(--success)]" },
    { label: "Failed (24h)", value: summary.failed_count_24h, icon: XCircle, color: "text-[var(--error)]" },
    { label: "Stale datasets", value: summary.stale_datasets_count, icon: AlertTriangle, color: "text-[var(--warning)]" },
  ];

  const chartData = trend?.days.map((d) => ({
    date: d.date.slice(5),
    success: d.success,
    failed: d.failed,
    total: Math.max(d.total, 1),
  })) ?? [];
  const maxTotal = chartData.length ? Math.max(...chartData.map((d) => d.total)) : 1;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-sm text-[var(--muted)]">{label}</p>
              <p className="text-2xl font-semibold mt-1">{value}</p>
            </div>
            <Icon className={`h-8 w-8 ${color}`} />
          </div>
        ))}
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <h2 className="text-lg font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--success)]" />
              Success rate (7d)
            </h2>
            <p className="text-2xl font-semibold">{metrics.success_rate_7d}%</p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <h2 className="text-lg font-medium mb-2 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--muted)]" />
              Slowest pipelines (7d avg)
            </h2>
            <ul className="space-y-1 text-sm">
              {metrics.slowest_pipelines.length === 0 ? (
                <li className="text-[var(--muted)]">No run duration data yet.</li>
              ) : (
                metrics.slowest_pipelines.slice(0, 5).map((s) => (
                  <li key={s.pipeline_id} className="flex justify-between">
                    <span className="truncate">{s.name}</span>
                    <span className="font-mono text-[var(--muted)] ml-2">
                      {s.avg_duration_seconds != null ? `${Math.round(s.avg_duration_seconds)}s` : "—"} ({s.run_count} runs)
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <h2 className="text-lg font-medium mb-4">Runs trend (last 7 days)</h2>
          <div className="flex items-end gap-1 h-48">
            {chartData.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col gap-0.5 justify-end min-w-0">
                <div
                  className="w-full rounded-t flex flex-col-reverse"
                  style={{ height: "100%" }}
                >
                  {d.failed > 0 && (
                    <div
                      className="w-full rounded-t min-h-[2px]"
                      style={{
                        height: `${(d.failed / maxTotal) * 100}%`,
                        backgroundColor: "var(--error)",
                      }}
                      title={`${d.date}: ${d.failed} failed`}
                    />
                  )}
                  {d.success > 0 && (
                    <div
                      className="w-full min-h-[2px]"
                      style={{
                        height: `${(d.success / maxTotal) * 100}%`,
                        backgroundColor: "var(--success)",
                      }}
                      title={`${d.date}: ${d.success} success`}
                    />
                  )}
                </div>
                <span className="text-xs text-[var(--muted)] truncate text-center mt-1">{d.date}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--success)]" /> Success
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--error)]" /> Failed
            </span>
          </div>
        </div>
      )}

      {pipelines.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <h2 className="text-lg font-medium mb-3">Pipelines</h2>
          <ul className="space-y-2">
            {pipelines.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/pipelines/${p.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 text-[var(--foreground)]"
                >
                  <span className="font-medium">{p.name}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-4">
        <Link
          to="/runs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90"
        >
          View job runs
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/freshness"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-white/5"
        >
          Data freshness
        </Link>
      </div>
    </div>
  );
}
