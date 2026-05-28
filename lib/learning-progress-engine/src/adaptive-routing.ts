import type { LearningProgressProfile, UnlockResult } from "./types";
import type { LearningMemory } from "./learning-memory";
import type { DifficultyAdjustment } from "./difficulty-engine";
import { getSkillDef } from "./skill-graph";

export interface AdaptiveRecommendation {
  id: string;
  title: string;
  reason: string;
  emoji: string;
  href: string;
  priority: "high" | "medium" | "low";
  skillId?: string;
}

export function buildAdaptiveRecommendations(input: {
  profile: LearningProgressProfile;
  memory: LearningMemory;
  unlocks: UnlockResult;
  difficulty: DifficultyAdjustment;
  isPremium: boolean;
}): AdaptiveRecommendation[] {
  const { memory, unlocks, difficulty, isPremium } = input;
  const recs: AdaptiveRecommendation[] = [];

  for (const skillId of memory.strugglingSkills.slice(0, 2)) {
    const def = getSkillDef(skillId);
    recs.push({
      id: `rec_weak_${skillId}`,
      title: def?.title ?? "Practice skill",
      reason: "Extra practice — building confidence here",
      emoji: def?.emoji ?? "🎯",
      href: skillId.includes("speech") ? "/speech-coach" : skillId.includes("math") ? "/study" : "/phonics",
      priority: "high",
      skillId,
    });
  }

  if (unlocks.isRevisionDay) {
    recs.push({
      id: "rec_revision",
      title: "Gentle review day",
      reason: difficulty.reason,
      emoji: "🔄",
      href: "/study",
      priority: "high",
    });
  }

  if (difficulty.engagementMode === "challenge" && isPremium) {
    recs.push({
      id: "rec_challenge",
      title: "Challenge mode",
      reason: "You're on a roll — try something harder!",
      emoji: "🚀",
      href: "/study",
      priority: "medium",
    });
  }

  if (memory.favoriteModules.includes("phonics") || memory.strongestCategory === "phonics") {
    recs.push({
      id: "rec_favorite_phonics",
      title: "More phonics fun",
      reason: "Your child loves phonics — keep the momentum!",
      emoji: "🔤",
      href: "/phonics",
      priority: "low",
    });
  }

  if (memory.forgottenSkills.length > 0) {
    const sid = memory.forgottenSkills[0]!;
    const def = getSkillDef(sid);
    recs.push({
      id: `rec_refresh_${sid}`,
      title: `Refresh: ${def?.title ?? "skill"}`,
      reason: "Quick refresh so skills stay strong",
      emoji: "💫",
      href: "/parenting-hub",
      priority: "medium",
      skillId: sid,
    });
  }

  for (const u of unlocks.todaysUnlocks.slice(0, 2)) {
    recs.push({
      id: `rec_today_${u.id}`,
      title: u.title,
      reason: "New today — fresh and exciting",
      emoji: u.emoji,
      href: "/parenting-hub",
      priority: "low",
    });
  }

  const seen = new Set<string>();
  return recs.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  }).slice(0, 6);
}
