import type { AchievementBadge, HealthyStreakState } from "./types-family.js";

const streaks = new Map<string, HealthyStreakState>();
const badges = new Map<string, AchievementBadge[]>();

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Personal streaks only — no sibling leaderboard exposed to children.
 */
export function recordChildActivity(childId: string): HealthyStreakState {
  const today = todayIso();
  const prev = streaks.get(childId);
  if (!prev) {
    const s = { childId, personalStreakDays: 1, lastActiveDate: today };
    streaks.set(childId, s);
    return s;
  }
  if (prev.lastActiveDate === today) return prev;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yIso = yesterday.toISOString().slice(0, 10);

  const personalStreakDays =
    prev.lastActiveDate === yIso ? prev.personalStreakDays + 1 : 1;
  const s = { childId, personalStreakDays, lastActiveDate: today };
  streaks.set(childId, s);

  if (personalStreakDays === 3 || personalStreakDays === 7) {
    awardBadge(childId, {
      id: `streak_${personalStreakDays}`,
      title: `${personalStreakDays}-day learning streak`,
      earnedByChildId: childId,
      earnedAt: new Date().toISOString(),
    });
  }

  return s;
}

export function awardBadge(childId: string, badge: AchievementBadge): void {
  const list = badges.get(childId) ?? [];
  if (!list.some((b) => b.id === badge.id)) {
    list.push(badge);
    badges.set(childId, list);
  }
}

export function getPersonalStreak(childId: string): HealthyStreakState | undefined {
  return streaks.get(childId);
}

export function getBadges(childId: string): AchievementBadge[] {
  return badges.get(childId) ?? [];
}

/** Parent view: streaks without ranking children against each other negatively. */
export function parentStreakSummary(
  childIds: string[],
): { childId: string; streakDays: number; latestBadge?: string }[] {
  return childIds.map((id) => {
    const s = streaks.get(id);
    const b = badges.get(id);
    return {
      childId: id,
      streakDays: s?.personalStreakDays ?? 0,
      latestBadge: b?.[b.length - 1]?.title,
    };
  });
}

export function clearHealthyCompetition(childId?: string): void {
  if (childId) {
    streaks.delete(childId);
    badges.delete(childId);
  } else {
    streaks.clear();
    badges.clear();
  }
}
