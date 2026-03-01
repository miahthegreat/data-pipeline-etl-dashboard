import { useEffect, useState } from "react";
import { api, type AlertRule, type Pipeline, type AlertCheckResult, type AlertDelivery } from "../api";
import { Bell, Plus, Trash2, Play, Loader2 } from "lucide-react";

export default function Alerts() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<AlertCheckResult | null>(null);
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"run_failed" | "freshness_stale">("run_failed");
  const [formWebhook, setFormWebhook] = useState("");
  const [formPipelineId, setFormPipelineId] = useState<number | "">("");
  const [formEnabled, setFormEnabled] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([api.alertRules(), api.pipelines(), api.alertDeliveries(50)])
      .then(([r, p, d]) => {
        setRules(r);
        setPipelines(p);
        setDeliveries(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCheck = () => {
    setChecking(true);
    setCheckResult(null);
    api
      .alertsCheck(24)
      .then(setCheckResult)
      .catch((e) => setError(e.message))
      .finally(() => setChecking(false));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    api
      .alertRuleCreate({
        name: formName,
        alert_type: formType,
        webhook_url: formWebhook || undefined,
        pipeline_id: formPipelineId === "" ? undefined : formPipelineId,
        enabled: formEnabled,
      })
      .then(() => {
        setShowForm(false);
        setFormName("");
        setFormWebhook("");
        setFormPipelineId("");
        setFormEnabled(true);
        load();
      })
      .catch((e) => setError(e.message));
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this alert rule?")) return;
    api
      .alertRuleDelete(id)
      .then(load)
      .catch((e) => setError(e.message));
  };

  const pipelineName = (id: number | null) =>
    id == null ? "All" : pipelines.find((p) => p.id === id)?.name ?? `Pipeline ${id}`;

  if (error) return <div className="text-[var(--error)]">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Alerting</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-white/5 disabled:opacity-50"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Check & send (24h)
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add rule
          </button>
        </div>
      </div>

      {checkResult && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-sm">
          <p>Failed runs (24h): {checkResult.run_failed_count}</p>
          <p>Stale datasets: {checkResult.freshness_stale_count}</p>
          <p className="text-[var(--accent)]">Alerts sent: {checkResult.alerts_sent}</p>
        </div>
      )}

      {deliveries.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <h2 className="p-4 border-b border-[var(--border)] font-medium">Recent deliveries</h2>
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                  <th className="text-left p-3 font-medium">Rule ID</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Incident</th>
                  <th className="text-left p-3 font-medium">Delivered at</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/5">
                    <td className="p-3 font-mono">{d.alert_rule_id}</td>
                    <td className="p-3">{d.incident_type}</td>
                    <td className="p-3 font-mono text-[var(--muted)]">{d.incident_id}</td>
                    <td className="p-3 text-[var(--muted)]">{new Date(d.delivered_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3 max-w-md">
          <h2 className="font-medium">New alert rule</h2>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Slack #data-alerts"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Trigger</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as "run_failed" | "freshness_stale")}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            >
              <option value="run_failed">Run failed</option>
              <option value="freshness_stale">Data freshness stale</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Webhook URL (optional; uses default if blank)</label>
            <input
              value={formWebhook}
              onChange={(e) => setFormWebhook(e.target.value)}
              type="url"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="https://hooks.slack.com/..."
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Pipeline (optional)</label>
            <select
              value={formPipelineId}
              onChange={(e) => setFormPipelineId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All pipelines</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formEnabled}
              onChange={(e) => setFormEnabled(e.target.checked)}
              className="rounded border-[var(--border)]"
            />
            Enabled
          </label>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-[var(--muted)]">Loading…</div>
      ) : (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Trigger</th>
                <th className="text-left p-3 font-medium">Pipeline</th>
                <th className="text-left p-3 font-medium">Webhook</th>
                <th className="text-left p-3 font-medium">Enabled</th>
                <th className="text-left p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/5">
                  <td className="p-3">{rule.name}</td>
                  <td className="p-3">{rule.alert_type}</td>
                  <td className="p-3 text-[var(--muted)]">{pipelineName(rule.pipeline_id)}</td>
                  <td className="p-3 font-mono text-[var(--muted)] max-w-xs truncate" title={rule.webhook_url ?? "default"}>
                    {rule.webhook_url ? "Set" : "default"}
                  </td>
                  <td className="p-3">{rule.enabled ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(rule.id)}
                      className="text-[var(--muted)] hover:text-[var(--error)]"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rules.length === 0 && !showForm && (
            <div className="p-8 text-center text-[var(--muted)]">
              No alert rules. Add one to get notified when runs fail or data goes stale.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
