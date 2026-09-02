/**
 * P0-6 — Parent Hub room living (Help / Understand / Care).
 * Moments-law applied consistently: one recommend + quiet secondary paths.
 * Presentation / IA only. No engines, Pack 4.5/4.6 thresholds, or new flags.
 */
import type { ParentHubRoomId } from "@/lib/parent-hub/rooms";
import { recommendForRoom } from "@/lib/parent-hub/flow";
import { GUIDANCE_STREAM_TILE_ID } from "@/lib/guidance/living-room";
import { GROW_STREAM_TILE_ID } from "@/lib/grow/living-room";
import { ASK_AMY_STREAM_TILE_ID } from "@/lib/ask-amy/living-room";

export type RoomLivingPath = {
  /** Destination id (stable) */
  id: string;
  /** Legacy tile / stream id opened on select */
  tileId: string;
  title: string;
  purpose: string;
  /** Never lead the room */
  demoted?: boolean;
};

export type RoomLivingRecommend = {
  destinationId: string;
  tileId: string;
  label: string;
  title: string;
  purpose: string;
};

/** Rooms that use one-room living (Moments has its own stream). */
export const ROOM_LIVING_PEER_ROOMS = ["help", "understand", "care"] as const;
export type RoomLivingPeerRoom = (typeof ROOM_LIVING_PEER_ROOMS)[number];

export function isRoomLivingPeerRoom(
  room: ParentHubRoomId | null | undefined,
): room is RoomLivingPeerRoom {
  return (
    room === "help" || room === "understand" || room === "care"
  );
}

export function quietPathsForRoom(
  room: RoomLivingPeerRoom,
  opts: { isInfant: boolean },
): readonly RoomLivingPath[] {
  void opts;
  switch (room) {
    case "help":
      return [
        {
          id: "emotional",
          tileId: "emotional",
          title: "Feelings",
          purpose: "When the day feels heavy",
          demoted: true,
        },
        {
          id: "speech-coach",
          tileId: "speech-coach",
          title: "Speech",
          purpose: "Practice gently together",
        },
        {
          id: "ptm-prep",
          tileId: "ptm-prep",
          title: "School meeting",
          purpose: "Walk in prepared",
        },
        {
          id: "life-skills",
          tileId: "life-skills",
          title: "Life skills",
          purpose: "Teach one thing today",
        },
      ];
    case "understand":
      return [
        {
          id: "birth-sky",
          tileId: "birth-sky",
          title: "Birth Sky",
          purpose: "Soft meaning and identity",
          demoted: true,
        },
        {
          id: "curiosity",
          tileId: "answer-to-kids-how",
          title: "Curiosity",
          purpose: "How your child wonders",
          demoted: true,
        },
        {
          id: "grow",
          tileId: GROW_STREAM_TILE_ID,
          title: "Grow",
          purpose: "Skills growing quietly",
        },
      ];
    case "care":
      // Nutrition + Health are universal Care modules (Grow-style named paths).
      // Infant Care is the infant recommend only — never a broken quiet card
      // for older children (intentional exclusion: 0–24 months).
      return [
        {
          id: "nutrition",
          tileId: "nutrition",
          title: "Nutrition",
          purpose: "Meals for this body.",
        },
        {
          id: "health-lab",
          tileId: "health-lab",
          title: "Health",
          purpose: "Wellness to tend today.",
        },
      ];
  }
}

export function recommendPathForRoom(
  room: RoomLivingPeerRoom,
  opts: { isInfant: boolean; childName: string },
): RoomLivingRecommend {
  const base = recommendForRoom(room, { isInfant: opts.isInfant });
  switch (room) {
    case "help":
      return {
        destinationId: "ask-amy",
        tileId: ASK_AMY_STREAM_TILE_ID,
        label: base.labelFallback,
        title: `Ask Amy about ${opts.childName}`,
        purpose: "One calm question — start here",
      };
    case "understand":
      return {
        destinationId: "guidance",
        tileId: GUIDANCE_STREAM_TILE_ID,
        label: base.labelFallback,
        title: `Today's guidance for ${opts.childName}`,
        purpose: "One clearer sentence about your child",
      };
    case "care":
      return opts.isInfant
        ? {
            destinationId: "infant-care",
            tileId: "infant-hub",
            label: base.labelFallback,
            title: `Today's care for ${opts.childName}`,
            purpose: "Sleep, feed, comfort — what matters now",
          }
        : {
            destinationId: "nutrition",
            tileId: "nutrition",
            label: base.labelFallback,
            title: `Today's nutrition for ${opts.childName}`,
            purpose: "Meals for this body today",
          };
  }
}

export function roomLivingEyebrow(room: RoomLivingPeerRoom): string {
  switch (room) {
    case "help":
      return "Today's Help";
    case "understand":
      return "Today's Guidance";
    case "care":
      return "Today's Care";
  }
}

export function roomLivingTitle(
  room: RoomLivingPeerRoom,
  childName: string,
): string {
  switch (room) {
    case "help":
      return `I'm here with you and ${childName}.`;
    case "understand":
      return `See ${childName} a little more clearly.`;
    case "care":
      return `Take care of ${childName} today.`;
  }
}

export function roomLivingPurpose(room: RoomLivingPeerRoom): string {
  switch (room) {
    case "help":
      return "One companionship path — never a shelf of equal products.";
    case "understand":
      return "One clearer sentence first — never equal educational products.";
    case "care":
      return "One care path for now — never three equal care products.";
  }
}

export function roomLivingQuietLabel(room: RoomLivingPeerRoom): string {
  switch (room) {
    case "help":
      return "Quiet ways to get help";
    case "understand":
      return "Quiet ways to understand";
    case "care":
      return "Quiet ways to care";
  }
}

/** Map opened tile → destination id for exit / deepen bookkeeping. */
export function destinationIdForRoomLivingTile(
  room: RoomLivingPeerRoom,
  tileId: string,
  opts: { isInfant: boolean },
): string {
  const recommend = recommendPathForRoom(room, {
    isInfant: opts.isInfant,
    childName: "child",
  });
  if (tileId === recommend.tileId) return recommend.destinationId;
  const path = quietPathsForRoom(room, opts).find((p) => p.tileId === tileId);
  if (path) return path.id;
  if (tileId === "amy-ai" || tileId === ASK_AMY_STREAM_TILE_ID) return "ask-amy";
  if (tileId === "emotional") return "emotional";
  if (tileId === GUIDANCE_STREAM_TILE_ID) return "guidance";
  if (tileId === GROW_STREAM_TILE_ID) return "grow";
  return tileId;
}
