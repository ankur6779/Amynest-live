/**
 * Existing Today card + CTA identities only.
 * String constants — no React, no component imports.
 * Must match Legacy Today section / test ids.
 */

/** Cards that already exist on Today. No new cards. */
export const TODAY_EXISTING_CARD_IDS = Object.freeze({
  mission: "v2-today-mission",
  coach: "v2-today-coach",
  askAmy: "v2-today-ask-amy",
  premium: "v2-today-premium",
} as const);

export type TodayExistingCardId =
  (typeof TODAY_EXISTING_CARD_IDS)[keyof typeof TODAY_EXISTING_CARD_IDS];

/** CTAs that already exist on Today. Resolver never executes them. */
export const TODAY_EXISTING_CTA_IDS = Object.freeze({
  missionStart: "v2-today-mission-start",
  coachCta: "v2-today-coach-cta",
  askAmyEntry: "v2-today-ask-amy-entry",
  premiumEntry: "v2-today-premium-entry",
} as const);

export type TodayExistingCtaId =
  (typeof TODAY_EXISTING_CTA_IDS)[keyof typeof TODAY_EXISTING_CTA_IDS];

export type ExperienceCardMapping = Readonly<{
  cardId: TodayExistingCardId;
  ctaId: TodayExistingCtaId;
}>;

/**
 * Experience → existing Today card map.
 * Experiences without a Today card are intentionally absent (missingCards).
 */
export const EXPERIENCE_TO_TODAY_CARD: Readonly<
  Record<string, ExperienceCardMapping>
> = Object.freeze({
  speech_mission: Object.freeze({
    cardId: TODAY_EXISTING_CARD_IDS.mission,
    ctaId: TODAY_EXISTING_CTA_IDS.missionStart,
  }),
  amy_coach: Object.freeze({
    cardId: TODAY_EXISTING_CARD_IDS.coach,
    ctaId: TODAY_EXISTING_CTA_IDS.coachCta,
  }),
  ask_amy: Object.freeze({
    cardId: TODAY_EXISTING_CARD_IDS.askAmy,
    ctaId: TODAY_EXISTING_CTA_IDS.askAmyEntry,
  }),
  // for_child — no Today card today → missing
});

export const ALL_KNOWN_CARD_ID_SET: ReadonlySet<string> = new Set(
  Object.values(TODAY_EXISTING_CARD_IDS),
);
