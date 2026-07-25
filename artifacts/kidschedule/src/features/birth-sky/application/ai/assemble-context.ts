/**
 * Client context assembly (Pack 6 §3) — keys only; never mutates snapshot.
 */

import { BIRTH_SKY_CONTEXT_SCHEMA_VERSION } from "../../constants/ai-context";
import { TRADITIONAL_CONTENT_VERSION } from "../../constants/traditional-content";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import type { ConversationEntryPoint } from "../../domain/models/conversation";

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
      | "pluto",
      number
    >
  > | null;
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
}): BirthSkyStreamContextPayload {
  // Read-only snapshot fields — never rewrite astronomy or journal bodies.
  const a = input.snapshot.astronomy;
  const degrees = a.planetDegrees ?? {};
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
  };
}
