import { useEffect, useState } from "react";
import { api, type DataFreshnessWithStatus, type Pipeline } from "../api";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function DataFreshness() {
  const [freshness, setFreshness] = useState<DataFreshnessWithStatus[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staleOnly, setStaleOnly] = useState(false);

  useEffect(() => {
    Promise.all([api.pipelines(), api.freshness({ stale_only: staleOnly })])
      .then(([p, f]) => {
        setPipelines(p);
        setFreshness(f);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [staleOnly]);

  const pipelineName = (id: number) => pipelines.find((p) => p.id === id)?.name ?? `Pipeline ${id}`;
  const formatDate = (s: string) => new Date(s).toLocaleString();

  if (error) return <div className="text-[var(--error)]">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Data freshness</h1>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={staleOnly}
          onChange={(e) => setStaleOnly(e.target.checked)}
          className="rounded border-[var(--border)] bg-[var(--surface)]"
        />
        Show only stale datasets
      </label>
      {loading ? (
        <div className="text-[var(--muted)]">Loading…</div>
      ) : (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left p-3 font-medium">Pipeline</th>
                <th className="text-left p-3 font-medium">Dataset</th>
                <th className="text-left p-3 font-medium">Last updated</th>
                <th className="text-left p-3 font-medium">Hours ago</th>
                <th className="text-left p-3 font-medium">SLA (hours)</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {freshness.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/5">
                  <td className="p-3">{pipelineName(row.pipeline_id)}</td>
                  <td className="p-3 font-mono">{row.dataset_name}</td>
                  <td className="p-3 text-[var(--muted)]">{formatDate(row.last_updated_at)}</td>
                  <td className="p-3 font-mono">{row.hours_since_update ?? "—"}</td>
                  <td className="p-3 font-mono">{row.expected_interval_hours ?? "—"}</td>
                  <td className="p-3">
                    {row.is_stale ? (
                      <span className="inline-flex items-center gap-1 text-[var(--warning)]">
                        <AlertTriangle className="h-4 w-4" />
                        Stale
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[var(--success)]">
                        <CheckCircle className="h-4 w-4" />
                        Fresh
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {freshness.length === 0 && (
            <div className="p-8 text-center text-[var(--muted)]">
              {staleOnly ? "No stale datasets." : "No freshness records."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
