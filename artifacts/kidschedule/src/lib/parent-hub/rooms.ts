/**
 * Parent Hub four-room architecture (Constitution + Production Audit).
 * Pack 1–3: room membership. Merged destination doors live in destinations.ts.
 */

export const PARENT_HUB_ROOM_IDS = ["help", "understand", "care", "moments"] as const;

export type ParentHubRoomId = (typeof PARENT_HUB_ROOM_IDS)[number];

/** Tile ids removed from Hub IA when Rooms V1 is ON (products live elsewhere). */
export const HUB_REMOVED_TILE_IDS = new Set<string>([
  "generate-routine",
  "tomorrow-forecast",
  "command-center",
  "amy-quick-tutor",
]);

/**
 * Living owner for a removed Hub tile — never a silent no-op.
 * Generate Routine belongs to Today's plan, not Rooms.
 */
export const HUB_REMOVED_TILE_FALLBACKS: Record<string, string> = {
  "generate-routine": "/routines/generate",
  "tomorrow-forecast": "/routines",
  "command-center": "/dashboard",
  "amy-quick-tutor": "/amy-ai-tutor",
};

export function fallbackHrefForRemovedHubTile(tileId: string): string | null {
  return HUB_REMOVED_TILE_FALLBACKS[tileId] ?? null;
}

/**
 * Binding tile → room map (Production Audit).
 * Temporary peer tiles under rooms are OK in Pack 1; Pack 3 merges lists.
 */
export const TILE_TO_ROOM: Record<string, ParentHubRoomId> = {
  // Help
  "amy-ai": "help",
  emotional: "help",
  "speech-coach": "help",
  "ptm-prep": "help",
  "life-skills": "help",

  // Understand
  "daily-tips": "understand",
  "new-parent-tips": "understand",
  articles: "understand",
  "answer-to-kids-how": "understand",
  "birth-sky": "understand",
  "smart-math-tricks": "understand",
  abacus: "understand",
  phonics: "understand",
  "spelling-mastery": "understand",
  "smart-study": "understand",
  olympiad: "understand",

  // Care
  "infant-hub": "care",
  nutrition: "care",
  "health-lab": "care",

  // Moments
  activities: "moments",
  "origami-studio": "moments",
  "art-craft": "moments",
  worksheets: "moments",
  "coloring-books": "moments",
  "fun-sheets": "moments",
  "story-hub": "moments",
  "talking-amy": "moments",
  "discovery-worlds": "moments",
  "event-prep": "moments",
  "gaming-rewards": "moments",
};

/** Legacy mall group → room (deep-link / navigate fallback when tile unknown). */
export const LEGACY_GROUP_TO_ROOM: Record<string, ParentHubRoomId> = {
  today: "help",
  support: "help",
  learning: "understand",
  amyAstro: "understand",
  health: "care",
  creativity: "moments",
  stories: "moments",
  parent: "moments",
};

export function isHubTileRemovedFromRooms(tileId: string): boolean {
  return HUB_REMOVED_TILE_IDS.has(tileId);
}

export function roomForTile(tileId: string | undefined | null): ParentHubRoomId | null {
  if (!tileId) return null;
  if (isHubTileRemovedFromRooms(tileId)) return null;
  return TILE_TO_ROOM[tileId] ?? null;
}

export function roomForLegacyGroup(group: string | undefined | null): ParentHubRoomId | null {
  if (!group) return null;
  if ((PARENT_HUB_ROOM_IDS as readonly string[]).includes(group)) {
    return group as ParentHubRoomId;
  }
  return LEGACY_GROUP_TO_ROOM[group] ?? null;
}

/** Ordered tile ids for a room from a visible section id list. */
export function tileIdsForRoom(
  room: ParentHubRoomId,
  visibleTileIds: readonly string[],
): string[] {
  const allowed = new Set(
    Object.entries(TILE_TO_ROOM)
      .filter(([, r]) => r === room)
      .map(([id]) => id),
  );
  return visibleTileIds.filter((id) => allowed.has(id) && !isHubTileRemovedFromRooms(id));
}
