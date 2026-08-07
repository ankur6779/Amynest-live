/**
 * Pack 2 — cinematic room heroes.
 * Reuses Welcome / Discovery / Today Home FE photography only.
 * No new illustration system.
 */
import type { ParentHubRoomId } from "@/lib/parent-hub/rooms";

export type RoomHeroShot =
  | "arrival"
  | "relationship"
  | "detail"
  | "transition"
  | "reflection";

export type RoomHeroSpec = {
  roomId: ParentHubRoomId;
  shot: RoomHeroShot;
  src: string;
  /** Accessible description of the photograph */
  alt: string;
  /** One emotional sentence — the room's feeling */
  feelingKey: string;
  feelingFallback: string;
  titleKey: string;
  titleFallback: string;
};

export const ROOM_HEROES: Record<ParentHubRoomId, RoomHeroSpec> = {
  help: {
    roomId: "help",
    shot: "relationship",
    src: "/experience/r1/shot-02-relationship.png",
    alt: "Quiet parent presence beside a child",
    feelingKey: "parent_hub.rooms.help.feeling",
    feelingFallback: "You are not alone.",
    titleKey: "parent_hub.rooms.help.title",
    titleFallback: "Help",
  },
  understand: {
    roomId: "understand",
    shot: "reflection",
    src: "/experience/r1/shot-05-reflection.png",
    alt: "Soft light on a reading table — noticing the child",
    feelingKey: "parent_hub.rooms.understand.feeling",
    feelingFallback: "See your child more clearly.",
    titleKey: "parent_hub.rooms.understand.title",
    titleFallback: "Understand",
  },
  care: {
    roomId: "care",
    shot: "arrival",
    src: "/experience/r1/shot-01-arrival.png",
    alt: "Morning light in a calm home — care for today",
    feelingKey: "parent_hub.rooms.care.feeling",
    feelingFallback: "Take care of today.",
    titleKey: "parent_hub.rooms.care.title",
    titleFallback: "Care",
  },
  moments: {
    roomId: "moments",
    shot: "transition",
    src: "/experience/r1/shot-04-transition.png",
    alt: "A quiet path toward time together",
    feelingKey: "parent_hub.rooms.moments.feeling",
    feelingFallback: "Spend one meaningful moment.",
    titleKey: "parent_hub.rooms.moments.title",
    titleFallback: "Moments",
  },
};

export function heroForRoom(roomId: ParentHubRoomId): RoomHeroSpec {
  return ROOM_HEROES[roomId];
}
