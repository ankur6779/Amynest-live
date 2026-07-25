/**
 * Context assembly + prompt orchestration (Pack 6 §3, Addendum A).
 * Never includes birth time/place/coords or journal body.
 */

import {
  BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
  BIRTH_SKY_SUPPORTED_CONTEXT_SCHEMAS,
  BIRTH_SKY_SYSTEM_PROMPT,
} from "./ai-constants.js";

export type BirthSkyPlanetFact = {
  sign: string;
  lonDeg: number;
  retrograde?: boolean;
};

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
  mercury?: BirthSkyPlanetFact | null;
  venus?: BirthSkyPlanetFact | null;
  mars?: BirthSkyPlanetFact | null;
  jupiter?: BirthSkyPlanetFact | null;
  saturn?: BirthSkyPlanetFact | null;
  uranus?: BirthSkyPlanetFact | null;
  neptune?: BirthSkyPlanetFact | null;
  pluto?: BirthSkyPlanetFact | null;
  retrograde?: string[];
  planetDegreesJson?: string | null;
  kernel?: string | null;
  kernelFingerprint?: string | null;
  astronomyConfidence?: number | null;
  missingInputs?: string[];
  calculationMode?: string | null;
  houseSystem?: string | null;
  planetHouseMap?: Partial<
    Record<
      | "sun"
      | "moon"
      | "mercury"
      | "venus"
      | "mars"
      | "jupiter"
      | "saturn"
      | "uranus"
      | "neptune"
      | "pluto",
      number
    >
  > | null;
};

export type RecentConversationTurn = {
  role: "user" | "assistant";
  body: string;
};

export type AssembledPrompt = {
  contextSchemaVersion: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
};

export function assertSupportedContextSchema(version: string): boolean {
  return BIRTH_SKY_SUPPORTED_CONTEXT_SCHEMAS.has(version);
}

function dayPartLabel(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

function pushPlanet(
  facts: string[],
  key: string,
  p: BirthSkyPlanetFact | null | undefined,
): void {
  if (!p?.sign) return;
  facts.push(`${key}_sign=${p.sign}`);
  if (typeof p.lonDeg === "number" && Number.isFinite(p.lonDeg)) {
    facts.push(`${key}_lon_deg=${p.lonDeg.toFixed(4)}`);
  }
  if (p.retrograde) facts.push(`${key}_retrograde=true`);
}

export function assembleBirthSkyPrompt(
  input: BirthSkyAiContextInput,
  opts?: { recentTurns?: RecentConversationTurn[] },
): AssembledPrompt {
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
    `visit_day_part=${dayPartLabel()}`,
    `active_ui_section=${input.entryPoint}`,
  ];

  pushPlanet(facts, "mercury", input.mercury);
  pushPlanet(facts, "venus", input.venus);
  pushPlanet(facts, "mars", input.mars);
  pushPlanet(facts, "jupiter", input.jupiter);
  pushPlanet(facts, "saturn", input.saturn);
  pushPlanet(facts, "uranus", input.uranus);
  pushPlanet(facts, "neptune", input.neptune);
  pushPlanet(facts, "pluto", input.pluto);

  if (input.retrograde?.length) {
    facts.push(`retrograde=${input.retrograde.slice(0, 12).join(",")}`);
  }
  if (input.planetDegreesJson) {
    facts.push(`planet_degrees_json=${input.planetDegreesJson.slice(0, 2000)}`);
  }
  if (input.kernel) facts.push(`kernel=${input.kernel}`);
  if (input.kernelFingerprint) {
    facts.push(`kernel_fingerprint=${input.kernelFingerprint}`);
  }
  if (typeof input.astronomyConfidence === "number") {
    facts.push(`astronomy_confidence=${input.astronomyConfidence.toFixed(2)}`);
  }
  if (input.missingInputs?.length) {
    facts.push(`missing_inputs=${input.missingInputs.slice(0, 8).join(",")}`);
    facts.push(
      "language_guidance=use_cautious_language_for_missing_or_approximate_inputs",
    );
  }
  if (input.calculationMode) {
    facts.push(`calculation_mode=${input.calculationMode}`);
  }
  if (input.houseSystem) {
    facts.push(`house_system=${input.houseSystem}`);
  }
  const houseMap = input.planetHouseMap;
  if (houseMap) {
    for (const key of [
      "sun",
      "moon",
      "mercury",
      "venus",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
      "pluto",
    ] as const) {
      const h = houseMap[key];
      if (typeof h === "number" && h >= 1 && h <= 12) {
        facts.push(`${key}_house=${h}`);
      }
    }
  }

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
  const recent = (opts?.recentTurns ?? [])
    .filter((t) => t.body.trim().length > 0)
    .slice(-5);

  const historyBlock =
    recent.length > 0
      ? [
          "",
          "Recent conversation (continue this thread; do not restart or repeat openings):",
          ...recent.map(
            (t, i) =>
              `${i + 1}. ${t.role === "user" ? "Parent" : "Amy"}: ${t.body.trim().slice(0, 600)}`,
          ),
        ]
      : [];

  const userBlock = [
    `Parent question (entry=${input.entryPoint}):`,
    input.userQuestion.trim(),
    "",
    `Child first name: ${name}`,
    "Module: Amy Astro Intelligence (internal id: birth-sky)",
    "Structured sky context (keys only — do not invent missing fields):",
    facts.join("\n"),
    ...historyBlock,
    "",
    "Respond as Amy: concise premium depth (≈120–280 words unless asked for more),",
    "grounded in THIS child's sky (name the Sun/Moon/phase/Rising when available),",
    "vary tone and structure from any recent Amy turns, and stay within Amy Astro safety rules",
    "(awareness & reflection — never prediction, diagnosis, or destiny).",
  ].join("\n");

  return {
    contextSchemaVersion: schema,
    messages: [
      { role: "system", content: BIRTH_SKY_SYSTEM_PROMPT },
      { role: "user", content: userBlock },
    ],
  };
}
