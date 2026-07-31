import { KNOWLEDGE_GRAPH_VERSION } from "@workspace/knowledge-graph";
import type { PlatformHarness } from "./harness.js";
import type { VerifyDomain } from "./types.js";

export type CheckResult = {
  domain: VerifyDomain;
  ok: boolean;
  detail: string;
};

export function verifyKnowledgeGraph(harness: PlatformHarness): CheckResult {
  const doc = harness.getKg().getDocument();
  if (doc.version !== KNOWLEDGE_GRAPH_VERSION) {
    return {
      domain: "knowledge_graph",
      ok: false,
      detail: `schema version ${String(doc.version)} != ${KNOWLEDGE_GRAPH_VERSION}`,
    };
  }
  if (doc.childId !== harness.childId) {
    return {
      domain: "knowledge_graph",
      ok: false,
      detail: `childId mismatch ${doc.childId}`,
    };
  }
  for (const edge of doc.edges) {
    if (!doc.nodes[edge.from] || !doc.nodes[edge.to]) {
      return {
        domain: "knowledge_graph",
        ok: false,
        detail: `dangling edge ${edge.id}`,
      };
    }
  }
  for (const nodeId of Object.keys(doc.nodes)) {
    if (!doc.states[nodeId]) {
      return {
        domain: "knowledge_graph",
        ok: false,
        detail: `missing state for ${nodeId}`,
      };
    }
  }
  return {
    domain: "knowledge_graph",
    ok: true,
    detail: `nodes=${Object.keys(doc.nodes).length} edges=${doc.edges.length}`,
  };
}

export function verifySkillRegistry(harness: PlatformHarness): CheckResult {
  const ids = new Set(harness.skills.map((s) => s.skillId));
  if (ids.size !== harness.skills.length) {
    return {
      domain: "skill_registry",
      ok: false,
      detail: "duplicate skill ids",
    };
  }
  for (const s of harness.skills) {
    if (s.mastery < 0 || s.mastery > 100 || s.confidence < 0 || s.confidence > 100) {
      return {
        domain: "skill_registry",
        ok: false,
        detail: `out-of-range mastery/confidence on ${s.skillId}`,
      };
    }
  }
  return {
    domain: "skill_registry",
    ok: true,
    detail: `skills=${harness.skills.length}`,
  };
}

export function verifyLearningRuntime(harness: PlatformHarness): CheckResult {
  const state = harness.getRuntime().getState(harness.childId);
  if (state.childId !== harness.childId) {
    return {
      domain: "learning_runtime",
      ok: false,
      detail: "runtime childId mismatch",
    };
  }
  const echoes = harness.decisions.filter((d) => d.ruleId === "runtime.ignore_echo");
  if (echoes.length > 0) {
    return {
      domain: "learning_runtime",
      ok: false,
      detail: `decision echo leaked (${echoes.length})`,
    };
  }
  return {
    domain: "learning_runtime",
    ok: true,
    detail: `decisions=${harness.decisions.length} eventsInSession=${state.eventsInSession}`,
  };
}

export function verifyEventOrdering(harness: PlatformHarness): CheckResult {
  const history = harness.bus.getHistory();
  let lastSeq = -1;
  for (const e of history) {
    if (e.seq < lastSeq) {
      return {
        domain: "event_ordering",
        ok: false,
        detail: `seq regression ${e.seq} after ${lastSeq}`,
      };
    }
    lastSeq = e.seq;
  }
  return {
    domain: "event_ordering",
    ok: true,
    detail: `history=${history.length} lastSeq=${lastSeq}`,
  };
}

export function verifyOfflineQueue(harness: PlatformHarness): CheckResult {
  const q = harness.bus.getOfflineQueue();
  // Scenarios heal to online before verify — stuck queue is a failure.
  const stuck = q.length > 0;
  return {
    domain: "offline_queue",
    ok: !stuck,
    detail: stuck ? `stuck_queue=${q.length}` : "queued=0",
  };
}

export function verifyDecisionReplay(harness: PlatformHarness): CheckResult {
  const history = harness.bus
    .getHistory()
    .filter((e) => e.type !== "learning.decision");
  if (history.length === 0) {
    return {
      domain: "decision_replay",
      ok: true,
      detail: "no events to replay",
    };
  }
  const sample = history.slice(-3);
  const rt = harness.getRuntime();
  for (const event of sample) {
    const { decision } = rt.processEvent(event, {
      skills: harness.skills,
      attention: { score: 70, classification: "focused" },
    });
    if (!decision.ruleId || !decision.reason) {
      return {
        domain: "decision_replay",
        ok: false,
        detail: "replay produced empty decision",
      };
    }
  }
  return {
    domain: "decision_replay",
    ok: true,
    detail: `replayed=${sample.length}`,
  };
}

export function verifyRecommendationStability(
  harness: PlatformHarness,
): CheckResult {
  const a = harness.getKg().recommend({ limit: 5 }).map((r) => r.nodeId);
  const b = harness.getKg().recommend({ limit: 5 }).map((r) => r.nodeId);
  const same = a.length === b.length && a.every((id, i) => id === b[i]);
  return {
    domain: "recommendation_stability",
    ok: same,
    detail: same ? `stable=${a.length}` : "recommendation order drifted without input change",
  };
}

export function verifyCloudReconciliationReadiness(
  harness: PlatformHarness,
): CheckResult {
  const doc = harness.getKg().getDocument();
  const ready =
    typeof doc.updatedAt === "string" &&
    typeof doc.catalogVersion === "number" &&
    doc.version === KNOWLEDGE_GRAPH_VERSION &&
    harness.bus.getOfflineQueue().length === 0;
  return {
    domain: "cloud_reconciliation",
    ok: ready,
    detail: ready
      ? "envelope ready (version, updatedAt, empty offline queue)"
      : "not ready for cloud merge",
  };
}

export function verifyAll(harness: PlatformHarness): CheckResult[] {
  return [
    verifyKnowledgeGraph(harness),
    verifySkillRegistry(harness),
    verifyLearningRuntime(harness),
    verifyEventOrdering(harness),
    verifyOfflineQueue(harness),
    verifyDecisionReplay(harness),
    verifyRecommendationStability(harness),
    verifyCloudReconciliationReadiness(harness),
  ];
}
