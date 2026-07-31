import type {
  ChildRuntimeState,
  DecisionPatch,
  LearningDecision,
  NormalizedSignal,
  RuntimeInputSnapshots,
} from "./types.js";

/**
 * Fill decision slots from snapshots without re-running the full graph.
 * Incremental — only touches fields left generic by rules.
 */
export function enrichDecisionPatch(
  patch: DecisionPatch,
  signal: NormalizedSignal,
  state: ChildRuntimeState,
  snapshots: RuntimeInputSnapshots,
): DecisionPatch {
  const next = { ...patch };
  const top = snapshots.knowledge?.topRecommendations?.[0];
  const forgotten = snapshots.knowledge?.forgottenNodeIds?.[0];
  const weakPhoneme = snapshots.knowledge?.weakPhonemes?.[0];
  const weakSkill = snapshots.skills
    ?.slice()
    .sort((a, b) => a.mastery - b.mastery)[0];

  if (next.nextActivity) {
    const activity = { ...next.nextActivity };
    if (!activity.entityId && signal.entityId) {
      activity.entityId = signal.entityId;
    }
    if (!activity.conceptId && (signal.conceptId || top?.nodeId || forgotten)) {
      activity.conceptId = signal.conceptId ?? top?.nodeId ?? forgotten ?? null;
    }
    if (
      activity.kind === "discovery_play" &&
      !activity.href &&
      top?.links?.discoveryWorldId
    ) {
      activity.href = `/worlds/${worldPath(top.links.discoveryWorldId)}`;
      activity.entityId = top.links.discoveryItemId ?? activity.entityId;
      activity.label = top.label ?? activity.label;
    }
    if (activity.kind === "speech_practice" && !activity.href) {
      activity.href = top?.links?.speechRoute ?? "/speech-coach";
    }
    if (activity.kind === "story" && !activity.href) {
      activity.href =
        top?.links?.storyId != null
          ? `/parenting-hub#tile-story-hub`
          : "/parenting-hub#tile-story-hub";
      activity.label = activity.label ?? top?.label ?? "Story time";
      activity.conceptId = activity.conceptId ?? top?.nodeId ?? null;
    }
    if (activity.kind === "reading" && !activity.href) {
      activity.href =
        top?.links?.speechRoute?.includes("phonics") || top?.links?.readingId
          ? `/phonics${top.links?.readingId ? `?sound=${top.links.readingId}` : ""}`
          : "/phonics";
      activity.label = activity.label ?? top?.label ?? "Reading time";
      activity.conceptId = activity.conceptId ?? top?.nodeId ?? null;
      activity.entityId =
        activity.entityId ?? top?.links?.readingId ?? signal.entityId;
    }
    if (activity.kind === "game" && !activity.href) {
      const gameId = top?.links?.gameId ?? signal.entityId;
      activity.href = gameId ? `/games?play=${encodeURIComponent(String(gameId))}` : "/games";
      activity.label = activity.label ?? top?.label ?? "Play a game";
      activity.conceptId = activity.conceptId ?? top?.nodeId ?? null;
      activity.entityId = activity.entityId ?? gameId ?? null;
    }
    if (activity.kind === "review" && forgotten) {
      activity.conceptId = forgotten;
      activity.label = activity.label ?? "Review forgotten concept";
    }
    next.nextActivity = activity;
  }

  if (next.reviewQueue?.length) {
    next.reviewQueue = next.reviewQueue.map((item, i) => {
      if (item.conceptId || item.entityId || item.skillId) return item;
      if (i === 0 && forgotten) {
        return { ...item, conceptId: forgotten };
      }
      if (i === 0 && weakPhoneme) {
        return { ...item, conceptId: weakPhoneme.nodeId };
      }
      if (i === 0 && weakSkill) {
        return { ...item, skillId: weakSkill.skillId };
      }
      return item;
    });
  } else if (forgotten || weakPhoneme) {
    next.reviewQueue = [
      {
        conceptId: forgotten ?? weakPhoneme?.nodeId,
        priority: 70,
        reason: "Incremental review from knowledge snapshot",
      },
    ];
  }

  if (next.recommendation && top && next.recommendation.id === "rec_kg_top") {
    next.recommendation = {
      ...next.recommendation,
      title: top.label,
      reason: top.reason,
      conceptId: top.nodeId,
      href:
        top.links?.speechRoute ??
        (top.links?.discoveryWorldId
          ? `/worlds/${worldPath(top.links.discoveryWorldId)}`
          : next.recommendation.href),
    };
  }

  if (
    next.recommendation?.id === "rec_skill_weak" &&
    weakSkill &&
    !next.recommendation.skillId
  ) {
    next.recommendation = {
      ...next.recommendation,
      skillId: weakSkill.skillId,
      title: `Practice ${weakSkill.skillId.replace(/_/g, " ")}`,
    };
  }

  // Attention difficulty overlay when present and rule didn't force break path.
  if (
    snapshots.attention?.taskDifficulty &&
    !state.suggestBreak &&
    next.difficulty === "same"
  ) {
    next.difficulty = snapshots.attention.taskDifficulty;
  }

  return next;
}

function worldPath(worldId: string): string {
  if (worldId.includes("vehicle")) return "vehicles";
  if (worldId.includes("nature")) return "nature";
  if (worldId.includes("home")) return "home";
  if (worldId.includes("instrument")) return "instruments";
  if (worldId.includes("animal")) return "animals";
  return worldId.replace(/_world$/, "").replace(/_/g, "-");
}

export function finalizeDecision(args: {
  id: string;
  childId: string;
  timestamp: string;
  patch: DecisionPatch;
  primaryRuleId: string;
  contributingRuleIds: string[];
  confidence: number;
  sourceEventId?: string | null;
  latencyMs?: number;
}): LearningDecision {
  const p = args.patch;
  return {
    schemaVersion: 1,
    id: args.id,
    childId: args.childId,
    timestamp: args.timestamp,
    nextActivity: p.nextActivity ?? null,
    difficulty: p.difficulty ?? "same",
    hints: p.hints ?? "none",
    celebrationLevel: (p.celebrationLevel ?? 0) as 0 | 1 | 2 | 3,
    narrationLength: p.narrationLength ?? "medium",
    reviewQueue: p.reviewQueue ?? [],
    recommendation: p.recommendation ?? null,
    breakSuggestion: p.breakSuggestion ?? false,
    rewardPriority: p.rewardPriority ?? "normal",
    reason: p.reason,
    evidence: p.evidence ?? [],
    ruleId: args.primaryRuleId,
    contributingRuleIds: args.contributingRuleIds,
    confidence: args.confidence,
    sourceEventId: args.sourceEventId ?? null,
    latencyMs: args.latencyMs,
  };
}
