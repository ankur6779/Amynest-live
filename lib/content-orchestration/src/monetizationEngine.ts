import type { ModuleId } from "./types.js";
import type { LearningProfile, MonetizationHint } from "./types-v2.js";
import type { EligibleModule } from "./moduleEngine.js";

export type MonetizationContext = {
  profile: LearningProfile;
  eligibleModules: EligibleModule[];
  unlockedModules: ModuleId[];
  explorationTriggered: boolean;
};

/**
 * Smart freemium: surface premium teaser at skill progression moments,
 * not random paywalls.
 */
export function evaluateMonetizationMoment(ctx: MonetizationContext): MonetizationHint {
  const { profile, eligibleModules, unlockedModules, explorationTriggered } = ctx;
  const unlocked = new Set(unlockedModules);

  const lockedWithPreview = eligibleModules.filter(
    (m) => m.previewOnly && m.locked && !unlocked.has(m.moduleId),
  );
  if (lockedWithPreview.length === 0) {
    return { showPremiumTeaser: false };
  }

  const engagementHigh = profile.behavior.engagementScore >= 68;
  const anySkillRising = Object.values(profile.skills).some(
    (s) => s.confidence >= 0.75 && s.level >= 2,
  );
  const progressionMoment =
    anySkillRising || (explorationTriggered && profile.behavior.engagementScore >= 55);

  if (!engagementHigh || !progressionMoment) {
    return { showPremiumTeaser: false };
  }

  const target =
    lockedWithPreview.sort((a, b) => b.priorityScore - a.priorityScore)[0]!;

  return {
    showPremiumTeaser: true,
    previewModuleId: target.moduleId,
    contextualCta: `Unlock ${target.moduleId.replace(/_/g, " ")} to keep your momentum going`,
    triggerReason: anySkillRising ? "skill_progression" : "exploration_engagement",
  };
}
