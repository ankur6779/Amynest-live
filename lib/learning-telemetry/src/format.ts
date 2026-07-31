import type { TelemetrySnapshot } from "./types.js";
import { ALERT_DEFINITIONS } from "./alerts.js";

export function formatTelemetryReport(snap: TelemetrySnapshot): string {
  const lines: string[] = [];
  lines.push("=== Amy Learning Platform — Telemetry Dashboard ===");
  lines.push(
    `Health ${snap.healthScore}/100 · uptime ${Math.round(snap.uptimeMs / 1000)}s · ${snap.at}`,
  );
  lines.push("");
  lines.push("Runtime:");
  lines.push(
    `  decisions=${snap.runtime.decisions} latency p95=${snap.decisionLatency.p95Ms.toFixed(2)}ms max=${snap.decisionLatency.maxMs.toFixed(2)}ms`,
  );
  lines.push(
    `  rules eval=${snap.runtime.ruleEvaluations} match=${snap.runtime.ruleMatches} cooldown=${snap.runtime.cooldownHits} fail=${snap.runtime.ruleFailures}`,
  );
  lines.push(
    `  recs offered=${snap.runtime.recommendationOffered} accept=${snap.runtime.recommendationAccepted} ignore=${snap.runtime.recommendationIgnored}`,
  );
  lines.push(
    `  reviewQueue last=${snap.runtime.reviewQueueLast} max=${snap.runtime.reviewQueueMax} kgUpdates=${snap.runtime.knowledgeUpdates} attentionΔ=${snap.runtime.attentionTransitions}`,
  );
  lines.push("");
  lines.push("Event bus:");
  lines.push(
    `  publish=${snap.bus.publishes} dupesBlocked=${snap.bus.duplicatesPrevented} replay=${snap.bus.replays}`,
  );
  lines.push(
    `  queue last=${snap.bus.queueDepthLast} max=${snap.bus.queueDepthMax} flushes=${snap.bus.flushes} flushMax=${snap.bus.flushDurationMaxMs.toFixed(2)}ms`,
  );
  lines.push(
    `  offlineTotalMs=${snap.bus.offlineDurationTotalMs} lastOfflineMs=${snap.bus.offlineDurationLastMs}`,
  );
  lines.push("");
  lines.push("Knowledge graph:");
  lines.push(
    `  nodes=${snap.kg.nodeCount} edges=${snap.kg.edgeCount} snapshot=${snap.kg.snapshotBytes}B max=${snap.kg.snapshotBytesMax}B`,
  );
  lines.push(
    `  repairs=${snap.kg.repairCount} migrations=${snap.kg.migrationCount} growth=${snap.kg.storageGrowthBytes}B`,
  );
  lines.push("");
  lines.push("Performance:");
  lines.push(
    `  heap=${snap.perf.heapUsedMb ?? "n/a"}/${snap.perf.heapTotalMb ?? "n/a"} MB · fps=${snap.perf.fps ?? "n/a"} · audioLatency=${snap.perf.audioLatencyMs ?? "n/a"}ms · bundle=${snap.perf.bundleLoadMs ?? "n/a"}ms`,
  );
  lines.push("");
  if (snap.topSlowRules.length) {
    lines.push("Top slow rules:");
    for (const r of snap.topSlowRules.slice(0, 5)) {
      lines.push(
        `  ${r.ruleId} avg=${r.avgMs.toFixed(2)}ms max=${r.maxMs.toFixed(2)}ms n=${r.count}`,
      );
    }
    lines.push("");
  }
  if (snap.warnings.length) {
    lines.push("Warnings:");
    for (const w of snap.warnings) lines.push(`  ! ${w}`);
    lines.push("");
  }
  lines.push("Alert definitions:");
  for (const d of ALERT_DEFINITIONS) {
    lines.push(`  [${d.severity}] ${d.id} — ${d.description}`);
  }
  return lines.join("\n");
}
