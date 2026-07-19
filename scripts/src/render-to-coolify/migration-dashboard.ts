/**
 * Generates migration dashboard HTML from dashboard-latest.json snapshot.
 */
import type { BackendSnapshot } from "./probes.js";

export type DashboardData = {
  generated_at: string;
  canary_percent: number;
  stage_index: number;
  stable_since: string | null;
  degraded: boolean;
  degradation_reason: string | null;
  overall_score: number;
  render: BackendSnapshot;
  coolify: BackendSnapshot;
  database: {
    render?: Record<string, number>;
    coolify?: Record<string, number>;
    row_delta: number | null;
  };
  redis: {
    render?: { available: boolean; error?: string };
    worker?: { available: boolean; error?: string };
  };
  worker?: {
    url: string;
    health?: { available: boolean; error?: string };
  };
  next_stage: number | null;
  stages: number[];
};

function scoreColor(score: number): string {
  if (score >= 85) return "#22c55e";
  if (score >= 65) return "#eab308";
  return "#ef4444";
}

function statusCell(r?: { ok: boolean; status: number; latencyMs: number }): string {
  if (!r) return '<td class="muted">—</td>';
  const cls = r.ok ? "ok" : r.status >= 500 ? "err" : "warn";
  return `<td class="${cls}">${r.status} (${r.latencyMs}ms)</td>`;
}

export function generateDashboardHtml(data: DashboardData): string {
  const r = data.render;
  const c = data.coolify;
  const dbR = data.database.render;
  const dbC = data.database.coolify;

  const stageBar = data.stages
    .map((s) => {
      const active = s === data.canary_percent;
      const done = data.stages.indexOf(s) < data.stage_index;
      return `<span class="stage ${active ? "active" : ""} ${done ? "done" : ""}">${s}%</span>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="60" />
  <title>AmyNest Migration Dashboard</title>
  <style>
    :root { font-family: system-ui, sans-serif; background: #0f1117; color: #e8eaed; }
    body { margin: 0; padding: 24px; max-width: 1200px; }
    h1 { font-size: 1.4rem; margin: 0 0 8px; }
    .meta { color: #9aa0a6; font-size: 0.85rem; margin-bottom: 20px; }
    .score-ring { font-size: 2.5rem; font-weight: 700; color: ${scoreColor(data.overall_score)}; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
    .card { background: #1a1d27; border: 1px solid #2d3148; border-radius: 8px; padding: 16px; }
    .card h2 { margin: 0 0 12px; font-size: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #2d3148; }
    th { color: #9aa0a6; font-weight: 500; }
    .ok { color: #22c55e; }
    .warn { color: #eab308; }
    .err { color: #ef4444; }
    .muted { color: #6b7280; }
    .stages { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
    .stage { padding: 4px 10px; border-radius: 4px; background: #2d3148; font-size: 0.8rem; }
    .stage.active { background: #3b82f6; color: #fff; }
    .stage.done { background: #14532d; color: #bbf7d0; }
    .alert { background: #451a1a; border: 1px solid #ef4444; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
    .bar { height: 8px; background: #2d3148; border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .bar-fill { height: 100%; background: #3b82f6; }
  </style>
</head>
<body>
  <h1>AmyNest Render → Coolify Migration</h1>
  <p class="meta">Updated ${data.generated_at} · auto-refresh 60s · Canary ${data.canary_percent}% to Coolify</p>

  ${
    data.degraded
      ? `<div class="alert"><strong>Degraded</strong> — ${data.degradation_reason ?? "unknown"}<br>See <code>rollback-instructions.md</code></div>`
      : ""
  }

  <div class="card" style="margin-bottom:16px">
    <h2>Overall migration health</h2>
    <div class="score-ring">${data.overall_score}/100</div>
    <div class="stages">${stageBar}</div>
    <div class="bar"><div class="bar-fill" style="width:${data.canary_percent}%"></div></div>
    <p class="meta">Stable since: ${data.stable_since ?? "—"} · Next: ${data.next_stage != null ? `${data.next_stage}%` : "100% complete"}</p>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Backend — Render (${r.score}/100)</h2>
      <table>
        <tr><th>Check</th><th>Result</th></tr>
        <tr><td>/health</td>${statusCell(r.health)}</tr>
        <tr><td>/ready</td>${statusCell(r.ready)}</tr>
        <tr><td>Firebase login</td>${statusCell(r.parentProfile)}</tr>
        <tr><td>Parent profile</td>${statusCell(r.parentProfile)}</tr>
        <tr><td>Children</td>${statusCell(r.children)}</tr>
        <tr><td>Subscription</td>${statusCell(r.subscription)}</tr>
        <tr><td>Speech Coach</td>${statusCell(r.speechCoach)}</tr>
        <tr><td>Routine gen</td>${statusCell(r.routineGen)}</tr>
        <tr><td>AI enqueue</td>${statusCell(r.aiEnqueue)}</tr>
        <tr><td>GCS</td>${statusCell(r.gcsAudio)}</tr>
        <tr><td>RC webhook</td>${statusCell(r.rcWebhook)}</tr>
        <tr><td>5xx rate</td><td>${(r.error5xxRate * 100).toFixed(1)}%</td></tr>
        <tr><td>p95 latency</td><td>${r.latencyP95Ms}ms</td></tr>
      </table>
    </div>

    <div class="card">
      <h2>Backend — Coolify (${c.score}/100)</h2>
      <table>
        <tr><th>Check</th><th>Result</th></tr>
        <tr><td>/health</td>${statusCell(c.health)}</tr>
        <tr><td>/ready</td>${statusCell(c.ready)}</tr>
        <tr><td>Firebase login</td>${statusCell(c.parentProfile)}</tr>
        <tr><td>Parent profile</td>${statusCell(c.parentProfile)}</tr>
        <tr><td>Children</td>${statusCell(c.children)}</tr>
        <tr><td>Subscription</td>${statusCell(c.subscription)}</tr>
        <tr><td>Speech Coach</td>${statusCell(c.speechCoach)}</tr>
        <tr><td>Routine gen</td>${statusCell(c.routineGen)}</tr>
        <tr><td>AI enqueue</td>${statusCell(c.aiEnqueue)}</tr>
        <tr><td>GCS</td>${statusCell(c.gcsAudio)}</tr>
        <tr><td>RC webhook</td>${statusCell(c.rcWebhook)}</tr>
        <tr><td>5xx rate</td><td>${(c.error5xxRate * 100).toFixed(1)}%</td></tr>
        <tr><td>p95 latency</td><td>${c.latencyP95Ms}ms</td></tr>
      </table>
    </div>

    <div class="card">
      <h2>Database rows</h2>
      <table>
        <tr><th>Table</th><th>Render</th><th>Coolify</th><th>Δ</th></tr>
        <tr><td>Total rows</td><td>${dbR?.__total_rows?.toLocaleString() ?? "—"}</td><td>${dbC?.__total_rows?.toLocaleString() ?? "—"}</td><td>${data.database.row_delta ?? "—"}</td></tr>
        <tr><td>parent_profiles</td><td>${dbR?.parent_profiles ?? "—"}</td><td>${dbC?.parent_profiles ?? "—"}</td><td>${(dbC?.parent_profiles ?? 0) - (dbR?.parent_profiles ?? 0)}</td></tr>
        <tr><td>subscriptions</td><td>${dbR?.subscriptions ?? "—"}</td><td>${dbC?.subscriptions ?? "—"}</td><td>${(dbC?.subscriptions ?? 0) - (dbR?.subscriptions ?? 0)}</td></tr>
        <tr><td>children</td><td>${dbR?.children ?? "—"}</td><td>${dbC?.children ?? "—"}</td><td>${(dbC?.children ?? 0) - (dbR?.children ?? 0)}</td></tr>
        <tr><td>analytics_events</td><td>${dbR?.analytics_events?.toLocaleString() ?? "—"}</td><td>${dbC?.analytics_events?.toLocaleString() ?? "—"}</td><td>${(dbC?.analytics_events ?? 0) - (dbR?.analytics_events ?? 0)}</td></tr>
      </table>
    </div>

    <div class="card">
      <h2>Redis & Worker</h2>
      <table>
        <tr><th>Component</th><th>Status</th></tr>
        <tr><td>Worker alive</td><td class="${data.worker?.health?.available ? "ok" : "muted"}">${data.worker?.health?.available ? "yes" : data.worker?.url ?? "not configured"}</td></tr>
        <tr><td>BullMQ active</td><td class="${data.redis.worker?.available ? "ok" : "muted"}">${data.redis.worker?.available ? "yes" : "—"}</td></tr>
        <tr><td>Processing jobs</td><td class="muted">see worker /health + AI enqueue</td></tr>
      </table>
    </div>
  </div>

  <p class="meta">Serve: <code>pnpm run migrate:render-to-coolify:dashboard:serve</code> · Data: dashboard-latest.json</p>
</body>
</html>`;
}
