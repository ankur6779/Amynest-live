/**
 * Surface-independent experience catalog.
 * Ids + facts only — never imports Today / Coach / Ask Amy / For Child.
 */

import {
  AMY_EXPERIENCE_REFS,
  AMY_JOURNEY,
} from "@/v2/amy-decision/policy";

export type ExperienceType =
  | "speech"
  | "sleep"
  | "coach"
  | "guide"
  | "treasury"
  | "unknown";

export type ExperienceAvailability =
  | "available"
  | "limited"
  | "unavailable"
  | "unknown";

export type ExperiencePremiumState =
  | "none"
  | "eligible"
  | "locked"
  | "unlocked"
  | "supported"
  | "unknown";

export type ExperienceCatalogEntry = Readonly<{
  experienceType: ExperienceType;
  /** Stable content identity — not a UI path. */
  resolvedContentId: string;
  recommendedJourney: string;
  featureIds: ReadonlyArray<string>;
  routeIds: ReadonlyArray<string>;
  toolIds: ReadonlyArray<string>;
  availability: ExperienceAvailability;
  premiumState: ExperiencePremiumState;
}>;

function fromRefs(
  experienceId: string,
  partial: Omit<
    ExperienceCatalogEntry,
    "featureIds" | "routeIds" | "toolIds"
  >,
): ExperienceCatalogEntry {
  const refs = AMY_EXPERIENCE_REFS[experienceId];
  return Object.freeze({
    ...partial,
    featureIds: Object.freeze([...(refs?.featureIds ?? [])]),
    routeIds: Object.freeze([...(refs?.routeIds ?? [])]),
    toolIds: Object.freeze([...(refs?.toolIds ?? [])]),
  });
}

/**
 * Known Brain experiences — reusable across surfaces.
 * Content ids are machine-only; surfaces bind later.
 */
export const EXPERIENCE_CATALOG: Readonly<
  Record<string, ExperienceCatalogEntry>
> = Object.freeze({
  speech_mission: fromRefs("speech_mission", {
    experienceType: "speech",
    resolvedContentId: "content.speech_mission.v1",
    recommendedJourney: AMY_JOURNEY.SPEECH_DAILY,
    availability: "available",
    premiumState: "none",
  }),
  amy_coach: fromRefs("amy_coach", {
    experienceType: "coach",
    resolvedContentId: "content.amy_coach.v1",
    recommendedJourney: AMY_JOURNEY.COACH_LONG_TERM,
    availability: "available",
    premiumState: "eligible",
  }),
  ask_amy: fromRefs("ask_amy", {
    experienceType: "guide",
    resolvedContentId: "content.ask_amy.v1",
    recommendedJourney: AMY_JOURNEY.GUIDE_IMMEDIATE,
    availability: "available",
    premiumState: "none",
  }),
  for_child: fromRefs("for_child", {
    experienceType: "treasury",
    resolvedContentId: "content.for_child.v1",
    recommendedJourney: AMY_JOURNEY.TREASURY,
    availability: "available",
    premiumState: "eligible",
  }),
});

/**
 * Static Brain / surface catalog only.
 * Pack Experience Definitions register separately — never authored here.
 */
export function lookupStaticExperienceCatalog(
  experienceId: string,
): ExperienceCatalogEntry | null {
  return EXPERIENCE_CATALOG[experienceId] ?? null;
}
