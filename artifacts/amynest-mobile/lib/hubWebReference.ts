// Canonical Parent Hub tile list as rendered by the web app
// (artifacts/kidschedule/src/pages/parenting-hub.tsx).
//
// Used by HubDebugOverlay to compute mobile-vs-web visual diffs without
// ever shipping web code into the mobile bundle.
//
// IMPORTANT: keep this file in sync whenever the web hub's `sections`
// array (around line 513 of parenting-hub.tsx) changes. The web file is
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

  // Always-current grid
  { id: "amy",       title: "Ask Amy AI",          bands: "all" },
  { id: "articles",  title: "Parenting Articles",  bands: "all" },
  { id: "tips",      title: "Daily Tips",          bands: "all" },
  { id: "emotional", title: "Emotional Support",   bands: "all" },
  { id: "activities",title: "Activities & Learning", bands: "all" },

  // Band-based grid
  { id: "story-hub",      title: "Kids Story Hub",          bands: ["0-2", "2-4", "4-6", "6-8"] },
  { id: "phonics",        title: "Phonics Learning",        bands: ["2-4", "4-6"], ageMonthsMin: 12, ageMonthsMax: 72 },
  { id: "ptm-prep",       title: "PTM Prep Assistant",      bands: ["4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 36, ageMonthsMax: 216 },
  { id: "smart-study",    title: "Smart Study Zone",        bands: ["4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 36, ageMonthsMax: 204 },
  { id: "event-prep",     title: "Event Prep (School Ready)", bands: ["4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 36, ageMonthsMax: 180 },
  { id: "olympiad",       title: "Smart Olympiad Zone",     bands: ["4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 36, ageMonthsMax: 192 },
  { id: "life-skills",    title: "Life Skills Mode",        bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 24, ageMonthsMax: 192 },
  { id: "coloring-books", title: "Coloring Books",          bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"], ageMonthsMin: 24 },
];

// Section 2 — fixed preview tiles the web renders ONLY for 0-24 month children.
// Source: SECTION_2_PREVIEW_TILES in parenting-hub.tsx.
export const WEB_SECTION_2_TILES: readonly { id: string; title: string }[] = [
  { id: "life-skills",    title: "🧭 Life Skills Mode" },
  { id: "olympiad",       title: "🏆 Smart Olympiad Zone" },
  { id: "event-prep",     title: "🎉 Event Prep (School Ready)" },
  { id: "smart-study",    title: "📚 Smart Study Zone" },
  { id: "ptm-prep",       title: "🧾 PTM Prep Assistance" },
  { id: "phonics",        title: "🔤 Phonics Learning" },
  { id: "coloring-books", title: "🎨 Coloring Books" },
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
}

/**
 * Compute a side-by-side diff between mobile-rendered tile ids and the
 * web reference for the same child/band.
 */
export function diffTiles(
  mobileTileIds: readonly string[],
  webTileIds: readonly string[],
): HubDiff {
  const mobileSet = new Set(mobileTileIds);
  const webSet = new Set(webTileIds);

  const extraOnMobile = mobileTileIds.filter((id) => !webSet.has(id));
  const missingOnMobile = webTileIds.filter((id) => !mobileSet.has(id));
  const shared = mobileTileIds.filter((id) => webSet.has(id));

  const orderMismatches: HubDiff["orderMismatches"] = [];
  for (const id of shared) {
    const webIndex = webTileIds.indexOf(id);
    const mobileIndex = mobileTileIds.indexOf(id);
    if (webIndex !== mobileIndex) {
      orderMismatches.push({ id, webIndex, mobileIndex });
    }
  }

  return { extraOnMobile, missingOnMobile, shared, orderMismatches };
}
