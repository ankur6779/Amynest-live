import type { DailyLearningSession } from "./daily-session";

export type ComebackTier = "none" | "easy_3d" | "streak_saver_5d" | "surprise_7d" | "challenge_14d";

export interface ComebackMission {
  tier: ComebackTier;
  title: string;
  message: string;
  emoji: string;
  ctaLabel: string;
  href: string;
  bonusCoins: number;
  streakSaver: boolean;
  surpriseUnlock?: string;
}

export function daysSinceActive(lastActiveDate: string | null, todayIso: string): number {
  if (!lastActiveDate) return 0;
  const a = new Date(lastActiveDate).getTime();
  const b = new Date(todayIso).getTime();
  return Math.max(0, Math.floor((b - a) / 86400000));
}

export function buildComebackMission(
  daysInactive: number,
  session: DailyLearningSession,
  isPremium: boolean,
): ComebackMission | null {
  if (daysInactive < 3) return null;

  if (daysInactive >= 14) {
    return {
      tier: "challenge_14d",
      title: "We saved something special",
      message: "No rush — a personalized comeback adventure is ready when you are.",
      emoji: "🌟",
      ctaLabel: "Open your surprise",
      href: session.items[0]?.href ?? "/parenting-hub",
      bonusCoins: isPremium ? 50 : 25,
      streakSaver: true,
      surpriseUnlock: "Comeback story pack",
    };
  }
  if (daysInactive >= 7) {
    return {
      tier: "surprise_7d",
      title: "A surprise is waiting",
      message: "Amy kept a gentle session and a bonus unlock warm for your return.",
      emoji: "🎁",
      ctaLabel: "See what's waiting",
      href: "/parenting-hub",
      bonusCoins: 20,
      streakSaver: true,
      surpriseUnlock: "Bonus puzzle pack",
    };
  }
  if (daysInactive >= 5) {
    return {
      tier: "streak_saver_5d",
      title: "Your rhythm is still here",
      message: "One cozy 5-minute session keeps the learning flame gently glowing.",
      emoji: "✨",
      ctaLabel: "Continue the rhythm",
      href: session.items[0]?.href ?? "/study",
      bonusCoins: 15,
      streakSaver: true,
    };
  }
  return {
    tier: "easy_3d",
    title: "A warm welcome back",
    message: "We saved a short, fun session — ease in with zero pressure.",
    emoji: "🌱",
    ctaLabel: "Start gently",
    href: session.items[0]?.href ?? "/study",
    bonusCoins: 10,
    streakSaver: false,
  };
}
