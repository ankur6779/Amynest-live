import { numberToWords } from "./number-words";
import type {
  ActivityPayload,
  AdditionPayload,
  CountingPayload,
  DivisionPayload,
  MultiplicationPayload,
  PlaygroundActivityId,
  SubtractionPayload,
} from "@workspace/math-playground";
import type { VoiceScenario, VoiceScenarioAdapter, VoiceScenarioKind } from "./types";

function wordsFor(n: number): string[] {
  return numberToWords(n);
}

function baseScenario(
  kind: VoiceScenarioKind,
  activityId: PlaygroundActivityId,
  objectKind: CountingPayload["objectKind"],
  expected: number,
  promptKey: string,
  promptVars: Record<string, string | number>,
): VoiceScenario {
  return {
    kind,
    activityId,
    objectKind,
    promptKey,
    promptVars,
    expectedAnswers: [expected],
    acceptableWords: wordsFor(expected),
    successKey: "amy_great_job",
    struggleKey: "amy_try_together",
    celebrateKey: "amy_great_job",
  };
}

export function scenarioFromCounting(
  activityId: PlaygroundActivityId,
  payload: CountingPayload,
  kind: "counting_sequence" | "number_recognition" = "number_recognition",
): VoiceScenario {
  const objects = payload.objectKind === "block" ? "blocks" : `${payload.objectKind}s`;
  const promptKey =
    kind === "counting_sequence" ? "amy_voice_count" : "amy_voice_how_many";
  return {
    ...baseScenario(
      kind,
      activityId,
      payload.objectKind,
      payload.targetCount,
      promptKey,
      { count: payload.targetCount, objects },
    ),
    countingSequence: payload.targetCount,
  };
}

export function scenarioFromAddition(
  activityId: PlaygroundActivityId,
  payload: AdditionPayload,
): VoiceScenario {
  const sum = payload.augend + payload.addend;
  return baseScenario("addition", activityId, payload.objectKind, sum, "amy_voice_add", {
    a: payload.augend,
    b: payload.addend,
  });
}

export function scenarioFromSubtraction(
  activityId: PlaygroundActivityId,
  payload: SubtractionPayload,
): VoiceScenario {
  const diff = payload.minuend - payload.subtrahend;
  return baseScenario("subtraction", activityId, payload.objectKind, diff, "amy_voice_sub", {
    a: payload.minuend,
    b: payload.subtrahend,
  });
}

export function scenarioFromMultiplication(
  activityId: PlaygroundActivityId,
  payload: MultiplicationPayload,
): VoiceScenario {
  const product = payload.groups * payload.perGroup;
  return baseScenario(
    "multiplication",
    activityId,
    payload.objectKind,
    product,
    "amy_voice_multiply",
    { groups: payload.groups, each: payload.perGroup },
  );
}

export function scenarioFromDivision(
  activityId: PlaygroundActivityId,
  payload: DivisionPayload,
): VoiceScenario {
  const quotient = Math.floor(payload.total / payload.recipients);
  return baseScenario("division", activityId, payload.objectKind, quotient, "amy_voice_divide", {
    total: payload.total,
    children: payload.recipients,
  });
}

export const defaultVoiceScenarioAdapter: VoiceScenarioAdapter = {
  fromPayload(activityId, payload) {
    switch (activityId) {
      case "counting_adventure":
        return scenarioFromCounting(activityId, payload as CountingPayload);
      case "addition_lab":
        return scenarioFromAddition(activityId, payload as AdditionPayload);
      case "subtraction_garden":
        return scenarioFromSubtraction(activityId, payload as SubtractionPayload);
      case "multiplication_factory":
        return scenarioFromMultiplication(activityId, payload as MultiplicationPayload);
      case "division_bakery":
        return scenarioFromDivision(activityId, payload as DivisionPayload);
      default:
        return null;
    }
  },
};

export function voiceScenarioFromActivity(
  activityId: PlaygroundActivityId,
  payload: ActivityPayload,
  adapter: VoiceScenarioAdapter = defaultVoiceScenarioAdapter,
): VoiceScenario | null {
  return adapter.fromPayload(activityId, payload);
}

const VOICE_SUPPORTED_ACTIVITIES: PlaygroundActivityId[] = [
  "counting_adventure",
  "addition_lab",
  "subtraction_garden",
  "multiplication_factory",
  "division_bakery",
];

export function isVoiceSupportedActivity(activityId: PlaygroundActivityId): boolean {
  return VOICE_SUPPORTED_ACTIVITIES.includes(activityId);
}
