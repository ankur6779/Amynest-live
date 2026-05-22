/**
 * Golden scenario builder for Amy voice regression protection.
 */

import { prepareAmySpeechInput, type AmySpeechMode } from "@/lib/amy-speech-mode";
import {
  resetAmyDifficultySession,
  type AmyDifficultyLevel,
} from "@/lib/amy-voice-difficulty";
import { resetSessionAmyTone } from "@/lib/amy-voice-emotion";
import { detectAmyIntent, simplifyPhrasesForDifficulty } from "@/lib/amy-voice-intent";
import { resetAmyVoiceLearningSession } from "@/lib/amy-voice-learning";
import type { SpeakOptions } from "@/hooks/use-amy-voice";
import {
  applyTeacherDelivery,
  resetTeacherPhraseRotation,
  resetTeacherPraiseSpacing,
} from "@/lib/amy-voice-teacher";
import { resetAmyVoiceCohortSession } from "@/lib/amy-voice-cohorts";
import {
  resetAmyVoiceExperimentMetrics,
  setAmyVoiceExperimentAssignmentForTests,
} from "@/lib/amy-voice-experiments";
import { resetAmyVoiceGovernanceForTests } from "@/lib/amy-voice-governance";
import { resetAmyVoiceStruggleInsightsSession } from "@/lib/amy-voice-struggle-insights";

export type AmyVoiceGoldenScenario = {
  id: string;
  input: string;
  opts?: SpeakOptions;
  difficulty?: AmyDifficultyLevel;
  previousDifficulty?: AmyDifficultyLevel;
  replayCount?: number;
  afterRecovery?: boolean;
};

export type GoldenSpeechBehavior = {
  scenarioId: string;
  speechMode: AmySpeechMode;
  pipelineMode: "default" | "phonics";
  normalizedText: string;
  phraseCount: number;
  phrases: string[];
  useSemanticSplit: boolean;
  allowPhonicsSequence: boolean;
  allowSpeechCoachSplit: boolean;
  difficulty: AmyDifficultyLevel;
  teacherRecoveryApplied: boolean;
};

/** Fixed phrases across modes — update snapshots intentionally when behavior changes. */
export const AMY_VOICE_GOLDEN_SCENARIOS: readonly AmyVoiceGoldenScenario[] = [
  { id: "math-equation", input: "12-5=7" },
  { id: "phonics-letter", input: "b", opts: { mode: "phonics" } },
  {
    id: "speech-coach-instruction",
    input: "listen carefully then try the word again please",
  },
  { id: "hyphen-compound", input: "follow the 3-step script" },
  { id: "numbered-steps", input: "(1) add apples. (2) count them." },
  { id: "mixed-step-count", input: "step 3 of 5" },
  { id: "spelling-sequence", input: "c-a-t" },
  { id: "math-subtraction", input: "12 - 5" },
  {
    id: "lesson-paragraph",
    input:
      "The 4-month sleep regression is not a regression — it is a permanent reorganisation. Pick one approach, then stick with it for two weeks.",
    opts: { lessonParagraph: true },
  },
  {
    id: "mixed-long-instruction",
    input: "step 3 of 5 then add twelve apples to the basket and count them all together",
  },
  {
    id: "recovery-struggling",
    input: "sound out the word slowly",
    difficulty: "struggling",
    previousDifficulty: "neutral",
    replayCount: 3,
  },
  {
    id: "recovery-effort",
    input: "great job reading that word",
    difficulty: "neutral",
    previousDifficulty: "struggling",
    afterRecovery: true,
    replayCount: 1,
  },
  {
    id: "confident-cohort-fast",
    input: "read the next word",
    difficulty: "confident",
    replayCount: 0,
  },
  {
    id: "phonics-digraph",
    input: "sh",
    opts: { mode: "phonics" },
  },
  {
    id: "math-word-problem",
    input: "step 2 of 4 then solve 8 + 3",
  },
] as const;

export function resetAmyVoiceGoldenSession(): void {
  resetAmyDifficultySession();
  resetSessionAmyTone();
  resetAmyVoiceLearningSession();
  resetTeacherPhraseRotation();
  resetTeacherPraiseSpacing();
  resetAmyVoiceCohortSession();
  resetAmyVoiceExperimentMetrics();
  resetAmyVoiceGovernanceForTests();
  resetAmyVoiceStruggleInsightsSession();
  setAmyVoiceExperimentAssignmentForTests({
    encouragement_frequency: "control",
    pacing: "control",
    instruction_style: "control",
  });
}

export function buildGoldenSpeechBehavior(
  scenario: AmyVoiceGoldenScenario,
): GoldenSpeechBehavior {
  resetAmyVoiceGoldenSession();

  const policy = prepareAmySpeechInput(scenario.input, scenario.opts);
  const difficulty = scenario.difficulty ?? "neutral";
  const previousDifficulty = scenario.previousDifficulty ?? "neutral";
  const intent = detectAmyIntent(policy.normalizedText, policy.speechMode);

  let phrases = [...policy.phrases];
  if (difficulty === "struggling") {
    phrases = simplifyPhrasesForDifficulty(phrases, true);
  }

  const phrasesBeforeTeacher = [...phrases];
  phrases = applyTeacherDelivery({
    phrases,
    intent,
    difficulty,
    previousDifficulty,
    speechMode: policy.speechMode,
    multiStep: phrases.length > 1 || policy.useSemanticSplit,
    successStreak: difficulty === "confident" ? 3 : 0,
  });

  const teacherRecoveryApplied =
    difficulty === "struggling" &&
    phrases.length > 0 &&
    phrases[0] !== phrasesBeforeTeacher[0];

  const normalizedText =
    phrases.length === 1
      ? phrases[0]!
      : phrases.join(policy.prosody.pauseMarker);

  return {
    scenarioId: scenario.id,
    speechMode: policy.speechMode,
    pipelineMode: policy.pipelineMode,
    normalizedText,
    phraseCount: phrases.length,
    phrases,
    useSemanticSplit: phrases.length > 1,
    allowPhonicsSequence: policy.allowPhonicsSequence,
    allowSpeechCoachSplit: policy.allowSpeechCoachSplit,
    difficulty,
    teacherRecoveryApplied,
  };
}
