import { learningItemEvent } from "@workspace/learning-events";
import { baselinePlay, createPlatformHarness, type PlatformHarness } from "./harness.js";
import {
  healCorruptKnowledgeGraph,
  healMissingNodes,
  healOfflineQueue,
  healPlatform,
  healStaleDecisions,
  sanitizeEventInput,
} from "./heal.js";
import { verifyAll } from "./verify.js";
import type {
  FailureKind,
  RepairActionLog,
  ScenarioResult,
  ScenarioStatus,
} from "./types.js";

function elapsed(t0: number): number {
  const t1 =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  return Math.max(0, t1 - t0);
}

function statusFromChecks(
  checks: ScenarioResult["checks"],
  repairs: RepairActionLog[],
): ScenarioStatus {
  const failed = checks.filter((c) => !c.ok);
  if (failed.length === 0) {
    const healed = repairs.some((r) =>
      r.actions.some(
        (a) =>
          a.startsWith("heal_") ||
          a.startsWith("replace_") ||
          a.startsWith("rebuild_") ||
          a === "reseed_empty" ||
          a.startsWith("drop_dangling") ||
          a.startsWith("flushOffline"),
      ),
    );
    return healed ? "healed" : "pass";
  }
  if (
    failed.every(
      (f) =>
        f.domain === "recommendation_stability" ||
        f.domain === "cloud_reconciliation",
    )
  ) {
    return "warn";
  }
  return "fail";
}

function runScenario(
  id: FailureKind,
  title: string,
  inject: (h: PlatformHarness) => RepairActionLog[],
  suggestedFixes: string[],
): ScenarioResult {
  const t0 =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  const harness = createPlatformHarness({ childId: `chaos-${id}` });
  baselinePlay(harness);
  const repairs = inject(harness);
  const checks = verifyAll(harness);
  const status = statusFromChecks(checks, repairs);
  return {
    id,
    title,
    status,
    durationMs: elapsed(t0),
    repairs,
    checks,
    notes: repairs.map((r) => `${r.reason} (${r.dataLossRisk})`),
    suggestedFixes: status === "fail" || status === "warn" ? suggestedFixes : [],
  };
}

export function scenarioAppKill(): ScenarioResult {
  return runScenario(
    "app_kill",
    "App kill mid-session",
    (h) => {
      h.killAndReload();
      const repairs = [healMissingNodes(h), healStaleDecisions(h)];
      h.publish(
        learningItemEvent("learning.item_heard", {
          childId: h.childId,
          module: "animal_world",
          entityId: "tiger",
        }),
      );
      return repairs;
    },
    ["Ensure KG persistence flush before background suspend"],
  );
}

export function scenarioBrowserRefresh(): ScenarioResult {
  return runScenario(
    "browser_refresh",
    "Browser refresh reload",
    (h) => {
      h.killAndReload();
      return healPlatform(h);
    },
    ["Persist runtime sessionId alongside KG document"],
  );
}

export function scenarioTabCrash(): ScenarioResult {
  return runScenario(
    "tab_crash",
    "Tab crash with partial persist",
    (h) => {
      const raw = h.persistence.readRaw() ?? "{}";
      // Truncate mid-JSON to simulate crash during write
      h.persistence.corrupt(raw.slice(0, Math.max(10, Math.floor(raw.length * 0.4))));
      return [healCorruptKnowledgeGraph(h)];
    },
    ["Use atomic write (temp file + rename) for localStorage wrappers"],
  );
}

export function scenarioStorageCorruption(): ScenarioResult {
  return runScenario(
    "storage_corruption",
    "Storage corruption (garbage JSON)",
    (h) => {
      h.persistence.corrupt("{not-json:::@@@");
      return [healCorruptKnowledgeGraph(h), healMissingNodes(h)];
    },
    ["Quarantine corrupt keys under amynest:knowledge-graph:corrupt:*"],
  );
}

export function scenarioPartialWrites(): ScenarioResult {
  return runScenario(
    "partial_writes",
    "Partial document writes",
    (h) => {
      h.persistence.corrupt(JSON.stringify({ version: 1, childId: h.childId }));
      return [healCorruptKnowledgeGraph(h)];
    },
    ["Validate document schema before replacing previous snapshot"],
  );
}

export function scenarioDuplicateEvents(): ScenarioResult {
  return runScenario(
    "duplicate_events",
    "Duplicate event delivery",
    (h) => {
      const input = learningItemEvent("learning.item_heard", {
        childId: h.childId,
        module: "animal_world",
        entityId: "cow",
      });
      input.id = "dup-fixed-id";
      h.publish(input);
      h.publish({ ...input, id: "dup-fixed-id" });
      h.publish({ ...input, id: "dup-fixed-id" });
      return [healStaleDecisions(h)];
    },
    ["Keep event id dedupe window across process restarts"],
  );
}

export function scenarioMissingEvents(): ScenarioResult {
  return runScenario(
    "missing_events",
    "Missing events (gap tolerance)",
    (h) => {
      // System never saw "seen" — only recognized; should still decide
      h.publish(
        learningItemEvent("learning.item_recognized", {
          childId: h.childId,
          module: "animal_world",
          entityId: "tiger",
          confidence: 88,
        }),
      );
      return [];
    },
    ["Backfill seen/heard from recognized when counts jump"],
  );
}

export function scenarioDelayedEvents(): ScenarioResult {
  return runScenario(
    "delayed_events",
    "Delayed / out-of-order offline flush",
    (h) => {
      h.setOnline(false);
      h.publish(
        learningItemEvent("learning.item_heard", {
          childId: h.childId,
          module: "animal_world",
          entityId: "tiger",
        }),
      );
      h.publish(
        learningItemEvent("learning.item_recognized", {
          childId: h.childId,
          module: "animal_world",
          entityId: "tiger",
          confidence: 91,
        }),
      );
      return [healOfflineQueue(h)];
    },
    ["Preserve seq order on flush (already required)"],
  );
}

export function scenarioOfflineHours(): ScenarioResult {
  return runScenario(
    "offline_hours",
    "Offline for extended period",
    (h) => {
      h.setOnline(false);
      for (let i = 0; i < 40; i++) {
        h.publish(
          learningItemEvent("learning.item_heard", {
            childId: h.childId,
            module: "animal_world",
            entityId: i % 2 === 0 ? "lion" : "cow",
          }),
        );
      }
      return [healOfflineQueue(h)];
    },
    ["Cap offline queue with priority retention for mastery events"],
  );
}

export function scenarioReconnectStorms(): ScenarioResult {
  return runScenario(
    "reconnect_storms",
    "Reconnect storms",
    (h) => {
      for (let i = 0; i < 12; i++) {
        h.setOnline(false);
        h.publish(
          learningItemEvent("learning.item_heard", {
            childId: h.childId,
            module: "discovery_worlds",
            entityId: "lion",
          }),
        );
        h.setOnline(true);
      }
      return [healOfflineQueue(h)];
    },
    ["Debounce online flush (100–300ms) to coalesce flaps"],
  );
}

export function scenarioLowMemory(): ScenarioResult {
  return runScenario(
    "low_memory",
    "Low memory (queue / history pressure)",
    (h) => {
      h.setOnline(false);
      for (let i = 0; i < 200; i++) {
        h.publish(
          learningItemEvent("learning.item_seen", {
            childId: h.childId,
            module: "games",
            entityId: `e-${i}`,
          }),
        );
      }
      const queued = h.bus.getOfflineQueue().length;
      const repairs = [healOfflineQueue(h)];
      if (queued > 80) {
        repairs.push({
          reason: "Offline queue exceeded soft cap under memory pressure",
          actions: [`observed_queue:${queued}`, "priority_drop_applied_by_bus"],
          durationMs: 0,
          dataLossRisk: "low",
          at: new Date().toISOString(),
        });
      }
      return repairs;
    },
    ["Trim history aggressively under low-memory signal"],
  );
}

export function scenarioSlowCpu(): ScenarioResult {
  return runScenario(
    "slow_cpu",
    "Slow CPU decision path",
    (h) => {
      const t0 =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      for (let i = 0; i < 30; i++) {
        h.publish(
          learningItemEvent("learning.item_recognized", {
            childId: h.childId,
            module: "animal_world",
            entityId: "lion",
            confidence: 80 + (i % 10),
          }),
        );
      }
      const t1 =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      const avg = (t1 - t0) / 30;
      return [
        {
          reason: "Batch decision latency sample",
          actions: [`avg_ms_per_event:${avg.toFixed(3)}`],
          durationMs: t1 - t0,
          dataLossRisk: "none",
          at: new Date().toISOString(),
        },
      ];
    },
    ["Keep tracer detached in production; avoid deep clones on hot path"],
  );
}

export function scenarioBatterySaver(): ScenarioResult {
  return runScenario(
    "battery_saver",
    "Battery saver (reduced processing)",
    (h) => {
      h.getRuntime().setFeatureFlags({
        "runtime.kg_recommend": false,
        "runtime.kg_review": false,
      });
      h.publish(
        learningItemEvent("learning.item_heard", {
          childId: h.childId,
          module: "animal_world",
          entityId: "lion",
        }),
      );
      return [
        {
          reason: "Disabled non-critical recommendation flags",
          actions: ["feature_flag:runtime.kg_recommend=false"],
          durationMs: 0,
          dataLossRisk: "none",
          at: new Date().toISOString(),
        },
      ];
    },
    ["Map OS battery-saver to runtime feature flags"],
  );
}

export function scenarioAudioInterruption(): ScenarioResult {
  return runScenario(
    "audio_interruption",
    "Audio interruption mid-session",
    (h) => {
      h.publish(
        learningItemEvent("learning.item_heard", {
          childId: h.childId,
          module: "animal_world",
          entityId: "lion",
          sessionId: "sess-a",
        }),
      );
      // New session after interrupt
      h.publish(
        learningItemEvent("learning.item_heard", {
          childId: h.childId,
          module: "animal_world",
          entityId: "tiger",
          sessionId: "sess-b",
        }),
      );
      const state = h.getRuntime().getState(h.childId);
      return [
        {
          reason: "Session reset after audio interrupt",
          actions: [`sessionId:${state.sessionId}`, `eventsInSession:${state.eventsInSession}`],
          durationMs: 0,
          dataLossRisk: "none",
          at: new Date().toISOString(),
        },
      ];
    },
    ["On audio focus loss, checkpoint mastery before tearing down session"],
  );
}

export function scenarioRouteInterruption(): ScenarioResult {
  return runScenario(
    "route_interruption",
    "Route interruption mid-decision",
    (h) => {
      // Invalid event then valid continue
      const bad = sanitizeEventInput({
        type: "learning.item_heard",
        payload: { childId: "", module: "system" },
      });
      const repairs: RepairActionLog[] = [];
      if (!bad.ok) {
        repairs.push({
          reason: "Dropped invalid event during route change",
          actions: [`reject:${bad.reason}`],
          durationMs: 0,
          dataLossRisk: "none",
          at: new Date().toISOString(),
        });
      }
      h.publish(
        learningItemEvent("learning.item_recognized", {
          childId: h.childId,
          module: "discovery_worlds",
          entityId: "cow",
          confidence: 90,
        }),
      );
      repairs.push(healStaleDecisions(h));
      return repairs;
    },
    ["Cancel in-flight decision work on route change; keep last good decision"],
  );
}

export const SCENARIO_REGISTRY: Record<FailureKind, () => ScenarioResult> = {
  app_kill: scenarioAppKill,
  browser_refresh: scenarioBrowserRefresh,
  tab_crash: scenarioTabCrash,
  storage_corruption: scenarioStorageCorruption,
  partial_writes: scenarioPartialWrites,
  duplicate_events: scenarioDuplicateEvents,
  missing_events: scenarioMissingEvents,
  delayed_events: scenarioDelayedEvents,
  offline_hours: scenarioOfflineHours,
  reconnect_storms: scenarioReconnectStorms,
  low_memory: scenarioLowMemory,
  slow_cpu: scenarioSlowCpu,
  battery_saver: scenarioBatterySaver,
  audio_interruption: scenarioAudioInterruption,
  route_interruption: scenarioRouteInterruption,
};

export const ALL_SCENARIO_RUNNERS: Array<() => ScenarioResult> = Object.values(
  SCENARIO_REGISTRY,
);
