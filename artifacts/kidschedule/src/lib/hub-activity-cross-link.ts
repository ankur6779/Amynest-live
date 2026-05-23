/** Deep links from routines → Parent Hub activity tiles. */

export type HubDeepLinkTarget = {
  group: "creativity" | "learning" | "stories";
  tileId: string;
};

const TILE_NAV: Record<string, HubDeepLinkTarget> = {
  activities: { group: "creativity", tileId: "activities" },
  worksheets: { group: "creativity", tileId: "worksheets" },
  "art-craft": { group: "creativity", tileId: "art-craft" },
  "fun-sheets": { group: "creativity", tileId: "fun-sheets" },
  "coloring-books": { group: "creativity", tileId: "coloring-books" },
  "daily-puzzle": { group: "creativity", tileId: "activities" },
  "daily-story": { group: "creativity", tileId: "activities" },
  phonics: { group: "learning", tileId: "phonics" },
  "story-hub": { group: "stories", tileId: "story-hub" },
};

const PLAY_CATEGORIES = new Set([
  "play",
  "creative",
  "bonding",
  "study",
  "outdoor",
]);

const PLAY_ACTIVITY_RE =
  /\b(play|craft|origami|puzzle|story|game|activity|creative|paint|draw|fold|fun|explore|bonding|worksheet|learning block|sensory)\b/i;

export function isHubPlayActivity(category: string, activity: string): boolean {
  const cat = (category ?? "").toLowerCase().trim();
  if (PLAY_CATEGORIES.has(cat)) return true;
  return PLAY_ACTIVITY_RE.test(activity ?? "");
}

export function suggestHubTileForRoutineItem(
  category: string,
  activity: string,
): HubDeepLinkTarget {
  const text = `${category} ${activity}`.toLowerCase();
  if (/\b(worksheet|tracing|print|coloring page)\b/.test(text)) {
    return TILE_NAV.worksheets!;
  }
  if (/\b(craft|art|paint|draw|video)\b/.test(text)) {
    return TILE_NAV["art-craft"]!;
  }
  if (/\b(puzzle|brain|quiz)\b/.test(text)) {
    return TILE_NAV.activities!;
  }
  if (/\b(story|read|bedtime tale)\b/.test(text)) {
    return TILE_NAV["story-hub"]!;
  }
  if (/\b(phonics|letter|sound|read)\b/.test(text)) {
    return TILE_NAV.phonics!;
  }
  return TILE_NAV.activities!;
}

export function buildParentingHubDeepLink(tileId = "activities"): string {
  return `/parenting-hub#tile-${tileId}`;
}

export function parseParentingHubDeepLink(): HubDeepLinkTarget | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  const m = raw.match(/^tile-([a-z0-9-]+)$/);
  if (!m) return null;
  const tileId = m[1]!;
  return TILE_NAV[tileId] ?? { group: "creativity", tileId };
}

export function applyParentingHubDeepLink(
  navigate: (group: string, tileId?: string) => void,
): boolean {
  const target = parseParentingHubDeepLink();
  if (!target) return false;
  navigate(target.group, target.tileId);
  return true;
}
