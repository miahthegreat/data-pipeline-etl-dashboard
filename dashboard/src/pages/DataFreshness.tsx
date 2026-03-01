import { useEffect, useState } from "react";
import { api, type DataFreshnessWithStatus, type Pipeline } from "../api";
import { AlertTriangle, CheckCircle, Plus, RefreshCw, Trash2 } from "lucide-react";

export default function DataFreshness() {
  const [freshness, setFreshness] = useState<DataFreshnessWithStatus[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staleOnly, setStaleOnly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addPipelineId, setAddPipelineId] = useState<number | "">("");
  const [addDataset, setAddDataset] = useState("");
  const [addSla, setAddSla] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([api.pipelines(), api.freshness({ stale_only: staleOnly })])
      .then(([p, f]) => {
        setPipelines(p);
        setFreshness(f);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [staleOnly]);

  const pipelineName = (id: number) => pipelines.find((p) => p.id === id)?.name ?? `Pipeline ${id}`;
  const formatDate = (s: string) => new Date(s).toLocaleString();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPipelineId || !addDataset.trim()) return;
    api
      .freshnessCreate({
        pipeline_id: addPipelineId,
        dataset_name: addDataset.trim(),
        expected_interval_hours: addSla ? parseFloat(addSla) : undefined,
      })
      .then(() => {
        setShowAdd(false);
        setAddDataset("");
        setAddSla("");
        load();
      })
      .catch((e) => setError(e.message));
  };

  const handleRefresh = (id: number) => {
    api.freshnessRefresh(id).then(() => load()).catch((e) => setError(e.message));
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this freshness record?")) return;
    api.freshnessDelete(id).then(() => load()).catch((e) => setError(e.message));
  };

  if (error) return <div className="text-[var(--error)]">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Data freshness</h1>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add record
        </button>
      </div>
      {showAdd && (
        <form onSubmit={handleCreate} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex flex-wrap gap-3 items-end">
          <select
            value={addPipelineId}
            onChange={(e) => setAddPipelineId(e.target.value === "" ? "" : Number(e.target.value))}
            required
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Pipeline</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            placeholder="Dataset name"
            value={addDataset}
            onChange={(e) => setAddDataset(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm min-w-[180px]"
          />
          <input
            type="number"
            step="0.5"
            placeholder="SLA (hours)"
            value={addSla}
            onChange={(e) => setAddSla(e.target.value)}
            className="w-24 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <button type="submit" className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium">Create</button>
          <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm">Cancel</button>
        </form>
      )}
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
                <th className="text-left p-3 font-medium w-24">Actions</th>
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
                  <td className="p-3 flex gap-1">
                    <button type="button" onClick={() => handleRefresh(row.id)} className="p-1.5 rounded text-[var(--muted)] hover:bg-white/10 hover:text-[var(--foreground)]" title="Refresh (set last updated to now)"><RefreshCw className="h-4 w-4" /></button>
                    <button type="button" onClick={() => handleDelete(row.id)} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--error)]" title="Delete"><Trash2 className="h-4 w-4" /></button>
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
