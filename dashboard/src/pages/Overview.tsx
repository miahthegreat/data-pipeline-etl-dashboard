import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type DashboardSummary } from "../api";
import { Database, CheckCircle, XCircle, AlertTriangle, ArrowRight } from "lucide-react";

export default function Overview() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboardSummary()
      .then(setSummary)
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
