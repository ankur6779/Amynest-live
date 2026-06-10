import type {
  ActivityPayload,
  ObjectKind,
  PlaygroundActivityId,
} from "@workspace/math-playground";

export type VoiceScenarioKind =
  | "counting_sequence"
  | "number_recognition"
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division";

export interface VoiceScenario {
  kind: VoiceScenarioKind;
  activityId: PlaygroundActivityId;
  objectKind: ObjectKind;
  promptKey: string;
  promptVars: Record<string, string | number>;
  expectedAnswers: number[];
  acceptableWords?: string[];
  countingSequence?: number;
  successKey: string;
  struggleKey: string;
  celebrateKey?: string;
}

export type VoiceValidationOutcome =
  | "correct"
  | "close"
  | "incorrect"
  | "unparseable"
  | "timeout";

export interface VoiceValidationResult {
  outcome: VoiceValidationOutcome;
  parsedValue: number | null;
  confidence: number;
  rawTranscript: string;
}

export interface VoiceRoundSummary {
  scenario: VoiceScenario;
  attempts: number;
  hintsUsed: number;
  responseTimeMs: number;
  voiceConfidence: number;
  success: boolean;
}

export interface VoicePrompt {
  key: string;
  vars: Record<string, string | number>;
}

export interface VoiceScenarioAdapter {
  fromPayload(
    activityId: PlaygroundActivityId,
    payload: ActivityPayload,
  ): VoiceScenario | null;
}
