/**
 * Dashboard data for CTR learning (JSON + HTML).
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { isTrustedSample } from "./ingest.js";
import { CTR_LONG_TERM_TARGET, CTR_TARGET } from "./optimize.js";
import type {
  ThumbnailLearningDashboard,
  ThumbnailLearningPatterns,
  ThumbnailLearningRecord,
} from "./types.js";

export function buildDashboard(
  records: ThumbnailLearningRecord[],
  patterns: ThumbnailLearningPatterns,
): ThumbnailLearningDashboard {
  const trusted = records.filter((r) => isTrustedSample(r));
  const averageCtr =
    trusted.length === 0
      ? 0
      : trusted.reduce((s, r) => s + r.outcomes.ctr, 0) / trusted.length;

  const byDay = new Map<string, number[]>();
  for (const record of trusted) {
    const day = record.features.day;
    const list = byDay.get(day) ?? [];
    list.push(record.outcomes.ctr);
    byDay.set(day, list);
  }
  const ctrTrend = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, ctrs]) => ({
      day,
      averageCtr: ctrs.reduce((s, n) => s + n, 0) / ctrs.length,
      videos: ctrs.length,
    }));

  const headlineBuckets = new Map<string, number[]>();
  for (const record of trusted) {
    const h = record.features.headline;
    const list = headlineBuckets.get(h) ?? [];
    list.push(record.outcomes.ctr);
    headlineBuckets.set(h, list);
  }
  const winningHeadlines = [...headlineBuckets.entries()]
    .map(([headline, ctrs]) => ({
      headline,
      averageCtr: ctrs.reduce((s, n) => s + n, 0) / ctrs.length,
      sampleSize: ctrs.length,
    }))
    .sort((a, b) => b.averageCtr - a.averageCtr)
    .slice(0, 20);

  return {
    averageCtr,
    ctrTrend,
    winningEmotions: patterns.emotions.slice(0, 8),
    winningColors: patterns.colors.slice(0, 8),
    winningLayouts: patterns.layouts.slice(0, 8),
    winningCharacters: patterns.characters.slice(0, 8),
    winningHeadlines,
    sampleSize: trusted.length,
    targetCtr: CTR_TARGET,
    longTermTargetCtr: CTR_LONG_TERM_TARGET,
  };
}

export function writeDashboardHtml(
  dashboard: ThumbnailLearningDashboard,
  outputDir: string,
): string {
  const path = join(outputDir, "thumbnail-learning-dashboard.html");
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
  const list = (items: Array<{ value?: string; headline?: string; averageCtr: number; sampleSize: number }>) =>
    items
      .map(
        (i) =>
          `<li><strong>${i.value ?? i.headline}</strong> — ${pct(i.averageCtr)} <span class="n">n=${i.sampleSize}</span></li>`,
      )
      .join("\n");

  const trendRows = dashboard.ctrTrend
    .map(
      (t) =>
        `<tr><td>${t.day}</td><td>${pct(t.averageCtr)}</td><td>${t.videos}</td></tr>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AmyNest Thumbnail Learning Dashboard</title>
  <style>
    :root { --bg:#120B2E; --card:#1e1248; --text:#F8F4FF; --gold:#F6D57A; --purple:#6A2CFF; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 32px; }
    h1 { color: var(--gold); margin: 0 0 8px; }
    .sub { opacity: 0.8; margin-bottom: 28px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .card { background: var(--card); border-radius: 16px; padding: 18px 20px; border: 1px solid rgba(201,182,255,0.2); }
    .metric { font-size: 2rem; font-weight: 700; color: var(--gold); }
    .label { opacity: 0.75; font-size: 0.85rem; }
    ul { padding-left: 18px; } li { margin: 6px 0; } .n { opacity: 0.55; font-size: 0.85rem; }
    table { width: 100%; border-collapse: collapse; } td, th { text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .ok { color: #7dffa0; } .warn { color: var(--gold); }
  </style>
</head>
<body>
  <h1>Thumbnail Learning Dashboard</h1>
  <p class="sub">Real YouTube Analytics only · Target ${pct(dashboard.targetCtr)} · Long-term ${pct(dashboard.longTermTargetCtr)}</p>
  <div class="grid">
    <div class="card"><div class="label">Average CTR</div><div class="metric ${dashboard.averageCtr >= dashboard.targetCtr ? "ok" : "warn"}">${pct(dashboard.averageCtr)}</div></div>
    <div class="card"><div class="label">Trusted sample size</div><div class="metric">${dashboard.sampleSize}</div></div>
  </div>
  <div class="grid" style="margin-top:16px">
    <div class="card"><h3>Winning emotions</h3><ul>${list(dashboard.winningEmotions)}</ul></div>
    <div class="card"><h3>Winning colors</h3><ul>${list(dashboard.winningColors)}</ul></div>
    <div class="card"><h3>Winning layouts</h3><ul>${list(dashboard.winningLayouts)}</ul></div>
    <div class="card"><h3>Winning characters</h3><ul>${list(dashboard.winningCharacters)}</ul></div>
    <div class="card"><h3>Winning headlines</h3><ul>${list(dashboard.winningHeadlines)}</ul></div>
  </div>
  <div class="card" style="margin-top:16px">
    <h3>CTR trend</h3>
    <table><thead><tr><th>Day</th><th>Avg CTR</th><th>Videos</th></tr></thead><tbody>${trendRows || "<tr><td colspan=3>No trusted data yet</td></tr>"}</tbody></table>
  </div>
</body>
</html>`;

  writeFileSync(path, html, "utf8");
  writeFileSync(
    join(outputDir, "thumbnail-learning-dashboard.json"),
    JSON.stringify(dashboard, null, 2),
    "utf8",
  );
  return path;
}
