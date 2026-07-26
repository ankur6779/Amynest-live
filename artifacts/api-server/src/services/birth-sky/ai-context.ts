/**
 * Context assembly + prompt orchestration (Pack 6 §3, Addendum A).
 * Never includes birth time/place/coords or journal body.
 *
 * Pipeline: Meaning → Development → Adaptive → Conversation → (optional Evidence).
 * EvidenceSnapshot is omitted from LLM context unless DEBUG_EXPLAINABILITY=true.
 */

import type {
  AdaptiveHistoryInput,
  AdaptiveSnapshot,
} from "@workspace/birth-sky-adaptive";
import { computeAdaptiveSnapshot } from "@workspace/birth-sky-adaptive";
import type {
  ConversationHistorySummary,
  ConversationPlan,
} from "@workspace/birth-sky-conversation";
import { computeConversationPlan } from "@workspace/birth-sky-conversation";
import type { DevelopmentSnapshot } from "@workspace/birth-sky-development";
import { computeDevelopmentSnapshot } from "@workspace/birth-sky-development";
import type { EvidenceSnapshot } from "@workspace/birth-sky-evidence";
import {
  computeEvidenceSnapshot,
  shouldIncludeEvidenceInAiContext,
} from "@workspace/birth-sky-evidence";
import type { MeaningSnapshot } from "@workspace/birth-sky-meaning";
import { computeMeaningSnapshot } from "@workspace/birth-sky-meaning";
import { resolvePipelineFeatureFlags } from "@workspace/birth-sky-runtime";
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
      | "pluto"
      | "rahu"
      | "ketu",
      number
    >
  > | null;
  zodiacMode?: string | null;
  ayanamsaName?: string | null;
  moonNakshatra?: string | null;
  moonPada?: number | null;
  moonLord?: string | null;
  currentMahadasha?: string | null;
  currentAntardasha?: string | null;
  astrologyMode?: string | null;
  ascendantSign?: string | null;
  mcSign?: string | null;
  dominantElement?: string | null;
  dominantModality?: string | null;
  majorAspects?: string[];
  /** Prefer this over raw astronomy dumps when present. */
  meaningSnapshot?: MeaningSnapshot | null;
  /** Prefer normalized developmental guidance when present. */
  developmentSnapshot?: DevelopmentSnapshot | null;
  /** Age in months (preferred for Development Engine). */
  ageMonths?: number | null;
  /** ISO birth date YYYY-MM-DD — used when ageMonths omitted. */
  birthDate?: string | null;
  parentGoals?: string[];
  milestones?: string[];
  routines?: Array<{ kind: string; label?: string; present?: boolean }>;
  /** Prefer normalized adaptive facts when present. */
  adaptiveSnapshot?: AdaptiveSnapshot | null;
  /**
   * Anonymized child history only — no names / userId / childId / emails.
   * Optional; empty → baseline adaptive snapshot.
   */
  adaptiveHistory?: AdaptiveHistoryInput | null;
  /** Prefer structured ConversationPlan when present. */
  conversationPlan?: ConversationPlan | null;
  conversationHistorySummary?: ConversationHistorySummary | null;
  /** Prefetched evidence — still omitted from LLM unless debug gate passes. */
  evidenceSnapshot?: EvidenceSnapshot | null;
  /** Force-include evidence in prompt (tests / tooling). Env DEBUG_EXPLAINABILITY also works. */
  includeEvidence?: boolean | null;
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

function resolveMeaning(input: BirthSkyAiContextInput): MeaningSnapshot | null {
  if (!resolvePipelineFeatureFlags().meaning) {
    return null;
  }
  // Explicit null → legacy raw-astronomy fact path (tests / opt-out).
  if (input.meaningSnapshot === null) {
    return null;
  }
  if (input.meaningSnapshot?.meaningEngineVersion) {
    return input.meaningSnapshot;
  }
  // Missing meaningSnapshot: derive deterministically from available sky keys.
  try {
    return computeMeaningSnapshot({
      sunSign: input.sunSign,
      moonSign: input.moonSign,
      risingSign: input.risingSign,
      moonPhase: input.moonPhase,
      astrologyMode: input.astrologyMode,
      zodiacMode: input.zodiacMode,
      mercury: input.mercury ? { sign: input.mercury.sign } : null,
      venus: input.venus ? { sign: input.venus.sign } : null,
      mars: input.mars ? { sign: input.mars.sign } : null,
      jupiter: input.jupiter ? { sign: input.jupiter.sign } : null,
      saturn: input.saturn ? { sign: input.saturn.sign } : null,
      planetHouseMap: input.planetHouseMap,
      moonProfile: input.moonNakshatra
        ? {
            nakshatra: input.moonNakshatra,
            pada: input.moonPada ?? undefined,
            lord: input.moonLord ?? undefined,
          }
        : null,
      dasha: input.currentMahadasha
        ? {
            mahadasha: { lord: input.currentMahadasha },
            antardasha: input.currentAntardasha
              ? { lord: input.currentAntardasha }
              : null,
          }
        : null,
      westernBirthProfile: input.dominantElement
        ? {
            dominantElement: input.dominantElement,
            dominantModality: input.dominantModality ?? undefined,
          }
        : null,
    });
  } catch {
    return null;
  }
}

function resolveDevelopment(
  input: BirthSkyAiContextInput,
  meaning: MeaningSnapshot | null,
): DevelopmentSnapshot | null {
  if (!resolvePipelineFeatureFlags().development) {
    return null;
  }
  if (input.developmentSnapshot === null) {
    return null;
  }
  if (input.developmentSnapshot?.developmentEngineVersion) {
    return input.developmentSnapshot;
  }
  if (!meaning) return null;
  const hasAge =
    typeof input.ageMonths === "number" || Boolean(input.birthDate);
  if (!hasAge) return null;
  try {
    return computeDevelopmentSnapshot({
      meaning,
      ageMonths: input.ageMonths,
      birthDate: input.birthDate,
      parentGoals: input.parentGoals,
      milestones: input.milestones,
      routines: input.routines,
    });
  } catch {
    return null;
  }
}

function resolveAdaptive(
  input: BirthSkyAiContextInput,
  development: DevelopmentSnapshot | null,
): AdaptiveSnapshot | null {
  if (!resolvePipelineFeatureFlags().adaptive) {
    return null;
  }
  if (input.adaptiveSnapshot === null) {
    return null;
  }
  if (input.adaptiveSnapshot?.adaptiveEngineVersion) {
    return input.adaptiveSnapshot;
  }
  if (!development) return null;
  try {
    return computeAdaptiveSnapshot({
      development,
      history: input.adaptiveHistory ?? null,
    });
  } catch {
    return null;
  }
}

function resolveConversation(
  input: BirthSkyAiContextInput,
  meaning: MeaningSnapshot | null,
  development: DevelopmentSnapshot | null,
  adaptive: AdaptiveSnapshot | null,
): ConversationPlan | null {
  if (!resolvePipelineFeatureFlags().conversation) {
    return null;
  }
  if (input.conversationPlan === null) {
    return null;
  }
  if (input.conversationPlan?.conversationEngineVersion) {
    return input.conversationPlan;
  }
  try {
    return computeConversationPlan({
      meaning,
      development,
      adaptive,
      userQuestion: input.userQuestion,
      entryPoint: input.entryPoint,
      historySummary: input.conversationHistorySummary,
    });
  } catch {
    return null;
  }
}

function resolveEvidence(
  input: BirthSkyAiContextInput,
  meaning: MeaningSnapshot | null,
  development: DevelopmentSnapshot | null,
  adaptive: AdaptiveSnapshot | null,
  conversation: ConversationPlan | null,
): EvidenceSnapshot | null {
  if (!resolvePipelineFeatureFlags().evidence) {
    return null;
  }
  if (!shouldIncludeEvidenceInAiContext({ flag: input.includeEvidence })) {
    return null;
  }
  if (input.evidenceSnapshot === null) {
    return null;
  }
  if (input.evidenceSnapshot?.evidenceEngineVersion) {
    return input.evidenceSnapshot;
  }
  try {
    return computeEvidenceSnapshot({
      astronomy: {
        sunSign: input.sunSign,
        moonSign: input.moonSign,
        risingSign: input.risingSign,
        planetHouseMap: input.planetHouseMap,
        astrologyMode: input.astrologyMode,
        zodiacMode: input.zodiacMode,
        mercury: input.mercury ? { sign: input.mercury.sign } : null,
        venus: input.venus ? { sign: input.venus.sign } : null,
        mars: input.mars ? { sign: input.mars.sign } : null,
        jupiter: input.jupiter ? { sign: input.jupiter.sign } : null,
        saturn: input.saturn ? { sign: input.saturn.sign } : null,
      },
      meaning,
      development,
      adaptive,
      conversation,
      level: "compact",
    });
  } catch {
    return null;
  }
}

function appendEvidenceFacts(
  facts: string[],
  evidence: EvidenceSnapshot,
): void {
  facts.push(`evidence_engine=${evidence.evidenceEngineVersion}`);
  facts.push(
    `evidence_overall_confidence=${evidence.confidenceBreakdown.overall.toFixed(2)}`,
  );
  facts.push(`evidence_trace_count=${evidence.ruleTrace.length}`);
  for (const line of evidence.views.compact.slice(0, 16)) {
    facts.push(`evidence=${line}`);
  }
}

function appendConversationFacts(
  facts: string[],
  plan: ConversationPlan,
): void {
  facts.push(`conversation_engine=${plan.conversationEngineVersion}`);
  facts.push(`conversation_intent=${plan.profile.intent}`);
  facts.push(`conversation_depth=${plan.profile.depth}`);
  facts.push(`conversation_tone=${plan.profile.tone}`);
  facts.push(`conversation_priority=${plan.profile.priority}`);
  facts.push(`conversation_avoid=${plan.profile.avoid}`);
  facts.push(`conversation_order=${plan.profile.order}`);
  facts.push(`conversation_confidence=${plan.confidence.toFixed(2)}`);
  if (plan.priorityTopics.length) {
    facts.push(
      `conversation_priority_topics=${plan.priorityTopics.slice(0, 6).join(",")}`,
    );
  }
  if (plan.secondaryTopics.length) {
    facts.push(
      `conversation_secondary_topics=${plan.secondaryTopics.slice(0, 4).join(",")}`,
    );
  }
  if (plan.avoidTopics.length) {
    facts.push(`conversation_avoid_topics=${plan.avoidTopics.slice(0, 6).join(",")}`);
  }
  if (plan.recommendedExamples.length) {
    facts.push(
      `conversation_examples=${plan.recommendedExamples.slice(0, 4).join(",")}`,
    );
  }
  facts.push(`safety_flags=${plan.safetyFlags.slice(0, 8).join(",")}`);
  facts.push(`evidence_preference=${plan.strategy.evidencePreference}`);
  facts.push(`examples_allowed=${plan.strategy.examplesAllowed ? "true" : "false"}`);
}

function appendAdaptiveFacts(
  facts: string[],
  adaptive: AdaptiveSnapshot,
): void {
  facts.push(`adaptive_engine=${adaptive.adaptiveEngineVersion}`);
  facts.push(`engagement_level=${adaptive.profile.engagementLevel}`);
  facts.push(
    `recommended_session_length=${adaptive.profile.recommendedSessionLengthMinutes}`,
  );
  facts.push(`routine_health=${adaptive.profile.routineHealthLabel}`);
  facts.push(`adaptation_priority=${adaptive.profile.adaptationPriority}`);
  facts.push(
    `consistency_score=${adaptive.profile.consistencyScore.toFixed(2)}`,
  );
  facts.push(`adaptive_confidence=${adaptive.confidence.toFixed(2)}`);
  if (adaptive.profile.preferredActivityTypes.length) {
    facts.push(
      `preferred_activity_types=${adaptive.profile.preferredActivityTypes
        .slice(0, 6)
        .join(",")}`,
    );
  }
  if (adaptive.learningPreferences.avoidedActivities.length) {
    facts.push(
      `avoided_activity_types=${adaptive.learningPreferences.avoidedActivities
        .slice(0, 4)
        .join(",")}`,
    );
  }
  if (adaptive.engagementProfile.preferredActivityTiming !== "unknown") {
    facts.push(
      `preferred_activity_timing=${adaptive.engagementProfile.preferredActivityTiming}`,
    );
  }
  if (adaptive.learningPreferences.engagementTrend !== "unknown") {
    facts.push(
      `engagement_trend=${adaptive.learningPreferences.engagementTrend}`,
    );
  }
}

function appendDevelopmentFacts(
  facts: string[],
  development: DevelopmentSnapshot,
): void {
  facts.push(`development_engine=${development.developmentEngineVersion}`);
  facts.push(`development_stage=${development.profile.developmentStage}`);
  facts.push(`age_months=${development.ageMonths}`);
  facts.push(`development_confidence=${development.confidence.toFixed(2)}`);
  const join = (xs: string[]) => xs.slice(0, 6).join(",");
  if (development.profile.learningProfile.length) {
    facts.push(`learning_profile=${join(development.profile.learningProfile)}`);
  }
  if (development.profile.emotionalProfile.length) {
    facts.push(
      `emotional_profile=${join(development.profile.emotionalProfile)}`,
    );
  }
  if (development.profile.topPriorities.length) {
    facts.push(`top_priorities=${join(development.profile.topPriorities)}`);
  }
  if (development.profile.recommendedParentActions.length) {
    facts.push(
      `recommended_parent_actions=${join(development.profile.recommendedParentActions)}`,
    );
  }
  if (development.profile.avoidPatterns.length) {
    facts.push(`avoid_patterns=${join(development.profile.avoidPatterns)}`);
  }
  if (development.routineAlignment.strengths.length) {
    facts.push(
      `routine_strengths=${development.routineAlignment.strengths.slice(0, 6).join(" | ")}`,
    );
  }
  if (development.routineAlignment.missingOpportunities.length) {
    facts.push(
      `routine_gaps=${development.routineAlignment.missingOpportunities
        .slice(0, 6)
        .join(",")}`,
    );
  }
  if (development.recommendedActivities.length) {
    facts.push(
      `recommended_activities=${development.recommendedActivities
        .slice(0, 6)
        .map((a) => a.label)
        .join(" | ")}`,
    );
  }
}

function appendMeaningFacts(
  facts: string[],
  meaning: MeaningSnapshot,
  opts?: { preferDevelopmentEmotional?: boolean },
): void {
  facts.push(`meaning_engine=${meaning.meaningEngineVersion}`);
  if (meaning.astrologyMode) facts.push(`astrology_mode=${meaning.astrologyMode}`);
  if (meaning.zodiacMode) {
    const z =
      meaning.zodiacMode === "sidereal_lahiri" ? "sidereal" : meaning.zodiacMode;
    facts.push(`zodiac=${z}`);
  }
  const p = meaning.profile;
  const join = (xs: string[]) => xs.slice(0, 6).join(",");
  if (p.learningStyle.length) facts.push(`learning_style=${join(p.learningStyle)}`);
  if (p.communicationStyle.length) {
    facts.push(`communication_style=${join(p.communicationStyle)}`);
  }
  if (p.creativeStrength.length) {
    facts.push(`creative_strength=${join(p.creativeStrength)}`);
  }
  if (p.attentionPattern.length) {
    facts.push(`attention_pattern=${join(p.attentionPattern)}`);
  }
  // DevelopmentSnapshot owns emotional_profile when present.
  if (p.emotionalProfile.length && !opts?.preferDevelopmentEmotional) {
    facts.push(`emotional_profile=${join(p.emotionalProfile)}`);
  }
  if (p.socialProfile.length) facts.push(`social_profile=${join(p.socialProfile)}`);
  if (p.strengths.length) facts.push(`strengths=${join(p.strengths)}`);
  if (p.comfortNeeds.length) facts.push(`comfort_needs=${join(p.comfortNeeds)}`);
  if (p.motivationStyle.length) {
    facts.push(`motivation_style=${join(p.motivationStyle)}`);
  }
  if (p.curiosityPattern.length) {
    facts.push(`curiosity_pattern=${join(p.curiosityPattern)}`);
  }
  if (meaning.parentingGuidance.length) {
    facts.push(
      `parenting_guidance=${meaning.parentingGuidance
        .slice(0, 8)
        .map((g) => g.label)
        .join(" | ")}`,
    );
  }
  if (meaning.conflicts.length) {
    facts.push(
      `meaning_conflicts=${meaning.conflicts
        .slice(0, 4)
        .map((c) => `${c.a}/${c.b}:${c.resolution}`)
        .join(",")}`,
    );
  }
}

export function assembleBirthSkyPrompt(
  input: BirthSkyAiContextInput,
  opts?: { recentTurns?: RecentConversationTurn[] },
): AssembledPrompt {
  const schema = input.contextSchemaVersion || BIRTH_SKY_CONTEXT_SCHEMA_VERSION;
  const daySky =
    input.mode === "day_sky" || input.timePrecision === "unknown";

  const meaning = resolveMeaning(input);
  const development = resolveDevelopment(input, meaning);
  const adaptive = resolveAdaptive(input, development);
  const conversation = resolveConversation(
    input,
    meaning,
    development,
    adaptive,
  );
  const evidence = resolveEvidence(
    input,
    meaning,
    development,
    adaptive,
    conversation,
  );

  // Minimal sky anchors always — identity + grounding for Amy's voice.
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

  if (typeof input.astronomyConfidence === "number") {
    facts.push(`astronomy_confidence=${input.astronomyConfidence.toFixed(2)}`);
  }
  if (input.missingInputs?.length) {
    facts.push(`missing_inputs=${input.missingInputs.slice(0, 8).join(",")}`);
    facts.push(
      "language_guidance=use_cautious_language_for_missing_or_approximate_inputs",
    );
  }

  if (meaning) {
    appendMeaningFacts(facts, meaning, {
      preferDevelopmentEmotional: Boolean(development),
    });
    if (development) {
      appendDevelopmentFacts(facts, development);
      if (adaptive) {
        appendAdaptiveFacts(facts, adaptive);
      }
    }
    if (conversation) {
      appendConversationFacts(facts, conversation);
    }
    if (evidence) {
      appendEvidenceFacts(facts, evidence);
    }
  } else {
    if (conversation) {
      appendConversationFacts(facts, conversation);
    }
    if (evidence) {
      appendEvidenceFacts(facts, evidence);
    }
    // Legacy fallback — raw astronomy facts (pre–Meaning Engine clients / failures)
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
    if (input.houseSystem) facts.push(`house_system=${input.houseSystem}`);
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
      ] as const) {
        const h = houseMap[key];
        if (typeof h === "number" && h >= 1 && h <= 12) {
          facts.push(`${key}_house=${h}`);
        }
      }
    }
    if (input.zodiacMode) {
      const z =
        input.zodiacMode === "sidereal_lahiri" ? "sidereal" : input.zodiacMode;
      facts.push(`zodiac=${z}`);
    }
    if (input.ayanamsaName) facts.push(`ayanamsa=${input.ayanamsaName}`);
    if (input.moonNakshatra) facts.push(`moon_nakshatra=${input.moonNakshatra}`);
    if (typeof input.moonPada === "number") {
      facts.push(`moon_pada=${input.moonPada}`);
    }
    if (input.moonLord) facts.push(`moon_lord=${input.moonLord}`);
    if (houseMap) {
      for (const key of ["rahu", "ketu"] as const) {
        const h = houseMap[key];
        if (typeof h === "number" && h >= 1 && h <= 12) {
          facts.push(`${key}_house=${h}`);
        }
      }
    }
    if (input.currentMahadasha) {
      facts.push(`current_mahadasha=${input.currentMahadasha}`);
    }
    if (input.currentAntardasha) {
      facts.push(`current_antardasha=${input.currentAntardasha}`);
    }
    if (input.astrologyMode) facts.push(`astrology_mode=${input.astrologyMode}`);
    if (input.ascendantSign) {
      facts.push(`ascendant=${input.ascendantSign.toLowerCase()}`);
    }
    if (input.mcSign) facts.push(`mc=${input.mcSign.toLowerCase()}`);
    if (input.dominantElement) {
      facts.push(`dominant_element=${input.dominantElement}`);
    }
    if (input.dominantModality) {
      facts.push(`dominant_modality=${input.dominantModality}`);
    }
    if (input.majorAspects?.length) {
      facts.push(`major_aspects=${input.majorAspects.slice(0, 12).join(" | ")}`);
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

  const contextLabel = conversation
    ? "ConversationPlan + normalized snapshots (follow intent/depth/tone/order/avoid/safety; do not invent conversation flow); sky anchors for naming only:"
    : adaptive
      ? "Normalized adaptive + development + meaning context (prefer these structured facts; do not invent engagement history); sky anchors for naming only:"
      : development
        ? "Normalized development + meaning context (prefer these over inventing developmental needs); sky anchors for naming only:"
        : meaning
          ? "Normalized child-development meaning (prefer these over inventing traits); sky anchors for naming only:"
          : "Structured sky context (keys only — do not invent missing fields):";

  const userBlock = [
    `Parent question (entry=${input.entryPoint}):`,
    input.userQuestion.trim(),
    "",
    `Child first name: ${name}`,
    "Module: Amy Astro Intelligence (internal id: birth-sky)",
    contextLabel,
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
