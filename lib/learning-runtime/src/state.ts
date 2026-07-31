import type {
  ChildRuntimeState,
  NormalizedSignal,
  RuntimeInputSnapshots,
} from "./types.js";

const RECENT_TYPES_CAP = 12;

export function createChildRuntimeState(childId: string): ChildRuntimeState {
  return {
    childId: String(childId),
    updatedAt: new Date(0).toISOString(),
    lastEventType: null,
    lastEventId: null,
    lastEntityId: null,
    lastConceptId: null,
    lastConfidence: null,
    lastModule: null,
    attentionClass: null,
    attentionScore: null,
    suggestBreak: false,
    successStreak: 0,
    failStreak: 0,
    eventsInSession: 0,
    sessionId: null,
    recentEventTypes: [],
    ruleCooldowns: {},
    lastDecisionId: null,
    hubMissionPct: null,
  };
}

/**
 * Incremental state update from a single normalized signal + optional snapshots.
 * No full recomputation of knowledge/skill graphs.
 */
export function applySignalToState(
  prev: ChildRuntimeState,
  signal: NormalizedSignal,
  snapshots?: RuntimeInputSnapshots | null,
): ChildRuntimeState {
  const next: ChildRuntimeState = {
    ...prev,
    ruleCooldowns: prev.ruleCooldowns,
    recentEventTypes: prev.recentEventTypes,
  };

  next.updatedAt = signal.timestamp;
  next.lastEventType = signal.type;
  next.lastEventId = signal.eventId;
  next.lastEntityId = signal.entityId;
  next.lastConceptId = signal.conceptId;
  next.lastConfidence = signal.confidence;
  next.lastModule = signal.module;
  next.eventsInSession = prev.eventsInSession + 1;

  if (signal.sessionId && signal.sessionId !== prev.sessionId) {
    next.sessionId = signal.sessionId;
    next.eventsInSession = 1;
    next.successStreak = 0;
    next.failStreak = 0;
    next.recentEventTypes = [];
  } else if (signal.sessionId) {
    next.sessionId = signal.sessionId;
  }

  if (signal.flags.isSuccess) {
    next.successStreak = prev.successStreak + 1;
    next.failStreak = 0;
  } else if (signal.flags.isFailure) {
    next.failStreak = prev.failStreak + 1;
    next.successStreak = 0;
  }

  const recent = prev.recentEventTypes.slice(-(RECENT_TYPES_CAP - 1));
  recent.push(signal.type);
  next.recentEventTypes = recent;

  if (signal.flags.isAttention) {
    const classification = String(
      signal.metadata.classification ?? prev.attentionClass ?? "neutral",
    );
    next.attentionClass = classification;
    next.attentionScore =
      signal.confidence ?? snapshots?.attention?.score ?? prev.attentionScore;
    next.suggestBreak =
      classification === "fatigued" ||
      classification === "distracted" ||
      snapshots?.attention?.suggestBreak === true;
  }

  // Snapshot overlays (incremental — only fields provided)
  if (snapshots?.attention) {
    next.attentionClass = snapshots.attention.classification;
    next.attentionScore = snapshots.attention.score;
    next.suggestBreak =
      snapshots.attention.suggestBreak === true ||
      snapshots.attention.classification === "fatigued" ||
      snapshots.attention.classification === "distracted";
  }
  if (snapshots?.dailyMission) {
    next.hubMissionPct = snapshots.dailyMission.hubPct;
  }
  if (snapshots?.session) {
    next.successStreak = snapshots.session.successStreak;
    next.failStreak = snapshots.session.failStreak;
    next.eventsInSession = snapshots.session.eventsInSession;
    if (snapshots.session.recentEventTypes.length) {
      next.recentEventTypes = snapshots.session.recentEventTypes.slice(
        -RECENT_TYPES_CAP,
      );
    }
  }

  return next;
}

export function markRuleFired(
  state: ChildRuntimeState,
  ruleId: string,
  nowMs: number,
): ChildRuntimeState {
  return {
    ...state,
    ruleCooldowns: { ...state.ruleCooldowns, [ruleId]: nowMs },
  };
}
