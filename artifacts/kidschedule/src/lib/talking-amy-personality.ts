/**
 * Contextual Amy personality — behavior-aware reactions layered on mode pools.
 */

import type { TalkingAmyAchievement } from "@/lib/talking-amy-achievements";
import {
  getBedtimeGlowOpacity,
  getDailyTalkingAmyMood,
  isTalkingAmyBedtime,
  pickMoodReaction,
  type TalkingAmyMoodProfile,
} from "@/lib/talking-amy-mood";
import { pickSmartTalkingAmyReaction } from "@/lib/talking-amy-reactions";
import { getStreakMilestoneMessage } from "@/lib/talking-amy-streak";
import type { TalkingAmyMode } from "@/lib/talking-amy-modes";

export type TalkingAmyPersonalityContext = {
  isFirstUseToday?: boolean;
  consecutiveRepeats?: number;
  achievement?: TalkingAmyAchievement | null;
  secretDiscovered?: boolean;
  streakDay?: number;
  isReplay?: boolean;
  date?: Date;
};

export type TalkingAmyPersonalitySnapshot = {
  mood: TalkingAmyMoodProfile;
  bedtime: boolean;
  glowOpacityScale: number;
  animationSpeedScale: number;
};

export function getTalkingAmyPersonalitySnapshot(date = new Date()): TalkingAmyPersonalitySnapshot {
  const bedtime = isTalkingAmyBedtime(date);
  return {
    mood: getDailyTalkingAmyMood(date),
    bedtime,
    glowOpacityScale: bedtime ? getBedtimeGlowOpacity(1) : 1,
    animationSpeedScale: bedtime ? 1.35 : 1,
  };
}

/**
 * Priority: achievement → secret → first today → streak milestone → 5-in-a-row → mood/bedtime → smart pool.
 */
export function pickContextualTalkingAmyReaction(
  mode: TalkingAmyMode,
  durationMs: number,
  ctx: TalkingAmyPersonalityContext = {},
): string {
  const date = ctx.date ?? new Date();
  const snapshot = getTalkingAmyPersonalitySnapshot(date);

  if (ctx.achievement) {
    return `Wow! You earned a new badge! ${ctx.achievement.emoji}`;
  }

  if (ctx.secretDiscovered) {
    return "You discovered something special!";
  }

  if (ctx.isFirstUseToday && !ctx.isReplay) {
    const streakMsg = getStreakMilestoneMessage(ctx.streakDay ?? 0);
    if (streakMsg) return streakMsg;
    return "Hi friend! I missed you!";
  }

  const streakMsg = getStreakMilestoneMessage(ctx.streakDay ?? 0);
  if (streakMsg && !ctx.isReplay && Math.random() < 0.4) {
    return streakMsg;
  }

  if ((ctx.consecutiveRepeats ?? 0) >= 5 && !ctx.isReplay) {
    return "You're having fun today!";
  }

  if (snapshot.bedtime && Math.random() < 0.45) {
    return pickMoodReaction(snapshot.mood);
  }

  if (Math.random() < 0.2) {
    return pickMoodReaction(snapshot.mood);
  }

  return pickSmartTalkingAmyReaction(mode, durationMs);
}
