import { repairKnowledgeGraphDocument } from "@workspace/knowledge-graph";
import type { LearningEventInput } from "@workspace/learning-events";
import type { PlatformHarness } from "./harness.js";
import type { DataLossRisk, RepairActionLog } from "./types.js";

function logRepair(
  reason: string,
  actions: string[],
  started: number,
  dataLossRisk: DataLossRisk,
): RepairActionLog {
  return {
    reason,
    actions,
    durationMs: Math.max(0, now() - started),
    dataLossRisk,
    at: new Date().toISOString(),
  };
}

function now(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

/** Repair corrupt / partial KG persistence and reload API. */
export function healCorruptKnowledgeGraph(harness: PlatformHarness): RepairActionLog {
  const t0 = now();
  const raw = harness.persistence.readRaw();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = raw; // keep string marker
  }
  const result = repairKnowledgeGraphDocument(
    parsed,
    harness.childId,
    harness.seedEntities,
  );
  harness.persistence.save(result.doc);
  harness.killAndReload();
  return logRepair(
    result.reason,
    ["heal_corrupt_kg", ...result.actions, "reload_harness"],
    t0,
    result.dataLossRisk,
  );
}

/** Drop invalid event inputs before publish. */
export function sanitizeEventInput(
  input: LearningEventInput,
): { ok: true; input: LearningEventInput } | { ok: false; reason: string } {
  if (!input?.type || !input.payload?.childId) {
    return { ok: false, reason: "missing type or childId" };
  }
  if (typeof input.payload.childId !== "string" && typeof input.payload.childId !== "number") {
    return { ok: false, reason: "invalid childId" };
  }
  return {
    ok: true,
    input: {
      ...input,
      payload: {
        ...input.payload,
        childId: String(input.payload.childId),
        metadata: input.payload.metadata ?? {},
      },
    },
  };
}

/** Ensure catalog nodes exist after seed drift. */
export function healMissingNodes(harness: PlatformHarness): RepairActionLog {
  const t0 = now();
  const before = Object.keys(harness.getKg().getDocument().nodes).length;
  harness.getKg().ensureSeeded(harness.seedEntities);
  const after = Object.keys(harness.getKg().getDocument().nodes).length;
  return logRepair(
    "Ensure seed catalog nodes present",
    [`ensure_seeded`, `nodes:${before}->${after}`],
    t0,
    after < before ? "medium" : "none",
  );
}

/** Flush offline queue after reconnect; clear stuck offline if online. */
export function healOfflineQueue(harness: PlatformHarness): RepairActionLog {
  const t0 = now();
  harness.setOnline(true);
  const flushed = harness.bus.flushOffline();
  const remaining = harness.bus.getOfflineQueue().length;
  return logRepair(
    "Flush offline learning events",
    [`flushOffline:${flushed}`, `remaining:${remaining}`],
    t0,
    remaining > 0 ? "low" : "none",
  );
}

/** Clear decision history pollution from ignore echoes (harness-level). */
export function healStaleDecisions(harness: PlatformHarness): RepairActionLog {
  const t0 = now();
  const before = harness.decisions.length;
  const kept = harness.decisions.filter((d) => d.ruleId !== "runtime.ignore_echo");
  harness.decisions.length = 0;
  harness.decisions.push(...kept);
  return logRepair(
    "Remove stale ignore-echo decisions",
    [`removed:${before - kept.length}`],
    t0,
    "none",
  );
}

/** Full recovery sweep used after chaos. */
export function healPlatform(harness: PlatformHarness): RepairActionLog[] {
  const logs: RepairActionLog[] = [];
  logs.push(healCorruptKnowledgeGraph(harness));
  logs.push(healMissingNodes(harness));
  logs.push(healOfflineQueue(harness));
  logs.push(healStaleDecisions(harness));
  return logs;
}
