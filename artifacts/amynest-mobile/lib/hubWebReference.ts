// Canonical Parent Hub tile list as rendered by the web app
// (artifacts/kidschedule/src/pages/parenting-hub.tsx).
//
// Used by HubDebugOverlay to compute mobile-vs-web visual diffs without
// ever shipping web code into the mobile bundle.
//
// IMPORTANT: keep this file in sync whenever the web hub's `sections`
// array (around line 725 of parenting-hub.tsx) changes. The web file is
// the source of truth; this is a hand-maintained mirror used purely for
// dev-time diff diagnostics.

export type WebTileBand = "0-2" | "2-4" | "4-6" | "6-8" | "8-10" | "10-12" | "12-15";

export interface WebHubTile {
  id: string;
  title: string;
  /** "all" === alwaysCurrent on web (shown for every band). */
  bands: readonly WebTileBand[] | "all";
  /** Featured (full-width, top of grid). */
  featured?: boolean;
  /** Lower bound on totalAgeMonths the web tile renders for, if any. */
  ageMonthsMin?: number;
  /** Upper bound (exclusive) on totalAgeMonths the web tile renders for, if any. */
  ageMonthsMax?: number;
}

// Section 1 — derived from parenting-hub.tsx `sections` array.
export const WEB_HUB_TILES: readonly WebHubTile[] = [
  // Featured (full-width, top)
  { id: "command-center",    title: "Command Center",                bands: "all", featured: true },
  { id: "infant-hub",        title: "Infant Hub",                    bands: ["0-2"], featured: true, ageMonthsMax: 24 },
  { id: "tomorrow-forecast", title: "Amy AI — Tomorrow's Forecast",  bands: "all", featured: true },

  // Smart Math Tricks — top of grid for ages 4–8
  { id: "smart-math-tricks", title: "Smart Math Tricks",  bands: ["4-6", "6-8"] },

  // Abacus PRO Zone — ages 4–10 (#214)
  { id: "abacus", title: "Abacus PRO Zone", bands: ["4-6", "6-8", "8-10"] },

  // Always-current grid
  { id: "amy",       title: "Ask Amy AI",          bands: "all" },
  { id: "articles",  title: "Parenting Articles",  bands: "all" },
  { id: "tips",      title: "Daily Tips",          bands: "all" },
  { id: "emotional", title: "Emotional Support",   bands: "all" },
  { id: "activities",title: "Activities & Learning", bands: "all" },
  { id: "art-craft", title: "Art & Craft Videos", bands: "all" },

  // Band-based grid
  { id: "story-hub",      title: "Kids Story Hub",          bands: ["0-2", "2-4", "4-6", "6-8"] },
  { id: "phonics",        title: "Phonics Learning",        bands: ["2-4", "4-6"], ageMonthsMin: 12, ageMonthsMax: 72 },
  { id: "ptm-prep",       title: "PTM Prep Assistant",      bands: ["4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 36, ageMonthsMax: 216 },
  { id: "smart-study",    title: "Smart Study Zone",        bands: ["4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 36, ageMonthsMax: 204 },
  { id: "event-prep",     title: "Event Prep (School Ready)", bands: ["4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 36, ageMonthsMax: 180 },
  { id: "olympiad",       title: "Smart Olympiad Zone",     bands: ["4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 36, ageMonthsMax: 192 },
  { id: "life-skills",    title: "Life Skills Mode",        bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 24, ageMonthsMax: 192 },
  { id: "coloring-books", title: "Coloring Books",          bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 24 },
  { id: "fun-sheets",     title: "Fun Sheets",              bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 24 },
];

// Section 2 — fixed preview tiles the web renders ONLY for 0-24 month children.
// Source: SECTION_2_PREVIEW_TILES in parenting-hub.tsx (8 tiles, in order).
export const WEB_SECTION_2_TILES: readonly { id: string; title: string }[] = [
  { id: "life-skills",    title: "🧭 Life Skills Mode" },
  { id: "olympiad",       title: "🏆 Smart Olympiad Zone" },
  { id: "event-prep",     title: "🎉 Event Prep (School Ready)" },
  { id: "smart-study",    title: "📚 Smart Study Zone" },
  { id: "ptm-prep",       title: "🧾 PTM Prep Assistance" },
  { id: "phonics",        title: "🔤 Phonics Learning" },
  { id: "coloring-books", title: "🎨 Coloring Books" },
  { id: "fun-sheets",     title: "📄 Fun Sheets" },
];

/**
 * Tile ids that exist on mobile but intentionally have no web counterpart.
 * The dev-only HubDebugOverlay treats these as "documented mobile extras"
 * and excludes them from the `extraOnMobile` diff so we don't get false
 * positives every time the overlay opens.
 *
 * Add a new id here only when the product team has decided to keep a
 * mobile-only feature instead of porting/removing it. Otherwise, prefer
 * to either port the tile to web or remove it from mobile.
 */
export const MOBILE_ONLY_EXTRAS: ReadonlySet<string> = new Set([
  // Mobile-only routine flow (separate from web's "Activities" tile).
  "morning-flow",
  // Placeholder "SOON" tile for the upcoming Kids Control Center feature.
  "kids-control-center",
  // Standalone Tiffin & Meals route on mobile (web nests this inside the
  // Activities/meal generator surface).
  "meals",
  // PrintableWorksheets — distinct mobile experience kept alongside the
  // newly-ported "fun-sheets" web tile to preserve existing user flows.
  "worksheets",
  // Amazing Facts mini-card — mobile-only standalone hub tile. Task #196
  // extended the band coverage in `hub-bands.ts` so 0–24m children also see
  // it, but it remains its own tile rather than being nested inside
  // InfantHub.
  "facts",
  // AI Meal Suggestions mini-card (web exposes this through the Activities
  // and meal generator surfaces instead).
  "meal-suggestions",
  // Mobile keeps a standalone always-current Nutrition tile (web wraps
  // nutrition into the Activities tile).
  "nutrition",
  // Task #197 — these surfaces exist on web inside the kidschedule
  // dashboard (age-based-sections / daily-story-section / daily-puzzle),
  // not as parenting-hub tiles. We host them as hub tiles on mobile to
  // bring the Parent Hub to feature parity, so the parity check treats
  // them as documented mobile extras.
  "skills-focus",
  "daily-story",
  "daily-puzzle",
]);

/**
 * Sub-content surfaces rendered INSIDE the mobile InfantHub featured card
 * (task #196). These are not standalone tiles, so they have no entry in
 * `WEB_HUB_TILES` / `MOBILE_ONLY_EXTRAS`. The mapping below documents the
 * web component each mobile section mirrors so the dev overlay can show a
 * "what's inside InfantHub" parity readout without false positives.
 */
export const INFANT_HUB_PARITY_SECTIONS: readonly {
  id: string;
  mobileComponent: string;
  webSource: string;
}[] = [
  { id: "infant-health",        mobileComponent: "components/infant/InfantHealthTab.tsx",
    webSource: "src/components/infant-hub.tsx → VACCINATIONS + COMMON_ISSUES" },
  { id: "infant-milestones",    mobileComponent: "components/infant/InfantMilestonesTab.tsx",
    webSource: "src/components/infant-milestones.tsx → MILESTONES" },
  { id: "infant-cues",          mobileComponent: "components/infant/InfantCuesTab.tsx",
    webSource: "src/components/infant-baby-cues.tsx → CUES" },
  { id: "infant-sounds",        mobileComponent: "components/infant/InfantSoundsTab.tsx",
    webSource: "src/components/infant-sounds.tsx → NOISE_TYPES + AGE_TIPS" },
  { id: "infant-sleep-helpers", mobileComponent: "components/infant/InfantSleepHelpers.tsx",
    webSource: "src/components/infant-sleep-module.tsx → getWakeSpec + detectIssues + generateRoutine" },
  { id: "infant-feeding-ref",   mobileComponent: "components/infant/InfantFeedingReference.tsx",
    webSource: "src/components/infant-hub.tsx → getFeedingGuide" },
  { id: "infant-facts",         mobileComponent: "components/AmazingFacts.tsx",
    webSource: "src/pages/parenting-hub.tsx (always-current) — extended infant group ≤24m" },
];

const WEB_BAND_LABELS: readonly WebTileBand[] = [
  "0-2", "2-4", "4-6", "6-8", "8-10", "10-12", "12-15",
];

export function bandIndexToWebLabel(idx: number): WebTileBand {
  return WEB_BAND_LABELS[Math.max(0, Math.min(WEB_BAND_LABELS.length - 1, idx))];
}

/**
 * Given a child's band + total age in months, return the tiles the web hub
 * would render in Section 1 (in render order: featured → grid).
 */
export function computeWebSection1Tiles(
  band: WebTileBand,
  ageMonths: number,
): readonly WebHubTile[] {
  return WEB_HUB_TILES.filter((t) => {
    if (t.bands !== "all" && !t.bands.includes(band)) return false;
    if (t.ageMonthsMin != null && ageMonths < t.ageMonthsMin) return false;
    if (t.ageMonthsMax != null && ageMonths >= t.ageMonthsMax) return false;
    return true;
  });
}

/**
 * Returns true when the web hub would render its Section 2 preview block
 * for this child. The rule on web: only the 0-24 month band sees Section 2.
 */
export function computeWebShowsSection2(band: WebTileBand): boolean {
  return band === "0-2";
}

export interface HubDiff {
  /** Tiles that mobile renders but web does NOT for this child. */
  extraOnMobile: string[];
  /** Tiles that web renders but mobile does NOT for this child. */
  missingOnMobile: string[];
  /** Tiles rendered by both (intersection). */
  shared: string[];
  /** Order mismatches: tiles present in both but in different positions. */
  orderMismatches: { id: string; webIndex: number; mobileIndex: number }[];
  /** Mobile-only extras filtered out of `extraOnMobile` (documented in
   *  MOBILE_ONLY_EXTRAS) — surfaced separately so the overlay can show
   *  them as informational rather than as diffs. */
  mobileOnlyExtras: string[];
}

/**
 * Compute a side-by-side diff between mobile-rendered tile ids and the
 * web reference for the same child/band.
 *
 * Tile ids in `MOBILE_ONLY_EXTRAS` are treated as intentional mobile
 * additions — they appear in `mobileOnlyExtras` but are excluded from
 * `extraOnMobile` so the overlay's issue count stays focused on real
 * parity gaps. Order indices are computed against the *visible* mobile
 * list (extras included) so the side-by-side view stays accurate.
 */
export function diffTiles(
  mobileTileIds: readonly string[],
  webTileIds: readonly string[],
): HubDiff {
  const mobileSet = new Set(mobileTileIds);
  const webSet = new Set(webTileIds);

  // Mobile ids that web doesn't render, partitioned into documented
  // extras vs unexpected ones.
  const allExtra = mobileTileIds.filter((id) => !webSet.has(id));
  const mobileOnlyExtras = allExtra.filter((id) => MOBILE_ONLY_EXTRAS.has(id));
  const extraOnMobile = allExtra.filter((id) => !MOBILE_ONLY_EXTRAS.has(id));

  const missingOnMobile = webTileIds.filter((id) => !mobileSet.has(id));
  const shared = mobileTileIds.filter((id) => webSet.has(id));

  // Build a "mobile order index" that ignores documented extras so order
  // mismatches reflect the canonical (web-comparable) positions only.
  const mobileCanonicalOrder = mobileTileIds.filter(
    (id) => !MOBILE_ONLY_EXTRAS.has(id),
  );
  const orderMismatches: HubDiff["orderMismatches"] = [];
  for (const id of shared) {
    const webIndex = webTileIds.indexOf(id);
    const mobileIndex = mobileCanonicalOrder.indexOf(id);
    if (webIndex !== mobileIndex) {
      orderMismatches.push({ id, webIndex, mobileIndex });
    }
  }

  return { extraOnMobile, missingOnMobile, shared, orderMismatches, mobileOnlyExtras };
}
