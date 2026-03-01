import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type JobRun, type Pipeline } from "../api";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function JobRuns() {
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPipeline, setFilterPipeline] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const loadPipelines = () => {
    api.pipelines().then(setPipelines).catch((e) => setError(e.message));
  };

  const loadRuns = () => {
    setLoading(true);
    api
      .runs({
        pipeline_id: filterPipeline === "" ? undefined : (filterPipeline as number),
        status: filterStatus || undefined,
        limit: 100,
      })
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPipelines();
  }, []);

  useEffect(() => {
    loadRuns();
  }, [filterPipeline, filterStatus]);

  const pipelineName = (id: number) => pipelines.find((p) => p.id === id)?.name ?? `Pipeline ${id}`;
  const formatDate = (s: string) => new Date(s).toLocaleString();
  const formatDuration = (sec: number | null) => (sec != null ? `${Math.round(sec)}s` : "—");

  if (error) return <div className="text-[var(--error)]">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Job runs</h1>
      <div className="flex flex-wrap gap-4">
        <select
          value={filterPipeline}
          onChange={(e) => setFilterPipeline(e.target.value === "" ? "" : Number(e.target.value))}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All pipelines</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left p-3 font-medium">Pipeline</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Started</th>
                <th className="text-left p-3 font-medium">Duration</th>
                <th className="text-left p-3 font-medium">Rows</th>
                <th className="text-left p-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/5">
                  <td className="p-3">
                    <Link
                      to={`/pipelines/${run.pipeline_id}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      {pipelineName(run.pipeline_id)}
                    </Link>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 ${
                      run.status === "success" ? "text-[var(--success)]" :
                      run.status === "failed" ? "text-[var(--error)]" : "text-[var(--muted)]"
                    }`}>
                      {run.status === "success" && <CheckCircle className="h-4 w-4" />}
                      {run.status === "failed" && <XCircle className="h-4 w-4" />}
                      {run.status === "running" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {run.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[var(--muted)]">{formatDate(run.started_at)}</td>
                  <td className="p-3 font-mono">{formatDuration(run.duration_seconds)}</td>
                  <td className="p-3 font-mono">{run.rows_affected ?? "—"}</td>
                  <td className="p-3 text-[var(--muted)] max-w-xs truncate" title={run.error_message ?? undefined}>
                    {run.error_message ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {runs.length === 0 && (
            <div className="p-8 text-center text-[var(--muted)]">No runs found.</div>
          )}
        </div>
      )}
    </div>
  );
}
