/**
 * Rooms eligibility — canonical product model (not ad-hoc UI filters).
 *
 * Universal rooms (always): Help · Understand · Care · Moments
 *
 * Universal modules (never disappear when the child changes, within module age):
 *   Ask Amy, Guidance, Nutrition, Health (preview <24m; hidden at 13+), Moments presence/story
 *
 * Age-adapted (same module, different content / recommendation):
 *   Nutrition meals, Grow practice recommend, Care primary spine
 *
 * Age-restricted (intentional exclusion — documented, not silent):
 *   Infant Care — 0–24 months only
 *   Health Lab — under 13 years (156 months); preview-only under 24 months
 *   PTM / school meeting — month gate (typically 36+)
 *   Grow challenge (Olympiad) — 72+ months
 *
 * Grow core paths stay visible for every child. When the child is younger
 * than the content floor, the path is disabled with an explanation rather
 * than removed from the room.
 */

import { getAgeBand } from "@/lib/age-bands";
import {
  HEALTH_LAB_MAX_AGE_MONTHS,
  isHubSectionVisible,
  type HubSectionVisibilityInput,
} from "@/lib/hub-visibility";
import type { RoomLivingPath, RoomLivingPeerRoom } from "@/lib/parent-hub/room-living";
import { quietPathsForRoom } from "@/lib/parent-hub/room-living";
import { ASK_AMY_STREAM_TILE_ID } from "@/lib/ask-amy/living-room";
import { GUIDANCE_STREAM_TILE_ID } from "@/lib/guidance/living-room";
import { GROW_STREAM_TILE_ID } from "@/lib/grow/living-room";

/** Care living-room infant threshold — matches hub infant-hub visibility. */
export const INFANT_CARE_MAX_AGE_MONTHS = 24;

export const UNIVERSAL_ROOM_MODULE_TILE_IDS = [
  "amy-ai",
  "emotional",
  "daily-tips",
  "articles",
  "nutrition",
  "health-lab",
  "activities",
  "story-hub",
] as const;

export const ROOM_LIVING_STREAM_TILE_IDS = new Set<string>([
  ASK_AMY_STREAM_TILE_ID,
  GUIDANCE_STREAM_TILE_ID,
  GROW_STREAM_TILE_ID,
]);

export function isInfantCareAge(ageMonths: number): boolean {
  return ageMonths < INFANT_CARE_MAX_AGE_MONTHS;
}

/** Nutrition is a Care module for every supported child — content adapts by age. */
export function isNutritionModuleEligible(_ageMonths: number): boolean {
  return true;
}

/**
 * Health is a Care module through age 12.
 * Under 24 months the Care page still shows Health — /health-lab is preview-only.
 * At 13+ the games are not available, so Care must not advertise a dead path.
 */
export function isHealthModuleEligible(ageMonths: number): boolean {
  return Number.isFinite(ageMonths) && ageMonths < HEALTH_LAB_MAX_AGE_MONTHS;
}

export function isSyntheticRoomTileId(tileId: string | null | undefined): boolean {
  if (!tileId) return false;
  return ROOM_LIVING_STREAM_TILE_IDS.has(tileId) || tileId.startsWith("__");
}

export function isUrlSafeRoomTileId(tileId: string | null | undefined): tileId is string {
  return Boolean(tileId) && !isSyntheticRoomTileId(tileId);
}

/**
 * Quiet paths shown for this child.
 * Infant Care is excluded for 24+ months (intentional — not a broken card).
 * Nutrition always remains for Care. Health remains through age 12 (preview <24m).
 */
export function resolveQuietPathsForRoom(
  room: RoomLivingPeerRoom,
  opts: {
    isInfant: boolean;
    visibleTileIds?: readonly string[];
    /** When set, Health is omitted at 13+ so Care never shows a launch that empties. */
    ageMonths?: number;
  },
): RoomLivingPath[] {
  const catalog = quietPathsForRoom(room, { isInfant: opts.isInfant });
  const visible = opts.visibleTileIds ? new Set(opts.visibleTileIds) : null;

  return catalog.filter((path) => {
    if (path.tileId === "infant-hub" && !opts.isInfant) return false;
    if (
      path.tileId === "health-lab" &&
      opts.ageMonths != null &&
      !isHealthModuleEligible(opts.ageMonths)
    ) {
      return false;
    }
    if (ROOM_LIVING_STREAM_TILE_IDS.has(path.tileId)) return true;
    if (!visible) return true;
    return visible.has(path.tileId);
  });
}

export function isCareNutritionVisible(opts: { isInfant: boolean }): boolean {
  void opts;
  return true;
}

/**
 * Help quiet-path Hub specs — must stay aligned with parenting-hub section
 * `alwaysCurrent` / `bands` so Rooms never shows a tile Hub would hide.
 */
export const HELP_ROOM_HUB_SECTIONS: readonly HubSectionVisibilityInput[] = [
  { id: "amy-ai", alwaysCurrent: true },
  { id: "emotional", alwaysCurrent: true },
  { id: "speech-coach", bands: ["0-2", "2-4", "4-6", "6-8"] },
  { id: "ptm-prep", bands: ["4-6", "6-8", "8-10", "10-12", "12-15"] },
  { id: "life-skills", bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"] },
];

export function ageBandFromTotalMonths(ageMonths: number) {
  const safe = Number.isFinite(ageMonths) ? Math.max(0, ageMonths) : 0;
  return getAgeBand(Math.floor(safe / 12), safe % 12);
}

/** Hub-visible Help tiles for this age — Rooms intersects this set. */
export function visibleHelpTileIdsForAge(ageMonths: number): string[] {
  const band = ageBandFromTotalMonths(ageMonths);
  return HELP_ROOM_HUB_SECTIONS.filter((section) =>
    isHubSectionVisible(section, band, ageMonths),
  ).map((section) => section.id);
}
