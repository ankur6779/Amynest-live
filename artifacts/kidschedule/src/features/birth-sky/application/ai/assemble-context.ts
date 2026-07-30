/**
 * Client context assembly (Pack 6 §3) — keys only; never mutates snapshot.
 * Uses birth-sky-runtime for flags, failover, timings, and presentation experiments.
 */

import type { AdaptiveHistoryInput, AdaptiveSnapshot } from "@workspace/birth-sky-adaptive";
import type {
  ConversationHistorySummary,
  ConversationPlan,
} from "@workspace/birth-sky-conversation";
import {
  ageMonthsFromBirthDate,
  type DevelopmentSnapshot,
  type RoutineInput,
} from "@workspace/birth-sky-development";
import type { EvidenceSnapshot } from "@workspace/birth-sky-evidence";
import type {
  MeaningAstronomyInput,
  MeaningSnapshot,
} from "@workspace/birth-sky-meaning";
import { runIntelligencePipeline } from "@workspace/birth-sky-runtime";
import { BIRTH_SKY_CONTEXT_SCHEMA_VERSION } from "../../constants/ai-context";
import { TRADITIONAL_CONTENT_VERSION } from "../../constants/traditional-content";
import type {
  AstronomyData,
  BirthProfile,
  SkySnapshot,
} from "../../domain/models/birth-profile";
import type { ConversationEntryPoint } from "../../domain/models/conversation";

/** Strip domain-only fields so runtime Meaning input typechecks cleanly. */
function toMeaningAstronomyInput(a: AstronomyData): MeaningAstronomyInput {
  return {
    sunSign: a.sunSign,
    moonSign: a.moonSign,
    risingSign: a.risingSign,
    moonPhase: a.moonPhase,
    astrologyMode: a.astrologyMode ?? a.metadata?.astrologyMode ?? null,
    zodiacMode: a.zodiacMode ?? a.metadata?.zodiacMode ?? null,
    mercury: a.mercury ?? a.planetDegrees?.mercury ?? null,
    venus: a.venus ?? a.planetDegrees?.venus ?? null,
    mars: a.mars ?? a.planetDegrees?.mars ?? null,
    jupiter: a.jupiter ?? a.planetDegrees?.jupiter ?? null,
    saturn: a.saturn ?? a.planetDegrees?.saturn ?? null,
    planetHouseMap: a.planetHouseMap ?? null,
    moonProfile: a.moonProfile ?? null,
    nakshatra: a.nakshatra ?? null,
    dasha: a.dasha ?? null,
    westernBirthProfile: a.westernBirthProfile
      ? {
          dominantElement: a.westernBirthProfile.dominantElement,
          dominantModality: a.westernBirthProfile.dominantModality,
        }
      : null,
  };
}

function asPrefetchedMeaning(
  raw: AstronomyData["meaningSnapshot"],
): MeaningSnapshot | undefined {
  if (!raw?.meaningEngineVersion) return undefined;
  if (!("categories" in raw) || !raw.categories) return undefined;
  return raw as MeaningSnapshot;
}

export type BirthSkyPlanetContext = {
  sign: string;
  lonDeg: number;
  retrograde?: boolean;
};

export type BirthSkyStreamContextPayload = {
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
  traditionalContentVersion: string;
  traditionCardId?: string | null;
  lunarMansionKey?: string | null;
  reflectionIds?: string[];
  reflectionPromptIds?: string[];
  reflectionCount?: number;
  childFirstName?: string | null;
  userQuestion: string;
  entryPoint: ConversationEntryPoint;
  /** Optional planet enrichments from remote ephemeris — absent on legacy lite snapshots. */
  mercury?: BirthSkyPlanetContext | null;
  venus?: BirthSkyPlanetContext | null;
  mars?: BirthSkyPlanetContext | null;
  jupiter?: BirthSkyPlanetContext | null;
  saturn?: BirthSkyPlanetContext | null;
  uranus?: BirthSkyPlanetContext | null;
  neptune?: BirthSkyPlanetContext | null;
  pluto?: BirthSkyPlanetContext | null;
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
  houseDetails?: AstronomyData["houseDetails"];
  planetDetails?: AstronomyData["planetDetails"];
  chartCompleteness?: AstronomyData["chartCompleteness"];
  lagnaSignDetail?: string | null;
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
  meaningSnapshot?: MeaningSnapshot | null;
  developmentSnapshot?: DevelopmentSnapshot | null;
  ageMonths?: number | null;
  birthDate?: string | null;
  parentGoals?: string[];
  milestones?: string[];
  routines?: RoutineInput[];
  adaptiveSnapshot?: AdaptiveSnapshot | null;
  adaptiveHistory?: AdaptiveHistoryInput | null;
  conversationPlan?: ConversationPlan | null;
  conversationHistorySummary?: ConversationHistorySummary | null;
  /** Computed for QA/debug tooling — not sent to LLM unless includeEvidence. */
  evidenceSnapshot?: EvidenceSnapshot | null;
  includeEvidence?: boolean | null;
  /** Runtime observability (no PII). */
  runtimeRequestId?: string;
  runtimePipelineMs?: number;
  runtimeStatus?: "ok" | "degraded";
  runtimeExperimentArm?: string | null;
};

function planetCtx(
  p: { sign?: string; eclipticLongitudeDeg?: number; retrograde?: boolean } | undefined,
): BirthSkyPlanetContext | null {
  if (!p || typeof p.sign !== "string" || typeof p.eclipticLongitudeDeg !== "number") {
    return null;
  }
  return {
    sign: p.sign,
    lonDeg: p.eclipticLongitudeDeg,
    retrograde: Boolean(p.retrograde),
  };
}

export function assembleBirthSkyStreamContext(input: {
  profile: BirthProfile;
  snapshot: SkySnapshot;
  childFirstName: string;
  userQuestion: string;
  entryPoint: ConversationEntryPoint;
  traditionCardId?: string;
  lunarMansionKey?: string;
  reflectionIds?: string[];
  reflectionPromptIds?: string[];
  reflectionCount?: number;
  /** Optional enrichment — no UI required; empty defaults keep backward compat. */
  parentGoals?: string[];
  milestones?: string[];
  routines?: RoutineInput[];
  /** Anonymized history only (no identifiers). Optional. */
  adaptiveHistory?: AdaptiveHistoryInput | null;
  conversationHistorySummary?: ConversationHistorySummary | null;
}): BirthSkyStreamContextPayload {
  // Read-only snapshot fields — never rewrite astronomy or journal bodies.
  const a = input.snapshot.astronomy;
  const degrees = a.planetDegrees ?? {};
  const birthDate = input.profile.birthDate;
  const ageMonths = birthDate ? ageMonthsFromBirthDate(birthDate) : null;
  const requestId = `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const pipeline = runIntelligencePipeline({
    requestId,
    astronomy: toMeaningAstronomyInput(a),
    ageMonths,
    birthDate,
    parentGoals: input.parentGoals,
    milestones: input.milestones,
    routines: input.routines,
    adaptiveHistory: input.adaptiveHistory ?? null,
    userQuestion: input.userQuestion,
    entryPoint: input.entryPoint,
    conversationHistorySummary: input.conversationHistorySummary,
    meaning: asPrefetchedMeaning(a.meaningSnapshot),
  });

  return {
    contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
    snapshotVersion: input.snapshot.snapshotVersion,
    engineVersion: input.snapshot.engineVersion,
    mode: input.snapshot.mode,
    timePrecision: input.profile.timePrecision,
    placeProvided: Boolean(input.profile.birthPlace),
    sunSign: a.sunSign,
    moonSign: a.moonSign,
    moonPhase: a.moonPhase,
    moonPhaseLabel: a.moonPhaseLabel,
    risingSign: a.risingSign,
    traditionalContentVersion: TRADITIONAL_CONTENT_VERSION,
    traditionCardId: input.traditionCardId ?? null,
    lunarMansionKey: input.lunarMansionKey ?? null,
    reflectionIds: input.reflectionIds?.slice(0, 8),
    reflectionPromptIds: input.reflectionPromptIds?.slice(0, 8),
    reflectionCount: input.reflectionCount,
    childFirstName: input.childFirstName,
    userQuestion: input.userQuestion.trim(),
    entryPoint: input.entryPoint,
    mercury: planetCtx(a.mercury ?? degrees.mercury),
    venus: planetCtx(a.venus ?? degrees.venus),
    mars: planetCtx(a.mars ?? degrees.mars),
    jupiter: planetCtx(a.jupiter ?? degrees.jupiter),
    saturn: planetCtx(a.saturn ?? degrees.saturn),
    uranus: planetCtx(a.uranus ?? degrees.uranus),
    neptune: planetCtx(a.neptune ?? degrees.neptune),
    pluto: planetCtx(a.pluto ?? degrees.pluto),
    retrograde: a.retrograde?.slice(0, 12),
    planetDegreesJson: a.planetDegrees
      ? JSON.stringify(a.planetDegrees).slice(0, 2000)
      : null,
    kernel: a.kernel ?? a.metadata?.kernel ?? null,
    kernelFingerprint: a.kernelFingerprint ?? a.metadata?.kernelFingerprint ?? null,
    astronomyConfidence:
      typeof a.astronomyConfidence === "number"
        ? a.astronomyConfidence
        : typeof a.metadata?.astronomyConfidence === "number"
          ? a.metadata.astronomyConfidence
          : null,
    missingInputs: (a.missingInputs ?? a.metadata?.missingInputs)?.slice(0, 8),
    calculationMode: a.calculationMode ?? a.metadata?.calculationMode ?? null,
    houseSystem: a.houses?.system ?? a.metadata?.houseSystem ?? null,
    planetHouseMap: a.planetHouseMap ?? null,
    houseDetails: a.houseDetails?.slice(0, 12) ?? null,
    planetDetails: a.planetDetails?.slice(0, 12) ?? null,
    chartCompleteness: a.chartCompleteness ?? null,
    lagnaSignDetail: a.lagna?.sign ?? a.risingSign ?? null,
    zodiacMode: a.zodiacMode ?? a.metadata?.zodiacMode ?? null,
    ayanamsaName: a.ayanamsaName ?? a.metadata?.ayanamsaName ?? null,
    moonNakshatra: a.moonProfile?.nakshatra ?? a.nakshatra?.name ?? null,
    moonPada: a.moonProfile?.pada ?? a.nakshatra?.pada ?? null,
    moonLord: a.moonProfile?.lord ?? a.nakshatra?.lord ?? null,
    currentMahadasha: a.dasha?.mahadasha?.lord ?? null,
    currentAntardasha: a.dasha?.antardasha?.lord ?? null,
    astrologyMode: a.astrologyMode ?? a.metadata?.astrologyMode ?? null,
    ascendantSign: a.ascendant?.sign ?? a.risingSign ?? null,
    mcSign: a.midheaven?.sign ?? null,
    dominantElement: a.westernBirthProfile?.dominantElement ?? null,
    dominantModality: a.westernBirthProfile?.dominantModality ?? null,
    majorAspects: a.westernBirthProfile?.aspectSummary?.slice(0, 12),
    meaningSnapshot: pipeline.meaning,
    developmentSnapshot: pipeline.development,
    ageMonths,
    birthDate,
    parentGoals: input.parentGoals?.slice(0, 8),
    milestones: input.milestones?.slice(0, 12),
    routines: input.routines?.slice(0, 12),
    adaptiveSnapshot: pipeline.adaptive,
    adaptiveHistory: input.adaptiveHistory ?? null,
    conversationPlan: pipeline.conversation,
    conversationHistorySummary: input.conversationHistorySummary ?? null,
    evidenceSnapshot: pipeline.evidence,
    includeEvidence: null,
    runtimeRequestId: requestId,
    runtimePipelineMs: pipeline.totalPipelineMs,
    runtimeStatus: pipeline.status,
    runtimeExperimentArm: pipeline.experiment?.armId ?? null,
  };
}
