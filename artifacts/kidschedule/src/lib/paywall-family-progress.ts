import type { Entitlements } from "@/hooks/use-subscription";
import { getCachedRoutineStreak } from "@/lib/routine-streak-cache";

export type FamilyProgressItem = {
  id: string;
  label: string;
};

function hasBirthSkyMemory(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("amynest:amy-astro:cosmic-memory:v1:")) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Build "Your Family Today" progress lines from real client/entitlement data only.
 * Never fabricates metrics — returns empty when nothing meaningful is available.
 */
export function buildFamilyProgressItems(
  entitlements: Entitlements | null | undefined,
  opts?: { routineStreakDays?: number; birthSkyCreated?: boolean },
): FamilyProgressItem[] {
  const items: FamilyProgressItem[] = [];
  const features = entitlements?.usage?.features;

  const routinesUsed = features?.routine_generate?.used ?? 0;
  if (routinesUsed > 0) {
    items.push({
      id: "routines",
      label: `${routinesUsed} routine${routinesUsed === 1 ? "" : "s"} created`,
    });
  }

  const aiToday =
    (entitlements?.usage?.aiQueriesToday ?? 0) +
    (entitlements?.usage?.infantAiQueriesToday ?? 0);
  if (aiToday > 0) {
    items.push({
      id: "ai",
      label: `${aiToday} AI question${aiToday === 1 ? "" : "s"} answered today`,
    });
  }

  const speechUsed = features?.hub_speech_session?.used ?? 0;
  if (speechUsed > 0) {
    items.push({
      id: "speech",
      label: `${speechUsed} speech session${speechUsed === 1 ? "" : "s"} completed`,
    });
  }

  const nutritionUsed = features?.nutrition_week_plan?.used ?? 0;
  if (nutritionUsed > 0) {
    items.push({
      id: "nutrition",
      label: `${nutritionUsed} meal plan${nutritionUsed === 1 ? "" : "s"} created`,
    });
  }

  const streak = opts?.routineStreakDays ?? getCachedRoutineStreak();
  if (streak > 0) {
    items.push({
      id: "streak",
      label: `${streak}-day parenting streak`,
    });
  }

  const birthSky = opts?.birthSkyCreated ?? hasBirthSkyMemory();
  if (birthSky) {
    items.push({ id: "birth_sky", label: "Birth Sky created" });
  }

  return items.slice(0, 5);
}

/** Soft win-back line when the parent has seen several paywalls without buying. */
export function resolveWinbackProgressLine(
  visitCount: number,
  progress: FamilyProgressItem[],
): string | null {
  if (visitCount < 3 || progress.length === 0) return null;
  const activityCount = progress.length;
  return `You've already completed ${activityCount} parenting activit${
    activityCount === 1 ? "y" : "ies"
  }. Premium keeps the journey going.`;
}
