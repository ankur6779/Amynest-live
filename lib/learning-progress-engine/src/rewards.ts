import type { LearningProgressProfile } from "./types";

export type RewardEventType =
  | "xp"
  | "coins"
  | "stars"
  | "level_up"
  | "badge"
  | "streak"
  | "surprise"
  | "unlock";

export interface RewardEvent {
  type: RewardEventType;
  amount?: number;
  title: string;
  message: string;
  emoji: string;
  badgeId?: string;
}

export interface RewardWallet {
  xp: number;
  coins: number;
  stars: number;
  level: number;
  streakDays: number;
  badges: string[];
}

export const BADGE_DEFS: Record<
  string,
  { title: string; emoji: string; message: string }
> = {
  streak_3: { title: "3-Day Streak", emoji: "🔥", message: "Three days of learning!" },
  streak_7: { title: "Week Warrior", emoji: "🏆", message: "7-day learning streak!" },
  level_5: { title: "Rising Star", emoji: "⭐", message: "Reached Level 5!" },
  level_10: { title: "Super Learner", emoji: "🌟", message: "Reached Level 10!" },
  session_complete: { title: "Daily Champion", emoji: "✅", message: "Today's session complete!" },
  first_skill: { title: "Skill Explorer", emoji: "🎯", message: "First skill practiced!" },
  skill_master: { title: "Skill Master", emoji: "💎", message: "A skill reached mastery!" },
};

export function walletFromProfile(
  profile: LearningProgressProfile,
  extras?: { coins?: number; stars?: number; badges?: string[] },
): RewardWallet {
  return {
    xp: profile.totalXP,
    coins: extras?.coins ?? Math.floor(profile.totalXP / 8),
    stars: extras?.stars ?? Math.floor(profile.masteryScore / 15) + profile.streakDays,
    level: profile.learningLevel,
    streakDays: profile.streakDays,
    badges: extras?.badges ?? [],
  };
}

export function computeRewardEvents(
  prev: { level: number; xp: number; streakDays: number; badges: string[] },
  next: LearningProgressProfile,
  opts?: {
    xpGained?: number;
    sessionJustCompleted?: boolean;
    skillMastered?: boolean;
    surpriseUnlock?: string;
  },
): RewardEvent[] {
  const events: RewardEvent[] = [];
  const xpGain = opts?.xpGained ?? 0;

  if (xpGain > 0) {
    events.push({
      type: "xp",
      amount: xpGain,
      title: `+${xpGain} XP`,
      message: "Great practice!",
      emoji: "⭐",
    });
    const coinsGain = Math.max(1, Math.floor(xpGain / 3));
    events.push({
      type: "coins",
      amount: coinsGain,
      title: `+${coinsGain} coins`,
      message: "Save up for rewards!",
      emoji: "🪙",
    });
  }

  if (next.learningLevel > prev.level) {
    events.push({
      type: "level_up",
      amount: next.learningLevel,
      title: `Level ${next.learningLevel} Reached!`,
      message: "You're growing so fast!",
      emoji: "🎉",
    });
    if (next.learningLevel >= 5 && !prev.badges.includes("level_5")) {
      events.push({
        type: "badge",
        badgeId: "level_5",
        ...BADGE_DEFS.level_5,
      });
    }
    if (next.learningLevel >= 10 && !prev.badges.includes("level_10")) {
      events.push({
        type: "badge",
        badgeId: "level_10",
        ...BADGE_DEFS.level_10,
      });
    }
  }

  if (next.streakDays > prev.streakDays) {
    events.push({
      type: "streak",
      amount: next.streakDays,
      title: `${next.streakDays}-Day Streak`,
      message: "Consistency builds brilliance!",
      emoji: "🔥",
    });
    if (next.streakDays === 3 && !prev.badges.includes("streak_3")) {
      events.push({ type: "badge", badgeId: "streak_3", ...BADGE_DEFS.streak_3 });
    }
    if (next.streakDays === 7 && !prev.badges.includes("streak_7")) {
      events.push({ type: "badge", badgeId: "streak_7", ...BADGE_DEFS.streak_7 });
    }
  }

  if (opts?.sessionJustCompleted && !prev.badges.includes("session_complete")) {
    events.push({
      type: "badge",
      badgeId: "session_complete",
      ...BADGE_DEFS.session_complete,
    });
  }

  if (opts?.skillMastered && !prev.badges.includes("skill_master")) {
    events.push({
      type: "badge",
      badgeId: "skill_master",
      ...BADGE_DEFS.skill_master,
    });
  }

  if (opts?.surpriseUnlock) {
    events.push({
      type: "surprise",
      title: "Surprise Unlock!",
      message: opts.surpriseUnlock,
      emoji: "🎁",
    });
  }

  if (next.masteryScore > 0 && next.masteryScore % 25 === 0 && xpGain > 0) {
    events.push({
      type: "stars",
      amount: 1,
      title: "+1 Star",
      message: "Milestone star earned!",
      emoji: "🌟",
    });
  }

  return events;
}

export function mergeBadges(existing: string[], events: RewardEvent[]): string[] {
  const set = new Set(existing);
  for (const e of events) {
    if (e.badgeId) set.add(e.badgeId);
  }
  return [...set];
}
