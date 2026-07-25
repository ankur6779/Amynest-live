/** Deep links from routines → Parent Hub activity tiles. */

export type HubDeepLinkTarget = {
  group: "creativity" | "learning" | "stories" | "health" | "support" | "today" | "parent";
  tileId: string;
  /** Infant Hub subsection id (e.g. infant-cry) when deep-linking into a module. */
  sectionId?: string;
};

/** Dispatched after Parent Hub scrolls to Infant Hub so the target module opens. */
export const INFANT_HUB_OPEN_SECTION_EVENT = "infant-hub:open-section";

const TILE_NAV: Record<string, HubDeepLinkTarget> = {
  "infant-hub": { group: "today", tileId: "infant-hub" },
  activities: { group: "creativity", tileId: "activities" },
  "gaming-rewards": { group: "parent", tileId: "gaming-rewards" },
  worksheets: { group: "creativity", tileId: "worksheets" },
  "art-craft": { group: "creativity", tileId: "art-craft" },
  "fun-sheets": { group: "creativity", tileId: "fun-sheets" },
  "coloring-books": { group: "creativity", tileId: "coloring-books" },
  "daily-puzzle": { group: "creativity", tileId: "activities" },
  "daily-story": { group: "creativity", tileId: "activities" },
  phonics: { group: "learning", tileId: "phonics" },
  "event-prep": { group: "creativity", tileId: "event-prep" },
  "story-hub": { group: "stories", tileId: "story-hub" },
  nutrition: { group: "health", tileId: "nutrition" },
  "health-lab": { group: "health", tileId: "health-lab" },
  "birth-sky": { group: "support", tileId: "birth-sky" },
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

/** Deep link into Infant Hub with a specific module section expanded. */
export function buildInfantHubSectionDeepLink(sectionId: string): string {
  return `/parenting-hub#tile-infant-hub#${sectionId}`;
}

/** Map routine-intelligence module ids → in-app routes (optional enrichment layer). */
const LINKED_MODULE_ROUTES: Record<string, string> = {
  parent_focus_guide: "/parenting-hub#tile-activities",
  amy_coach_study_tips: "/amy-coach",
  benefits_of_play: "/parenting-hub#tile-activities",
  activity_ideas: "/parenting-hub#tile-activities",
  family_bonding_ideas: "/parenting-hub#tile-activities",
  phonics_audio: "/parenting-hub#tile-phonics",
  story_audio: "/parenting-hub#tile-story-hub",
};

export function resolveLinkedModuleHref(moduleId: string): string {
  return LINKED_MODULE_ROUTES[moduleId] ?? buildParentingHubDeepLink();
}

export function primaryLinkedModuleHref(modules?: readonly string[] | null): string | null {
  if (!modules?.length) return null;
  return resolveLinkedModuleHref(modules[0]!);
}

function resolveInfantSectionId(raw: string): string | undefined {
  if (raw.startsWith("infant-")) return raw;
  const nested = raw.split("#").find((part) => part.startsWith("infant-"));
  return nested;
}

export function parseParentingHubDeepLink(rawHash?: string): HubDeepLinkTarget | null {
  const raw = (rawHash ?? (typeof window !== "undefined" ? window.location.hash : "")).replace(
    /^#/,
    "",
  );
  if (!raw) return null;

  const sectionId = resolveInfantSectionId(raw);

  // Direct section hash while already on Parent Hub (e.g. #infant-cry).
  if (raw.startsWith("infant-")) {
    return { group: "today", tileId: "infant-hub", sectionId: raw };
  }

  const [tilePart] = raw.split("#");
  const m = tilePart.match(/^tile-([a-z0-9-]+)$/);
  if (!m) return null;
  const tileId = m[1]!;
  if (tileId === "infant-hub") {
    return { group: "today", tileId: "infant-hub", sectionId };
  }
  return TILE_NAV[tileId] ?? { group: "creativity", tileId };
}

export function applyParentingHubDeepLink(
  navigate: (group: string, tileId?: string, sectionId?: string) => void,
): boolean {
  const target = parseParentingHubDeepLink();
  if (!target) return false;
  navigate(target.group, target.tileId, target.sectionId);
  return true;
}

export function dispatchInfantHubOpenSection(sectionId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(INFANT_HUB_OPEN_SECTION_EVENT, { detail: { sectionId } }),
  );
}
