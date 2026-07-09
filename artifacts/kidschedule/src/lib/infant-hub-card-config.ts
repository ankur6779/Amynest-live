import {
  parseSectionAccentRgb,
  parseSectionTintRgb,
} from "@/lib/hub-section-header-theme";

export type InfantHubCardId =
  | "cry"
  | "sleep"
  | "milestones"
  | "feeding"
  | "growth"
  | "wellbeing"
  | "health"
  | "doctor"
  | "coparent"
  | "sounds"
  | "weekly-focus"
  | "amy-suggests"
  | "coaching"
  | "activities";

export type InfantHubTileTheme = {
  tintRgb: string;
  watermark: string;
  ambientGlow: string;
  descriptionKey: string;
  defaultDescription: string;
};

export const INFANT_HUB_TILE_THEMES: Record<InfantHubCardId, InfantHubTileTheme> = {
  cry: {
    tintRgb: "244,114,182",
    watermark: "💬",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(244,114,182,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(236,72,153,0.28), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.cry.description",
    defaultDescription: "Record & analyze — likely causes in seconds",
  },
  sleep: {
    tintRgb: "96,165,250",
    watermark: "🌙",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(96,165,250,0.36), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(99,102,241,0.28), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.sleep.description",
    defaultDescription: "Wake windows, routines & sleep coaching",
  },
  milestones: {
    tintRgb: "167,139,250",
    watermark: "✦",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(167,139,250,0.36), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(168,85,247,0.28), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.milestones.description",
    defaultDescription: "Track development week by week",
  },
  feeding: {
    tintRgb: "248,113,113",
    watermark: "🔥",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(248,113,113,0.36), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(249,115,22,0.28), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.feeding.description",
    defaultDescription: "Log feeds, plan meals & diaper tracking",
  },
  growth: {
    tintRgb: "52,211,153",
    watermark: "📈",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(52,211,153,0.34), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(20,184,166,0.26), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.growth.description",
    defaultDescription: "Weight, height & WHO percentiles",
  },
  wellbeing: {
    tintRgb: "244,114,182",
    watermark: "❤️",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(244,114,182,0.32), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(251,113,133,0.24), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.wellbeing.description",
    defaultDescription: "Your energy & mental health check-ins",
  },
  health: {
    tintRgb: "45,212,191",
    watermark: "💉",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(45,212,191,0.34), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(34,211,238,0.26), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.health.description",
    defaultDescription: "Vaccines & common issues at this age",
  },
  doctor: {
    tintRgb: "56,189,248",
    watermark: "📋",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(56,189,248,0.34), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(59,130,246,0.26), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.doctor.description",
    defaultDescription: "Export a visit-ready health summary",
  },
  coparent: {
    tintRgb: "129,140,248",
    watermark: "👥",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(129,140,248,0.34), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(99,102,241,0.26), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.coparent.description",
    defaultDescription: "Share updates with your partner",
  },
  sounds: {
    tintRgb: "34,211,238",
    watermark: "🎵",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(34,211,238,0.32), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(20,184,166,0.24), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.sounds.description",
    defaultDescription: "White noise & lullabies for calm",
  },
  "weekly-focus": {
    tintRgb: "251,191,36",
    watermark: "⭐",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(251,191,36,0.34), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(234,179,8,0.26), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.weekly_focus.description",
    defaultDescription: "One insight to try this week",
  },
  "amy-suggests": {
    tintRgb: "168,85,247",
    watermark: "🧠",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(168,85,247,0.34), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(99,102,241,0.26), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.amy_suggests.description",
    defaultDescription: "Age-matched tips from Amy",
  },
  coaching: {
    tintRgb: "139,92,246",
    watermark: "💡",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(139,92,246,0.34), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(99,102,241,0.26), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.coaching.description",
    defaultDescription: "Baby cues & communication coaching",
  },
  activities: {
    tintRgb: "52,211,153",
    watermark: "⚡",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(52,211,153,0.34), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(34,197,94,0.26), transparent 55%)",
    descriptionKey: "parent_hub.infant_hub_cards.activities.description",
    defaultDescription: "Daily play ideas for this age",
  },
};

/** Map DOM section ids (infant-cry, …) to card theme keys. */
export const INFANT_HUB_SECTION_MAP: Record<string, InfantHubCardId> = {
  "infant-cry": "cry",
  "infant-sleep": "sleep",
  "infant-milestones": "milestones",
  "infant-feeding": "feeding",
  "infant-growth": "growth",
  "infant-wellbeing": "wellbeing",
  "infant-health": "health",
  "infant-doctor": "doctor",
  "infant-coparent": "coparent",
  "infant-sounds": "sounds",
  "infant-weekly-focus": "weekly-focus",
  "infant-amy-suggests": "amy-suggests",
  "infant-coaching": "coaching",
  "infant-activities": "activities",
};

export function resolveInfantHubCardId(
  sectionId: string | undefined,
  cardId?: InfantHubCardId,
): InfantHubCardId | undefined {
  if (cardId) return cardId;
  if (!sectionId) return undefined;
  return INFANT_HUB_SECTION_MAP[sectionId];
}

export function infantHubSectionCssVars(tintRgb: string): Record<string, number> {
  const [r, g, b] = parseSectionTintRgb(tintRgb);
  const [ar, ag, ab] = parseSectionAccentRgb(tintRgb);
  return {
    "--hub-section-r": r,
    "--hub-section-g": g,
    "--hub-section-b": b,
    "--hub-section-accent-r": ar,
    "--hub-section-accent-g": ag,
    "--hub-section-accent-b": ab,
  } as Record<string, number>;
}
