import {
  bumpProfileVersion,
  ensureLearningProfile,
  moduleToSkill,
  updateBehaviorFromSession,
  updateSkillFromOutcome,
} from "./learningProfileEngine.js";
import type { LearningProfile } from "./types-v2.js";
import type { SessionFeedbackInput, SessionFeedbackResult } from "./types-v2.js";

export type FeedbackEngineOptions = {
  difficultyRamp?: "slow" | "fast";
};

/**
 * Post-session feedback loop: updates skills, confidence, adaptability knobs.
 */
export function processSessionFeedback(
  existing: LearningProfile | null | undefined,
  input: SessionFeedbackInput,
  options: FeedbackEngineOptions = {},
): SessionFeedbackResult {
  let profile = ensureLearningProfile(existing, input.childId, input.userId);
  const skill = moduleToSkill(input.moduleId);
  const ramp = options.difficultyRamp ?? "slow";

  const success =
    input.completed && input.completionRate >= 0.7 && input.skips <= 1;
  const skipped = input.skips >= 2 || input.completionRate < 0.3;

  profile = updateSkillFromOutcome(profile, skill, { success, skipped }, ramp);

  const engagementFromSession = Math.min(
    100,
    Math.max(
      0,
      input.completionRate * 70 +
        Math.min(30, input.timeSpentSec / 6) -
        input.skips * 12 -
        input.retries * 4,
    ),
  );

  const dropOff =
    skipped || input.completionRate < 0.4
      ? `${input.moduleId}:${input.contentId}`
      : undefined;

  profile = {
    ...profile,
    behavior: updateBehaviorFromSession(
      profile.behavior,
      input.moduleId,
      input.timeSpentSec,
      engagementFromSession,
      dropOff,
    ),
  };

  const adjustments: SessionFeedbackResult["adjustments"] = {};
  const adapt = { ...profile.adaptability };
  const engagement = profile.behavior.engagementScore;

  if (engagement < 45) {
    adapt.noveltyPreference = Math.min(1, adapt.noveltyPreference + 0.08);
    adjustments.noveltyPreference = adapt.noveltyPreference;
  } else if (engagement > 75) {
    adapt.difficultyTolerance = Math.min(1, adapt.difficultyTolerance + 0.06);
    adjustments.difficultyTolerance = adapt.difficultyTolerance;
  }

  const fatigueSignals = profile.behavior.dropOffPoints.length;
  if (fatigueSignals >= 3) {
    adapt.repetitionTolerance = Math.max(0.1, adapt.repetitionTolerance - 0.07);
    adjustments.repetitionTolerance = adapt.repetitionTolerance;
  }

  profile = bumpProfileVersion({ ...profile, adaptability: adapt });

  return { profile, adjustments };
}

export function aggregateSessionFeedback(
  existing: LearningProfile | null | undefined,
  inputs: SessionFeedbackInput[],
  options?: FeedbackEngineOptions,
): LearningProfile {
  let profile = ensureLearningProfile(
    existing,
    inputs[0]?.childId ?? "unknown",
    inputs[0]?.userId,
  );
  for (const input of inputs) {
    profile = processSessionFeedback(profile, input, options).profile;
  }
  return profile;
}
