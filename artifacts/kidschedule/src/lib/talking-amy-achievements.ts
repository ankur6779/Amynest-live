/**
 * Local-only Talking Amy achievements — no backend, no audio stored.
 */

import type { TalkingAmyModeId } from "@/lib/talking-amy-modes";
import {
  hasDiscoveredAllSecrets,
  hasDiscoveredSecret,
  type TalkingAmyCollection,
} from "@/lib/talking-amy-collection";

const UNLOCKED_KEY_PREFIX = "talking_amy_achievements_v1_";

export type TalkingAmyAchievementId =
  | "echo_explorer"
  | "robot_friend"
  | "alien_speaker"
  | "talking_amy_superstar"
  | "ghost_hunter"
  | "space_explorer"
  | "magic_master"
  | "frog_friend"
  | "secret_finder"
  | "galaxy_collector";

export type TalkingAmyAchievementKind = "repeat" | "mode_use" | "secret";

export type TalkingAmyAchievement = {
  id: TalkingAmyAchievementId;
  kind: TalkingAmyAchievementKind;
  threshold: number;
  title: string;
  emoji: string;
  description: string;
  modeId?: TalkingAmyModeId;
};

export const TALKING_AMY_ACHIEVEMENTS: readonly TalkingAmyAchievement[] = [
  {
    id: "echo_explorer",
    kind: "repeat",
    threshold: 10,
    title: "Echo Explorer",
    emoji: "🔁",
    description: "Amy repeated you 10 times!",
  },
  {
    id: "ghost_hunter",
    kind: "mode_use",
    threshold: 10,
    title: "Ghost Hunter",
    emoji: "👻",
    description: "Used Ghost Amy 10 times!",
    modeId: "ghost",
  },
  {
    id: "space_explorer",
    kind: "mode_use",
    threshold: 10,
    title: "Space Explorer",
    emoji: "🚀",
    description: "Used Space Amy 10 times!",
    modeId: "space",
  },
  {
    id: "magic_master",
    kind: "mode_use",
    threshold: 10,
    title: "Magic Master",
    emoji: "🦄",
    description: "Used Magic Amy 10 times!",
    modeId: "magic",
  },
  {
    id: "frog_friend",
    kind: "mode_use",
    threshold: 10,
    title: "Frog Friend",
    emoji: "🐸",
    description: "Used Frog Amy 10 times!",
    modeId: "frog",
  },
  {
    id: "robot_friend",
    kind: "repeat",
    threshold: 25,
    title: "Robot Friend",
    emoji: "🤖",
    description: "25 funny echoes — beep boop!",
  },
  {
    id: "alien_speaker",
    kind: "repeat",
    threshold: 50,
    title: "Alien Speaker",
    emoji: "👽",
    description: "50 echoes from planet Fun!",
  },
  {
    id: "secret_finder",
    kind: "secret",
    threshold: 1,
    title: "Secret Finder",
    emoji: "✨",
    description: "Discovered a secret Amy mode!",
  },
  {
    id: "talking_amy_superstar",
    kind: "repeat",
    threshold: 100,
    title: "Talking Amy Superstar",
    emoji: "⭐",
    description: "100 echoes — you're a star!",
  },
  {
    id: "galaxy_collector",
    kind: "secret",
    threshold: 3,
    title: "Galaxy Collector",
    emoji: "🪐",
    description: "Found all secret Amy modes!",
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

function isAchievementMet(
  achievement: TalkingAmyAchievement,
  repeatCount: number,
  collection: TalkingAmyCollection,
): boolean {
  switch (achievement.kind) {
    case "repeat":
      return repeatCount >= achievement.threshold;
    case "mode_use":
      if (!achievement.modeId) return false;
      return (collection.modeUseCounts[achievement.modeId] ?? 0) >= achievement.threshold;
    case "secret":
      if (achievement.id === "secret_finder") {
        return (
          hasDiscoveredSecret(collection, "rainbow") ||
          hasDiscoveredSecret(collection, "lightning") ||
          hasDiscoveredSecret(collection, "galaxy")
        );
      }
      if (achievement.id === "galaxy_collector") {
        return hasDiscoveredAllSecrets(collection);
      }
      return false;
    default:
      return false;
  }
}

export function findNewlyUnlockedAchievements(
  repeatCount: number,
  collection: TalkingAmyCollection,
  alreadyUnlocked: readonly TalkingAmyAchievementId[],
): TalkingAmyAchievement[] {
  const have = new Set(alreadyUnlocked);
  return TALKING_AMY_ACHIEVEMENTS.filter(
    (a) => !have.has(a.id) && isAchievementMet(a, repeatCount, collection),
  );
}

export function mergeUnlockedAchievements(
  childId: number,
  repeatCount: number,
  collection: TalkingAmyCollection,
): { newlyUnlocked: TalkingAmyAchievement[]; allUnlocked: TalkingAmyAchievementId[] } {
  const existing = loadUnlockedAchievementIds(childId);
  const newlyUnlocked = findNewlyUnlockedAchievements(repeatCount, collection, existing);
  if (!newlyUnlocked.length) {
    return { newlyUnlocked: [], allUnlocked: existing };
  }
  const allUnlocked = [...existing, ...newlyUnlocked.map((a) => a.id)];
  saveUnlockedAchievementIds(childId, allUnlocked);
  return { newlyUnlocked, allUnlocked };
}

/** Back-compat for repeat-only callers. */
export function findRepeatUnlockedAchievements(
  repeatCount: number,
  alreadyUnlocked: readonly TalkingAmyAchievementId[],
): TalkingAmyAchievement[] {
  const have = new Set(alreadyUnlocked);
  return TALKING_AMY_ACHIEVEMENTS.filter(
    (a) => a.kind === "repeat" && repeatCount >= a.threshold && !have.has(a.id),
  );
}
