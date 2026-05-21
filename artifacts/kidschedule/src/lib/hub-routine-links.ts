import type { AgeBand } from "@/lib/age-bands";
import { getAgeBand } from "@/lib/age-bands";
import { isInfantHubAge } from "@workspace/infant-hub";

/** Routine category → Parent Hub tile id (web ids). */
export const ROUTINE_CATEGORY_TO_TILE_ID: Readonly<Record<string, string>> = {
  homework: "smart-study",
  study: "smart-study",
  reading: "story-hub",
  creative: "art-craft",
  play: "activities",
  outdoor: "activities",
  meal: "meals",
  tiffin: "meals",
  snack: "meals",
  exercise: "life-skills",
  morning: "morning-flow",
  morning_routine: "morning-flow",
  bonding: "daily-tips",
  family: "daily-tips",
};

export function routineCategoryToTileId(
  category: string | null | undefined,
): string | null {
  if (!category) return null;
  return ROUTINE_CATEGORY_TO_TILE_ID[category.toLowerCase()] ?? null;
}

/** Web hub section groups (matches parenting-hub.tsx). */
export const WEB_HUB_SECTION_TILE_IDS: Readonly<Record<string, readonly string[]>> = {
  today: ["amy-ai", "daily-tips"],
  learning: [
    "smart-math-tricks",
    "abacus",
    "phonics",
    "spelling-mastery",
    "smart-study",
    "olympiad",
    "event-prep",
  ],
  creativity: ["activities", "art-craft", "coloring-books", "fun-sheets"],
  stories: ["story-hub", "speech-coach"],
  support: ["articles", "emotional", "life-skills", "ptm-prep"],
};

const TILE_TO_GROUP: Readonly<Record<string, string>> = (() => {
  const map: Record<string, string> = {};
  for (const [group, ids] of Object.entries(WEB_HUB_SECTION_TILE_IDS)) {
    for (const id of ids) map[id] = group;
  }
  for (const id of ["command-center", "infant-hub", "tomorrow-forecast"]) {
    map[id] = "today";
  }
  return map;
})();

export function hubTileGroupKey(tileId: string): string | null {
  return TILE_TO_GROUP[tileId] ?? null;
}

const TILE_DIRECT_ROUTES: Readonly<Record<string, string>> = {
  phonics: "/phonics",
  "speech-coach": "/speech-coach",
};

/** Tiles that exist on web Parent Hub (or dedicated routes). */
const WEB_KNOWN_TILE_IDS = new Set([
  ...Object.values(WEB_HUB_SECTION_TILE_IDS).flat(),
  "command-center",
  "infant-hub",
  "tomorrow-forecast",
  "smart-math-tricks",
  "abacus",
  "spelling-mastery",
  "articles",
  "emotional",
  "worksheets",
]);

export function isKnownWebHubTile(tileId: string): boolean {
  return WEB_KNOWN_TILE_IDS.has(tileId);
}

export function hubTileHref(tileId: string): string {
  return TILE_DIRECT_ROUTES[tileId] ?? `/parenting-hub#${tileId}`;
}

/** Hub quick-jump for a routine item category, or null when no web target exists. */
export function hubJumpForCategory(
  category: string | null | undefined,
): DashboardHubPick | null {
  const tileId = routineCategoryToTileId(category);
  if (!tileId) return null;
  if (!isKnownWebHubTile(tileId) && !(tileId in TILE_DIRECT_ROUTES)) return null;
  return { tileId, href: hubTileHref(tileId) };
}

export type DashboardHubPick = {
  tileId: string;
  href: string;
};

function isTileAvailableForAge(tileId: string, totalAgeMonths: number): boolean {
  switch (tileId) {
    case "infant-hub":
      return isInfantHubAge(totalAgeMonths);
    case "phonics":
      return totalAgeMonths >= 12 && totalAgeMonths < 72;
    case "speech-coach":
      return totalAgeMonths < 132;
    case "smart-study":
    case "event-prep":
      return totalAgeMonths >= 36 && totalAgeMonths < 204;
    case "olympiad":
      return totalAgeMonths >= 36 && totalAgeMonths < 192;
    case "ptm-prep":
      return totalAgeMonths >= 36 && totalAgeMonths < 216;
    case "life-skills":
      return totalAgeMonths >= 24 && totalAgeMonths < 192;
    case "coloring-books":
    case "fun-sheets":
    case "spelling-mastery":
      return totalAgeMonths >= 24;
    case "smart-math-tricks":
      return totalAgeMonths >= 48 && totalAgeMonths < 96;
    case "abacus":
      return totalAgeMonths >= 60 && totalAgeMonths < 120;
    default:
      return true;
  }
}

const DASHBOARD_PICKS_BY_BAND: Readonly<Record<AgeBand, readonly string[]>> = {
  "0-2": ["infant-hub", "daily-tips", "amy-ai"],
  "2-4": ["phonics", "activities", "story-hub"],
  "4-6": ["phonics", "story-hub", "activities"],
  "6-8": ["smart-study", "story-hub", "speech-coach"],
  "8-10": ["smart-study", "olympiad", "event-prep"],
  "10-12": ["olympiad", "smart-study", "ptm-prep"],
  "12-15": ["smart-study", "ptm-prep", "event-prep"],
};

/** Up to two age-appropriate hub cards for the dashboard "For you today" row. */
export function pickDashboardHubRecommendations(
  ageYears: number,
  ageMonths = 0,
  limit = 2,
): DashboardHubPick[] {
  const totalAgeMonths = ageYears * 12 + ageMonths;
  const band = getAgeBand(ageYears, ageMonths);
  const candidates = DASHBOARD_PICKS_BY_BAND[band] ?? ["daily-tips", "amy-ai"];
  const out: DashboardHubPick[] = [];
  for (const tileId of candidates) {
    if (!isKnownWebHubTile(tileId) && !TILE_DIRECT_ROUTES[tileId]) continue;
    if (!isTileAvailableForAge(tileId, totalAgeMonths)) continue;
    out.push({ tileId, href: hubTileHref(tileId) });
    if (out.length >= limit) break;
  }
  if (out.length === 0) {
    out.push({ tileId: "daily-tips", href: hubTileHref("daily-tips") });
    out.push({ tileId: "amy-ai", href: hubTileHref("amy-ai") });
  }
  return out.slice(0, limit);
}
