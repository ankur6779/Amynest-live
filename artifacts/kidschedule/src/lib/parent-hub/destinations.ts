/**
 * Pack 3 — Destination manufacturing.
 * Merged quiet paths per Constitution / Production Audit.
 * No new product modules — IA doors over existing tile ids only.
 */
import type { ParentHubRoomId } from "@/lib/parent-hub/rooms";
import { isHubTileRemovedFromRooms, TILE_TO_ROOM } from "@/lib/parent-hub/rooms";

export type DestinationKind = "single" | "merge";

export type RoomDestinationDef = {
  /** Stable Hub IA id (not necessarily a legacy tile id) */
  id: string;
  room: ParentHubRoomId;
  kind: DestinationKind;
  /** Legacy tile ids reused under this door */
  tileIds: readonly string[];
  titleKey: string;
  titleFallback: string;
  /** Answers the room's one sentence — Apple test without photography */
  purposeKey: string;
  purposeFallback: string;
};

/** Room intention — Destination Law */
export const ROOM_INTENTION: Record<
  ParentHubRoomId,
  { key: string; fallback: string }
> = {
  help: {
    key: "parent_hub.rooms.help.intention",
    fallback: "What can help me right now?",
  },
  understand: {
    key: "parent_hub.rooms.understand.intention",
    fallback: "What can help me understand my child?",
  },
  care: {
    key: "parent_hub.rooms.care.intention",
    fallback: "What should I care for today?",
  },
  moments: {
    key: "parent_hub.rooms.moments.intention",
    fallback: "What beautiful moment can we share?",
  },
};

/**
 * Canonical Pack 3 destinations per room (ordered).
 * Merges collapse duplicate entry points; singles stay distinct.
 */
export const ROOM_DESTINATIONS: Record<ParentHubRoomId, readonly RoomDestinationDef[]> = {
  help: [
    {
      id: "ask-amy",
      room: "help",
      kind: "single",
      tileIds: ["amy-ai"],
      titleKey: "parent_hub.destinations.ask_amy.title",
      titleFallback: "Ask Amy",
      purposeKey: "parent_hub.destinations.ask_amy.purpose",
      purposeFallback: "Ask one calm question now",
    },
    {
      id: "emotional",
      room: "help",
      kind: "single",
      tileIds: ["emotional"],
      titleKey: "parent_hub.destinations.emotional.title",
      titleFallback: "Emotional Support",
      purposeKey: "parent_hub.destinations.emotional.purpose",
      purposeFallback: "When feelings are heavy",
    },
    {
      id: "speech-coach",
      room: "help",
      kind: "single",
      tileIds: ["speech-coach"],
      titleKey: "parent_hub.destinations.speech.title",
      titleFallback: "Speech Coach",
      purposeKey: "parent_hub.destinations.speech.purpose",
      purposeFallback: "Practice without pressure",
    },
    {
      id: "ptm-prep",
      room: "help",
      kind: "single",
      tileIds: ["ptm-prep"],
      titleKey: "parent_hub.destinations.ptm.title",
      titleFallback: "PTM Prep",
      purposeKey: "parent_hub.destinations.ptm.purpose",
      purposeFallback: "Walk into the meeting prepared",
    },
    {
      id: "life-skills",
      room: "help",
      kind: "single",
      tileIds: ["life-skills"],
      titleKey: "parent_hub.destinations.life_skills.title",
      titleFallback: "Life Skills",
      purposeKey: "parent_hub.destinations.life_skills.purpose",
      purposeFallback: "Help me teach this today",
    },
  ],
  understand: [
    {
      id: "guidance",
      room: "understand",
      kind: "merge",
      tileIds: ["daily-tips", "new-parent-tips", "articles"],
      titleKey: "parent_hub.destinations.guidance.title",
      titleFallback: "Guidance",
      purposeKey: "parent_hub.destinations.guidance.purpose",
      purposeFallback: "One clearer sentence about your child",
    },
    {
      id: "birth-sky",
      room: "understand",
      kind: "single",
      tileIds: ["birth-sky"],
      titleKey: "parent_hub.destinations.birth_sky.title",
      titleFallback: "Birth Sky",
      purposeKey: "parent_hub.destinations.birth_sky.purpose",
      purposeFallback: "Meaning and soft identity",
    },
    {
      id: "curiosity",
      room: "understand",
      kind: "single",
      tileIds: ["answer-to-kids-how"],
      titleKey: "parent_hub.destinations.curiosity.title",
      titleFallback: "Curiosity",
      purposeKey: "parent_hub.destinations.curiosity.purpose",
      purposeFallback: "How your child thinks",
    },
    {
      id: "grow",
      room: "understand",
      kind: "merge",
      tileIds: [
        "smart-math-tricks",
        "abacus",
        "phonics",
        "spelling-mastery",
        "smart-study",
        "olympiad",
      ],
      titleKey: "parent_hub.destinations.grow.title",
      titleFallback: "Grow",
      purposeKey: "parent_hub.destinations.grow.purpose",
      purposeFallback: "Skills growing quietly",
    },
  ],
  care: [
    {
      id: "infant-care",
      room: "care",
      kind: "single",
      tileIds: ["infant-hub"],
      titleKey: "parent_hub.destinations.infant_care.title",
      titleFallback: "Infant Care",
      purposeKey: "parent_hub.destinations.infant_care.purpose",
      purposeFallback: "Sleep, feed, cry, growth — today",
    },
    {
      id: "nutrition",
      room: "care",
      kind: "single",
      tileIds: ["nutrition"],
      titleKey: "parent_hub.destinations.nutrition.title",
      titleFallback: "Nutrition",
      purposeKey: "parent_hub.destinations.nutrition.purpose",
      purposeFallback: "Meals for this body today",
    },
    {
      id: "health-lab",
      room: "care",
      kind: "single",
      tileIds: ["health-lab"],
      titleKey: "parent_hub.destinations.health_lab.title",
      titleFallback: "Health Lab",
      purposeKey: "parent_hub.destinations.health_lab.purpose",
      purposeFallback: "Wellness to tend today",
    },
  ],
  moments: [
    {
      id: "presence",
      room: "moments",
      kind: "merge",
      tileIds: ["activities", "origami-studio", "art-craft"],
      titleKey: "parent_hub.destinations.presence.title",
      titleFallback: "Presence",
      purposeKey: "parent_hub.destinations.presence.purpose",
      purposeFallback: "Ten minutes together",
    },
    {
      id: "story",
      room: "moments",
      kind: "single",
      tileIds: ["story-hub"],
      titleKey: "parent_hub.destinations.story.title",
      titleFallback: "Story",
      purposeKey: "parent_hub.destinations.story.purpose",
      purposeFallback: "One shared story",
    },
    {
      id: "make",
      room: "moments",
      kind: "merge",
      tileIds: ["worksheets", "coloring-books", "fun-sheets"],
      titleKey: "parent_hub.destinations.make.title",
      titleFallback: "Make",
      purposeKey: "parent_hub.destinations.make.purpose",
      purposeFallback: "Make something side by side",
    },
    {
      id: "talking-amy",
      room: "moments",
      kind: "single",
      tileIds: ["talking-amy"],
      titleKey: "parent_hub.destinations.talking_amy.title",
      titleFallback: "Talking Amy",
      purposeKey: "parent_hub.destinations.talking_amy.purpose",
      purposeFallback: "A gentle voice together",
    },
    {
      id: "discovery-worlds",
      room: "moments",
      kind: "single",
      tileIds: ["discovery-worlds"],
      titleKey: "parent_hub.destinations.discovery.title",
      titleFallback: "Discovery Worlds",
      purposeKey: "parent_hub.destinations.discovery.purpose",
      purposeFallback: "Explore one world together",
    },
    {
      id: "event-prep",
      room: "moments",
      kind: "single",
      tileIds: ["event-prep"],
      titleKey: "parent_hub.destinations.event_prep.title",
      titleFallback: "Event Prep",
      purposeKey: "parent_hub.destinations.event_prep.purpose",
      purposeFallback: "Prepare a shared occasion",
    },
  ],
};

/** Map any legacy tile → Pack 3 destination id (for deep links). */
export function destinationIdForTile(tileId: string): string | null {
  for (const room of Object.keys(ROOM_DESTINATIONS) as ParentHubRoomId[]) {
    for (const dest of ROOM_DESTINATIONS[room]) {
      if (dest.tileIds.includes(tileId)) return dest.id;
    }
  }
  return null;
}

export type ResolvedDestination = RoomDestinationDef & {
  /** Visible member tiles (intersection with Hub visibility) */
  visibleTileIds: string[];
};

/** Destinations for a room that have at least one visible underlying tile. */
export function destinationsForRoom(
  room: ParentHubRoomId,
  visibleTileIds: readonly string[],
): ResolvedDestination[] {
  const visible = new Set(
    visibleTileIds.filter((id) => !isHubTileRemovedFromRooms(id) && TILE_TO_ROOM[id] === room),
  );
  return ROOM_DESTINATIONS[room]
    .map((dest) => ({
      ...dest,
      visibleTileIds: dest.tileIds.filter((id) => visible.has(id)),
    }))
    .filter((dest) => dest.visibleTileIds.length > 0);
}
