/** Pack 3 Formation timing (normative). */
export const FORMATION_MIN_CEREMONY_MS = 3200;
export const FORMATION_SOFT_WAIT_MS = 5000;
export const FORMATION_HARD_TIMEOUT_MS = 15000;
export const FORMATION_CONVERGE_SETTLE_MS = 400;
export const FORMATION_OFFLINE_GRACE_MS = 2000;

/** Reveal primary CTA enable delay (Pack 3 §4.6). */
export const REVEAL_CTA_ENABLE_MS = 2000;

export const FORMATION_STAGES = [
  { id: "dark_sky_init", startMs: 0, endMs: 300 },
  { id: "seal_activation", startMs: 300, endMs: 900 },
  { id: "sky_awakening", startMs: 900, endMs: 1500 },
  { id: "star_emergence", startMs: 1500, endMs: 2200 },
  { id: "constellation_build", startMs: 2200, endMs: 2800 },
  { id: "light_bloom", startMs: 2800, endMs: 3100 },
  { id: "final_convergence", startMs: 3100, endMs: 3200 },
] as const;

export type FormationStageId = (typeof FORMATION_STAGES)[number]["id"];

export const FORMATION_STATUS_LINES = [
  "Gathering the light of that day…",
  "Placing the Moon…",
  "Mapping the quiet sky…",
  "Almost there…",
] as const;

export const FORMATION_SOFT_WAIT_COPY = "Still forming — thank you for waiting.";
