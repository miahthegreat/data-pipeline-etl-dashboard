import { BookOpen } from "lucide-react";

export default function Docs() {
  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <BookOpen className="h-7 w-7 text-[var(--accent)]" />
        Getting started
      </h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recording runs</h2>
        <p className="text-[var(--muted)]">
          Record pipeline runs so they appear in Job runs and can trigger alerts. From a pipeline’s detail page, use <strong>Record run</strong> to add a run manually. Or call the API from your scheduler (cron, Airflow, dbt):
        </p>
        <pre className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-mono overflow-x-auto">
{`POST /api/runs
Content-Type: application/json

{
  "pipeline_id": 1,
  "status": "success",
  "started_at": "2025-02-28T12:00:00Z",
  "finished_at": "2025-02-28T12:02:00Z",
  "duration_seconds": 120,
  "rows_affected": 5000
}`}
        </pre>
        <p className="text-sm text-[var(--muted)]">
          <code className="bg-[var(--surface)] px-1 rounded">status</code> must be one of: <code className="bg-[var(--surface)] px-1 rounded">pending</code>, <code className="bg-[var(--surface)] px-1 rounded">running</code>, <code className="bg-[var(--surface)] px-1 rounded">success</code>, <code className="bg-[var(--surface)] px-1 rounded">failed</code>. For failures, include <code className="bg-[var(--surface)] px-1 rounded">error_message</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Setting up alerts</h2>
        <p className="text-[var(--muted)]">
          Go to <strong>Alerting</strong> and add a rule. Choose trigger: <strong>Run failed</strong> or <strong>Data freshness stale</strong>. Optionally set a webhook URL (e.g. Slack incoming webhook) or use the default from <code className="bg-[var(--surface)] px-1 rounded">SLACK_WEBHOOK_URL</code>. You can scope a rule to one pipeline or leave it for all.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Click <strong>Check & send (24h)</strong> to run the check manually. In production, the backend runs the check on a schedule (see <code className="bg-[var(--surface)] px-1 rounded">ALERT_CHECK_INTERVAL_MINUTES</code>).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Data freshness</h2>
        <p className="text-[var(--muted)]">
          On <strong>Data freshness</strong> you can add records for each dataset you care about: pipeline, dataset name, and optional SLA (expected refresh interval in hours). Use <strong>Refresh</strong> to set “last updated” to now when a pipeline has successfully updated the data. Stale datasets (past their SLA) appear in the list and can trigger freshness-stale alerts.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Create records via the UI or <code className="bg-[var(--surface)] px-1 rounded">POST /api/freshness</code>. Update “last updated” with <code className="bg-[var(--surface)] px-1 rounded">POST /api/freshness/:id/refresh</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">API overview</h2>
        <ul className="text-sm text-[var(--muted)] space-y-1 list-disc list-inside">
          <li><code className="bg-[var(--surface)] px-1 rounded">GET /api/health</code> — Health check</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">GET /api/pipelines</code> — List pipelines</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">GET /api/runs</code> — List runs (optional <code className="bg-[var(--surface)] px-1 rounded">pipeline_id</code>, <code className="bg-[var(--surface)] px-1 rounded">status</code>, <code className="bg-[var(--surface)] px-1 rounded">limit</code>)</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">POST /api/runs</code> — Record a run</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">GET /api/freshness</code> — List freshness (optional <code className="bg-[var(--surface)] px-1 rounded">pipeline_id</code>, <code className="bg-[var(--surface)] px-1 rounded">stale_only</code>)</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">POST /api/freshness</code> — Create freshness record</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">POST /api/freshness/:id/refresh</code> — Set last updated to now</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">GET /api/dashboard/summary</code> — Overview counts</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">GET /api/dashboard/runs-trend?days=7</code> — Daily run counts</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">GET /api/dashboard/metrics?days=7</code> — Success rate and slowest pipelines</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">GET /api/alerts</code> — Alert rules</li>
          <li><code className="bg-[var(--surface)] px-1 rounded">POST /api/alerts/check?hours=24</code> — Run alert check</li>
        </ul>
        <p className="text-sm text-[var(--muted)]">
          Full request/response docs: run the backend and open <code className="bg-[var(--surface)] px-1 rounded">/docs</code> (Swagger).
        </p>
      </section>
    </div>
  );
}
