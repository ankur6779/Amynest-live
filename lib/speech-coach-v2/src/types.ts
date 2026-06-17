export type ScoringConfidence = "HIGH" | "MEDIUM" | "LOW";

export const SPEECH_COACH_V2_MONTHLY_LIMIT_SECONDS = 18_000;

export interface SpeechTimingMetadata {
  responseSeconds?: number;
  wordCount?: number;
  pauseCount?: number;
  speechRateWpm?: number;
  hadDisfluency?: boolean;
}

export interface SpeechCoachV2EvaluationInput {
  expected: string;
  /** STT-normalized transcript. */
  transcript: string;
  /** Raw transcript before normalization (preserves waaaant, wader, etc.). */
  rawTranscript?: string;
  timing?: SpeechTimingMetadata;
  attemptedComplete?: boolean;
}

export interface SpeechCoachV2EvaluationScores {
  /** What the transcript matched (STT text similarity). */
  transcriptAccuracy: number;
  /** Articulation/pronunciation estimate (never equals transcript when confidence LOW). */
  pronunciationEstimate: number;
  fluencyScore: number;
  speakingRateScore: number;
  confidenceScore: number;
  completionScore: number;
  overallScore: number;
  scoringConfidence: ScoringConfidence;
  /** Legacy aliases for dashboard compatibility */
  accuracyScore: number;
}

export interface SpeechCoachV2EvaluationResult extends SpeechCoachV2EvaluationScores {
  childFeedback: string;
  needsRetry: boolean;
  wordsSpoken: number;
  sentencesCompleted: number;
}

export interface PersistedSessionState {
  sessionId: string;
  childId: number;
  childName: string;
  ageBand: SpeechCoachV2AgeBand;
  phase: SpeechCoachV2Phase;
  phaseStartedAt: number;
  sessionStartedAt: number;
  exerciseIndex: number;
  exercises: SpeechCoachV2Exercise[];
  phaseAttempts: number;
  phaseSuccesses: number;
  starsEarned: number;
  pointsEarned: number;
  wordsSpoken: number;
  sentencesCompleted: number;
  turnCount: number;
}

/** Age bands for Speech Coach V2 curriculum (2–10 years). */
export type SpeechCoachV2AgeBand = "2-3" | "4-5" | "6-7" | "8-10";

/** Six-phase 10-minute session structure. */
export type SpeechCoachV2Phase =
  | "warm_up"
  | "repeat_after_amy"
  | "guided_practice"
  | "interactive_conversation"
  | "confidence_challenge"
  | "celebration";

export const SPEECH_COACH_V2_PHASES: readonly SpeechCoachV2Phase[] = [
  "warm_up",
  "repeat_after_amy",
  "guided_practice",
  "interactive_conversation",
  "confidence_challenge",
  "celebration",
] as const;

export const SPEECH_COACH_V2_PHASE_DURATIONS: Record<SpeechCoachV2Phase, number> = {
  warm_up: 60,
  repeat_after_amy: 120,
  guided_practice: 180,
  interactive_conversation: 120,
  confidence_challenge: 60,
  celebration: 60,
};

export const SPEECH_COACH_V2_SESSION_SECONDS = 600;
export const SPEECH_COACH_V2_DAILY_LIMIT_SECONDS = 600;

export const MASTERY_MIN_ATTEMPTS_PER_PHASE = 2;
export const MASTERY_SUCCESS_SCORE_THRESHOLD = 75;

export type SpeechCoachV2ExerciseKind =
  | "single_word"
  | "animal_sound"
  | "phrase"
  | "sentence"
  | "question_answer"
  | "storytelling"
  | "conversation";

export interface SpeechCoachV2Exercise {
  id: string;
  kind: SpeechCoachV2ExerciseKind;
  prompt: string;
  expected: string;
  hint?: string;
}

export type SpeechCoachV2BadgeId =
  | "clear_speaker"
  | "brave_voice"
  | "fluency_hero"
  | "sentence_star"
  | "word_wizard"
  | "conversation_champ";

export interface SpeechCoachV2Badge {
  id: SpeechCoachV2BadgeId;
  label: string;
  emoji: string;
  description: string;
}

export interface SpeechCoachV2SessionState extends PersistedSessionState {
  streakDays: number;
  badgesEarned: SpeechCoachV2BadgeId[];
  scores: SpeechCoachV2EvaluationScores[];
  secondsUsed: number;
}

export interface SpeechCoachV2ParentDashboard {
  todayPracticeSeconds: number;
  monthPracticeSeconds: number;
  wordsPracticed: number;
  speechConfidence: number;
  fluencyTrend: number[];
  pronunciationTrend: number[];
  confidenceTrend: number[];
  weeklyImprovement: number;
  monthlyImprovement: number;
  strengthAreas: string[];
  needsPracticeAreas: string[];
  topStrengths: string[];
  mostImprovedSkill: string | null;
  dailyStreak: number;
  weeklyStreak: number;
  badges: SpeechCoachV2BadgeId[];
}
