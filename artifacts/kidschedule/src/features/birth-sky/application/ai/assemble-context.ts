/**
 * Client context assembly (Pack 6 §3) — keys only; never mutates snapshot.
 */

import { BIRTH_SKY_CONTEXT_SCHEMA_VERSION } from "../../constants/ai-context";
import { TRADITIONAL_CONTENT_VERSION } from "../../constants/traditional-content";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import type { ConversationEntryPoint } from "../../domain/models/conversation";

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
};

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
  return {
    contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
    snapshotVersion: input.snapshot.snapshotVersion,
    engineVersion: input.snapshot.engineVersion,
    mode: input.snapshot.mode,
    timePrecision: input.profile.timePrecision,
    placeProvided: Boolean(input.profile.birthPlace),
    sunSign: input.snapshot.astronomy.sunSign,
    moonSign: input.snapshot.astronomy.moonSign,
    moonPhase: input.snapshot.astronomy.moonPhase,
    moonPhaseLabel: input.snapshot.astronomy.moonPhaseLabel,
    risingSign: input.snapshot.astronomy.risingSign,
    traditionalContentVersion: TRADITIONAL_CONTENT_VERSION,
    traditionCardId: input.traditionCardId ?? null,
    lunarMansionKey: input.lunarMansionKey ?? null,
    reflectionIds: input.reflectionIds?.slice(0, 8),
    reflectionPromptIds: input.reflectionPromptIds?.slice(0, 8),
    reflectionCount: input.reflectionCount,
    childFirstName: input.childFirstName,
    userQuestion: input.userQuestion.trim(),
    entryPoint: input.entryPoint,
  };
}
