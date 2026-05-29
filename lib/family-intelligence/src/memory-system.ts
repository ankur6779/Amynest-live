import type { MemoryEntry } from "./types.js";

export function recordMemoryEntry(
  existing: MemoryEntry[],
  entry: Omit<MemoryEntry, "id" | "recordedAt">,
): MemoryEntry[] {
  const newEntry: MemoryEntry = {
    ...entry,
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: new Date().toISOString(),
  };
  return [newEntry, ...existing].slice(0, 100);
}

export function recallEffectiveInterventions(
  memory: MemoryEntry[],
  category: MemoryEntry["category"],
): MemoryEntry[] {
  return memory
    .filter((m) => m.category === category && m.outcome === "positive")
    .sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0))
    .slice(0, 5);
}

export function memoryInfluencedStrategy(
  memory: MemoryEntry[],
): {
  preferredNotificationStyle: string | null;
  preferredLearningStyle: string | null;
  preferredRewardStyle: string | null;
} {
  const notifs = recallEffectiveInterventions(memory, "notification");
  const learning = recallEffectiveInterventions(memory, "learning_style");
  const rewards = recallEffectiveInterventions(memory, "reward_style");

  return {
    preferredNotificationStyle: notifs[0]?.key ?? null,
    preferredLearningStyle: learning[0]?.key ?? null,
    preferredRewardStyle: rewards[0]?.key ?? null,
  };
}

const MIN_CONFIDENCE_TO_REPEAT = 0.35;
const SUPPRESS_NEGATIVE_THRESHOLD = 2;

export function shouldRepeatIntervention(
  memory: MemoryEntry[],
  key: string,
): boolean {
  const prior = memory.filter((m) => m.key === key && m.category === "intervention");
  if (prior.length === 0) return true;

  const negatives = prior.filter((m) => m.outcome === "negative").length;
  if (negatives >= SUPPRESS_NEGATIVE_THRESHOLD) return false;

  const best = prior.reduce((a, b) =>
    (b.confidenceScore ?? 0) > (a.confidenceScore ?? 0) ? b : a,
  );
  if (best.outcome === "negative") return false;
  if (best.outcome === "neutral" && (best.confidenceScore ?? 0) >= MIN_CONFIDENCE_TO_REPEAT) {
    return false;
  }
  return best.outcome === "positive";
}

export function mergeValidatedMemory(
  existing: MemoryEntry[],
  update: {
    category: MemoryEntry["category"];
    key: string;
    outcome: MemoryEntry["outcome"];
    context: string;
    confidenceScore: number;
    sampleSize: number;
    validatedAt: string;
  },
): MemoryEntry[] {
  const filtered = existing.filter(
    (m) => !(m.key === update.key && m.category === update.category),
  );
  return recordMemoryEntry(filtered, update);
}
