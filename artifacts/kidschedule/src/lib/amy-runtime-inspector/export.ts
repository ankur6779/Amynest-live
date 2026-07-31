import type { RuntimeTraceFrame } from "@workspace/learning-runtime";
import { DEFAULT_RUNTIME_RULES } from "@workspace/learning-runtime";
import {
  filterFrames,
  getInspectorActiveFrame,
  getInspectorFrames,
} from "./trace-store";
import { replayTraceFrames } from "./time-travel";

function downloadJson(filename: string, value: unknown): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRuntimeSession(childId?: string): void {
  const active = getInspectorActiveFrame();
  const id = childId ?? active?.childId ?? "unknown";
  const sessionId = active?.sessionId ?? null;
  const frames = filterFrames({
    childId: id,
    sessionId: sessionId ?? undefined,
  });
  downloadJson(`amy-runtime-session-${id}-${Date.now()}.json`, {
    kind: "amy_runtime_session",
    exportedAt: new Date().toISOString(),
    childId: id,
    sessionId,
    frameCount: frames.length,
    frames,
  });
}

export function exportRuntimeTrace(childId?: string): void {
  const frames = childId
    ? filterFrames({ childId })
    : [...getInspectorFrames()];
  downloadJson(`amy-runtime-trace-${Date.now()}.json`, {
    kind: "amy_runtime_trace",
    exportedAt: new Date().toISOString(),
    frameCount: frames.length,
    frames: frames.map(summarizeFrame),
  });
}

export function exportRuleEvaluation(frame?: RuntimeTraceFrame | null): void {
  const target = frame ?? getInspectorActiveFrame();
  if (!target) return;
  const replay = replayTraceFrames("event");
  downloadJson(`amy-runtime-rules-${target.id}.json`, {
    kind: "amy_runtime_rule_evaluation",
    exportedAt: new Date().toISOString(),
    frameId: target.id,
    eventType: target.event.type,
    matchedRules: target.matchedRules,
    skippedRules: target.skippedRules,
    ruleDependencies: target.ruleDependencies,
    decision: target.decision,
    replayDecision: replay.decisions[0] ?? null,
    catalog: DEFAULT_RUNTIME_RULES.map((r) => ({
      id: r.id,
      priority: r.priority,
      cooldownMs: r.cooldownMs,
      dependsOn: r.dependsOn,
      featureFlag: r.featureFlag,
    })),
  });
}

function summarizeFrame(f: RuntimeTraceFrame) {
  return {
    id: f.id,
    at: f.at,
    childId: f.childId,
    sessionId: f.sessionId,
    snapshotVersion: f.snapshotVersion,
    eventType: f.event.type,
    eventId: f.event.id,
    normalizedType: f.normalized.type,
    matchedRuleIds: f.matchedRules.map((m) => m.ruleId),
    skippedRuleIds: f.skippedRules.map((s) => s.ruleId),
    decisionRuleId: f.decision.ruleId,
    difficulty: f.decision.difficulty,
    breakSuggestion: f.decision.breakSuggestion,
    recommendation: f.decision.recommendation,
    reviewQueue: f.decision.reviewQueue,
    attentionState: f.attentionState,
    knowledgeDelta: f.knowledgeDelta,
    latencyMs: f.latencyMs,
    featureFlags: f.featureFlags,
  };
}
