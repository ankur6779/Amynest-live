/**
 * Host wiring for Amy Learning Runtime.
 * Collects read-only snapshots, processes learning events, emits decisions.
 * No UI. Modules subscribe via learning-decision-bus / learning.decision events.
 */

import {
  createLearningRuntime,
  toLearningDecisionEvent,
  type LearningDecision,
  type LearningRuntime,
  type RuntimeInputSnapshots,
  type RuntimeSkillEntry,
} from "@workspace/learning-runtime";
import type { LearningEvent } from "@workspace/learning-events";
import {
  getLearningEventBus,
  installLearningEventBus,
  publishLearning,
} from "@/lib/learning-events-bridge";
import { publishLearningDecision } from "@/lib/learning-decision-bus";
import {
  getKnowledgeRecommendations,
  getKnowledgeSummary,
  getKnowledgeWeakPhonemes,
} from "@/lib/knowledge-graph-client";
import { getAttentionSnapshot } from "@/lib/sound-world-attention-store";
import { getHubDailyAdventureView } from "@/lib/discovery-worlds-hub-daily";

let runtime: LearningRuntime | null = null;
let installed = false;
let unsubscribe: (() => void) | null = null;

/** Optional child profile injector (set by host when profile cache is warm). */
let profileProvider: ((childId: number) => RuntimeInputSnapshots["child"]) | null =
  null;

/** Optional skill registry injector (Learning Progress skillGraph → Runtime). */
let skillsProvider: ((childId: number) => RuntimeSkillEntry[] | null) | null =
  null;

export function setLearningRuntimeProfileProvider(
  provider: ((childId: number) => RuntimeInputSnapshots["child"]) | null,
): void {
  profileProvider = provider;
}

export function setLearningRuntimeSkillsProvider(
  provider: ((childId: number) => RuntimeSkillEntry[] | null) | null,
): void {
  skillsProvider = provider;
}

function getRuntime(): LearningRuntime {
  if (!runtime) runtime = createLearningRuntime();
  return runtime;
}

function buildSnapshots(childId: number): RuntimeInputSnapshots {
  const snapshots: RuntimeInputSnapshots = {};

  try {
    const attention = getAttentionSnapshot(childId);
    const td = attention.adaptive.taskDifficulty;
    const vc = attention.adaptive.visualComplexity;
    snapshots.attention = {
      score: attention.score,
      classification: attention.classification,
      rhythm: attention.rhythm,
      suggestBreak: attention.adaptive.suggestBreak,
      taskDifficulty:
        td === "easier" ? "easier" : td === "harder" ? "harder" : "same",
      visualComplexity:
        vc === "minimal" ? "low" : vc === "reduced" ? "medium" : "high",
    };
  } catch {
    /* optional */
  }

  try {
    const summary = getKnowledgeSummary(childId);
    const recs = getKnowledgeRecommendations(childId, 5);
    const weakPhonemes = getKnowledgeWeakPhonemes(childId, 5);
    if (summary) {
      snapshots.knowledge = {
        strugglingNodeIds: summary.topStruggling.map((s) => s.nodeId),
        forgottenNodeIds: summary.topStruggling
          .filter((s) => s.confidence < 30)
          .map((s) => s.nodeId),
        masteredNodeIds: summary.topMastered.map((s) => s.nodeId),
        avgConfidence: summary.avgConfidence,
        topRecommendations: recs.map((r) => ({
          nodeId: r.nodeId,
          label: r.label,
          reason: r.reason,
          score: r.score,
          links: r.links,
        })),
        weakPhonemes,
      };
    }
  } catch {
    /* optional */
  }

  try {
    const hub = getHubDailyAdventureView(childId);
    snapshots.dailyMission = {
      hubPct: hub.pct,
      hubDone: hub.done,
      hubTotal: hub.total,
    };
  } catch {
    /* optional */
  }

  if (profileProvider) {
    try {
      snapshots.child = profileProvider(childId);
    } catch {
      /* optional */
    }
  }

  if (skillsProvider) {
    try {
      const skills = skillsProvider(childId);
      if (skills?.length) snapshots.skills = skills;
    } catch {
      /* optional */
    }
  }

  return snapshots;
}

function handleEvent(event: LearningEvent): void {
  if (event.type === "learning.decision") return;

  const childId = Number(event.payload.childId);
  if (!Number.isFinite(childId)) return;

  try {
    const { decision } = getRuntime().processEvent(event, buildSnapshots(childId));
    if (decision.ruleId === "runtime.ignore_echo") return;
    emitDecision(decision);
  } catch {
    /* never break producers */
  }
}

function emitDecision(decision: LearningDecision): void {
  publishLearning(toLearningDecisionEvent(decision));
  publishLearningDecision(decision);
}

/**
 * Install runtime consumer on the learning event bus.
 * Idempotent — safe from GrowthBootstrap. No UI.
 */
export function installLearningRuntimeBridge(): LearningRuntime {
  installLearningEventBus();
  if (installed && runtime) return runtime;

  runtime = createLearningRuntime();
  unsubscribe?.();
  unsubscribe = getLearningEventBus().subscribe(handleEvent, {
    priority: 6,
  });
  installed = true;
  return runtime;
}

export function getLearningRuntime(): LearningRuntime {
  return runtime ?? installLearningRuntimeBridge();
}

/** Process a single event synchronously (tests / advanced hosts). */
export function processLearningRuntimeEvent(
  event: LearningEvent,
  snapshots?: RuntimeInputSnapshots | null,
): LearningDecision {
  const { decision } = getLearningRuntime().processEvent(
    event,
    snapshots ?? buildSnapshots(Number(event.payload.childId)),
  );
  if (decision.ruleId !== "runtime.ignore_echo") {
    emitDecision(decision);
  }
  return decision;
}

export function resetLearningRuntimeBridgeForTests(): void {
  unsubscribe?.();
  unsubscribe = null;
  runtime?.clearChild();
  runtime = null;
  installed = false;
  profileProvider = null;
  skillsProvider = null;
}
