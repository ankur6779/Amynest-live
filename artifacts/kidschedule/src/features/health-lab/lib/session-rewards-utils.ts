import { BADGES, DAILY_QUESTS, HEALTH_LEVELS } from "../constants";
import type { GameSessionResult, HealthLabPersistedState } from "../types";

export type SessionCelebration = {
  type: "level-up" | "streak" | "badge" | "quest" | "treasure" | "surprise";
  payload: unknown;
};

export function isSimulationResult(result: GameSessionResult): boolean {
  if (result.simulated) return true;
  if (result.cheatFlags?.some((f) => f === "simulated_motion" || f === "flat_surface")) return true;
  return result.score === 0 && result.xpEarned > 0;
}

function payloadId(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "id" in payload) {
    return String((payload as { id: string }).id);
  }
  return null;
}

export interface RewardLineItem {
  emoji: string;
  label: string;
  detail?: string;
}

export function buildRewardSummary(
  result: GameSessionResult,
  celebrations: SessionCelebration[],
  state: HealthLabPersistedState,
): {
  badges: RewardLineItem[];
  quests: RewardLineItem[];
  streaks: RewardLineItem[];
  levelUp: RewardLineItem | null;
  starsEarned: number;
} {
  const badges: RewardLineItem[] = [];
  const quests: RewardLineItem[] = [];
  const streaks: RewardLineItem[] = [];
  let levelUp: RewardLineItem | null = null;

  for (const c of celebrations) {
    if (c.type === "badge") {
      const id = payloadId(c.payload);
      const badge = BADGES.find((b) => b.id === id);
      if (badge) badges.push({ emoji: badge.emoji, label: badge.name, detail: badge.description });
    } else if (c.type === "quest") {
      const id = payloadId(c.payload);
      if (id === "monthly-mega-quest") {
        quests.push({ emoji: "🌟", label: "Monthly Mega Quest", detail: "Bonus XP & coins earned!" });
      } else {
        const quest = DAILY_QUESTS.find((q) => q.id === id);
        quests.push({
          emoji: "✅",
          label: quest?.title ?? "Quest complete",
          detail: quest?.description,
        });
      }
    } else if (c.type === "streak") {
      const days = c.payload && typeof c.payload === "object" && "days" in c.payload
        ? (c.payload as { days: number }).days
        : state.streakDays;
      streaks.push({ emoji: "🔥", label: `${days}-day streak`, detail: "Keep it going!" });
    } else if (c.type === "level-up") {
      const lvlId = c.payload && typeof c.payload === "object" && "level" in c.payload
        ? (c.payload as { level: number }).level
        : state.level;
      const lvl = HEALTH_LEVELS.find((l) => l.id === lvlId);
      levelUp = { emoji: "⭐", label: "Level up!", detail: lvl ? `You are now a ${lvl.name}` : undefined };
    }
  }

  const starsEarned = isSimulationResult(result) ? 0 : result.score;

  return { badges, quests, streaks, levelUp, starsEarned };
}
