/**
 * Local-only Talking Amy achievements — no backend, no audio stored.
 */

const UNLOCKED_KEY_PREFIX = "talking_amy_achievements_v1_";

export type TalkingAmyAchievementId =
  | "echo_explorer"
  | "robot_friend"
  | "alien_speaker"
  | "talking_amy_superstar";

export type TalkingAmyAchievement = {
  id: TalkingAmyAchievementId;
  threshold: number;
  title: string;
  emoji: string;
  description: string;
};

export const TALKING_AMY_ACHIEVEMENTS: readonly TalkingAmyAchievement[] = [
  {
    id: "echo_explorer",
    threshold: 10,
    title: "Echo Explorer",
    emoji: "🔁",
    description: "Amy repeated you 10 times!",
  },
  {
    id: "robot_friend",
    threshold: 25,
    title: "Robot Friend",
    emoji: "🤖",
    description: "25 funny echoes — beep boop!",
  },
  {
    id: "alien_speaker",
    threshold: 50,
    title: "Alien Speaker",
    emoji: "👽",
    description: "50 echoes from planet Fun!",
  },
  {
    id: "talking_amy_superstar",
    threshold: 100,
    title: "Talking Amy Superstar",
    emoji: "⭐",
    description: "100 echoes — you're a star!",
  },
] as const;

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadUnlockedAchievementIds(childId: number): TalkingAmyAchievementId[] {
  if (typeof window === "undefined") return [];
  const key = `${UNLOCKED_KEY_PREFIX}${childId}`;
  const parsed = readJson<string[]>(window.localStorage.getItem(key), []);
  const valid = new Set(TALKING_AMY_ACHIEVEMENTS.map((a) => a.id));
  return parsed.filter((id): id is TalkingAmyAchievementId => valid.has(id as TalkingAmyAchievementId));
}

export function saveUnlockedAchievementIds(
  childId: number,
  ids: TalkingAmyAchievementId[],
): void {
  if (typeof window === "undefined") return;
  const key = `${UNLOCKED_KEY_PREFIX}${childId}`;
  window.localStorage.setItem(key, JSON.stringify(ids));
}

export function findNewlyUnlockedAchievements(
  repeatCount: number,
  alreadyUnlocked: readonly TalkingAmyAchievementId[],
): TalkingAmyAchievement[] {
  const have = new Set(alreadyUnlocked);
  return TALKING_AMY_ACHIEVEMENTS.filter(
    (a) => repeatCount >= a.threshold && !have.has(a.id),
  );
}

export function mergeUnlockedAchievements(
  childId: number,
  repeatCount: number,
): { newlyUnlocked: TalkingAmyAchievement[]; allUnlocked: TalkingAmyAchievementId[] } {
  const existing = loadUnlockedAchievementIds(childId);
  const newlyUnlocked = findNewlyUnlockedAchievements(repeatCount, existing);
  if (!newlyUnlocked.length) {
    return { newlyUnlocked: [], allUnlocked: existing };
  }
  const allUnlocked = [...existing, ...newlyUnlocked.map((a) => a.id)];
  saveUnlockedAchievementIds(childId, allUnlocked);
  return { newlyUnlocked, allUnlocked };
}
