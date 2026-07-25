/**
 * Context assembly + prompt orchestration (Pack 6 §3, Addendum A).
 * Never includes birth time/place/coords or journal body.
 */

import {
  BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
  BIRTH_SKY_SUPPORTED_CONTEXT_SCHEMAS,
  BIRTH_SKY_SYSTEM_PROMPT,
} from "./ai-constants.js";

export type BirthSkyAiContextInput = {
  contextSchemaVersion: string;
  snapshotVersion: string;
  engineVersion: string;
  mode: "full" | "day_sky";
  timePrecision: "exact" | "approximate" | "unknown";
  placeProvided: boolean;
  sunSign: string;
  moonSign: string;
  moonPhase: string;
  moonPhaseLabel: string;
  risingSign: string | null;
  traditionalContentVersion?: string | null;
  traditionCardId?: string | null;
  lunarMansionKey?: string | null;
  reflectionIds?: string[];
  reflectionPromptIds?: string[];
  reflectionCount?: number;
  childFirstName?: string | null;
  userQuestion: string;
  entryPoint: string;
};

export type AssembledPrompt = {
  contextSchemaVersion: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
};

export function assertSupportedContextSchema(version: string): boolean {
  return BIRTH_SKY_SUPPORTED_CONTEXT_SCHEMAS.has(version);
}

export function assembleBirthSkyPrompt(input: BirthSkyAiContextInput): AssembledPrompt {
  const schema = input.contextSchemaVersion || BIRTH_SKY_CONTEXT_SCHEMA_VERSION;
  const daySky =
    input.mode === "day_sky" || input.timePrecision === "unknown";

  const facts = [
    `snapshotVersion=${input.snapshotVersion}`,
    `engineVersion=${input.engineVersion}`,
    `mode=${input.mode}`,
    `time_precision=${input.timePrecision}`,
    `place_provided=${input.placeProvided ? "true" : "false"}`,
    `sun_sign=${input.sunSign}`,
    `moon_sign=${input.moonSign}`,
    `moon_phase=${input.moonPhase}`,
    `moon_phase_label=${input.moonPhaseLabel}`,
    daySky
      ? "rising_sign=unavailable (Day Sky / unknown birth time)"
      : `rising_sign=${input.risingSign ?? "unknown"}`,
  ];

  if (input.traditionalContentVersion) {
    facts.push(`traditionalContentVersion=${input.traditionalContentVersion}`);
  }
  if (input.traditionCardId) facts.push(`tradition_card_id=${input.traditionCardId}`);
  if (input.lunarMansionKey) facts.push(`lunar_mansion_key=${input.lunarMansionKey}`);
  if (typeof input.reflectionCount === "number") {
    facts.push(`reflection_count=${input.reflectionCount}`);
  }
  if (input.reflectionIds?.length) {
    facts.push(`reflection_ids=${input.reflectionIds.slice(0, 8).join(",")}`);
  }
  if (input.reflectionPromptIds?.length) {
    facts.push(`reflection_prompt_ids=${input.reflectionPromptIds.slice(0, 8).join(",")}`);
  }

  const name = input.childFirstName?.trim() || "the child";
  const userBlock = [
    `Parent question (entry=${input.entryPoint}):`,
    input.userQuestion.trim(),
    "",
    `Child first name: ${name}`,
    "Structured sky context (keys only):",
    facts.join("\n"),
    "",
    "Respond helpfully within Birth Sky safety rules.",
  ].join("\n");

  return {
    contextSchemaVersion: schema,
    messages: [
      { role: "system", content: BIRTH_SKY_SYSTEM_PROMPT },
      { role: "user", content: userBlock },
    ],
  };
}
