import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type Pipeline, type JobRun, type DataFreshnessWithStatus } from "../api";
import { CheckCircle, XCircle, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";

export default function PipelineDetail() {
  const { id } = useParams<{ id: string }>();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [freshness, setFreshness] = useState<DataFreshnessWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pipelineId = id ? parseInt(id, 10) : NaN;

  useEffect(() => {
    if (!id || isNaN(pipelineId)) {
      setError("Invalid pipeline");
      setLoading(false);
      return;
    }
    Promise.all([
      api.pipeline(pipelineId),
      api.runs({ pipeline_id: pipelineId, limit: 50 }),
      api.freshness({ pipeline_id: pipelineId }),
    ])
      .then(([p, r, f]) => {
        setPipeline(p);
        setRuns(r);
        setFreshness(f);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, pipelineId]);

  const formatDate = (s: string) => new Date(s).toLocaleString();
  const formatDuration = (sec: number | null) => (sec != null ? `${Math.round(sec)}s` : "—");

  if (loading) return <div className="text-[var(--muted)]">Loading…</div>;
  if (error || !pipeline) return <div className="text-[var(--error)]">{error ?? "Pipeline not found"}</div>;

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to overview
      </Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{pipeline.name}</h1>
          {pipeline.description && (
            <p className="text-[var(--muted)] mt-1">{pipeline.description}</p>
          )}
          {pipeline.schedule_cron && (
            <p className="text-sm font-mono text-[var(--muted)] mt-1">Schedule: {pipeline.schedule_cron}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <h2 className="p-4 border-b border-[var(--border)] font-medium">Recent runs</h2>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Started</th>
                  <th className="text-left p-3 font-medium">Duration</th>
                  <th className="text-left p-3 font-medium">Rows</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/5">
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          run.status === "success"
                            ? "text-[var(--success)]"
                            : run.status === "failed"
                              ? "text-[var(--error)]"
                              : "text-[var(--muted)]"
                        }`}
                      >
                        {run.status === "success" && <CheckCircle className="h-4 w-4" />}
                        {run.status === "failed" && <XCircle className="h-4 w-4" />}
                        {run.status === "running" && <Loader2 className="h-4 w-4 animate-spin" />}
                        {run.status}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--muted)]">{formatDate(run.started_at)}</td>
                    <td className="p-3 font-mono">{formatDuration(run.duration_seconds)}</td>
                    <td className="p-3 font-mono">{run.rows_affected ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {runs.length === 0 && (
              <div className="p-6 text-center text-[var(--muted)]">No runs yet.</div>
            )}
          </div>
          <div className="p-3 border-t border-[var(--border)]">
            <Link to="/runs" className="text-sm text-[var(--accent)] hover:underline">
              View all runs →
            </Link>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <h2 className="p-4 border-b border-[var(--border)] font-medium">Data freshness</h2>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                  <th className="text-left p-3 font-medium">Dataset</th>
                  <th className="text-left p-3 font-medium">Last updated</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {freshness.map((f) => (
                  <tr key={f.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/5">
                    <td className="p-3 font-mono">{f.dataset_name}</td>
                    <td className="p-3 text-[var(--muted)]">{formatDate(f.last_updated_at)}</td>
                    <td className="p-3">
                      {f.is_stale ? (
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
              <div className="p-6 text-center text-[var(--muted)]">No freshness records.</div>
            )}
          </div>
          <div className="p-3 border-t border-[var(--border)]">
            <Link to="/freshness" className="text-sm text-[var(--accent)] hover:underline">
              View all freshness →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
