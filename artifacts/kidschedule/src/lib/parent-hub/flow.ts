/**
 * Pack 4 — Living flow: one recommendation + exit back to life.
 * No new products. Presentation / navigation only.
 */
import type { ParentHubRoomId } from "@/lib/parent-hub/rooms";
import type { ResolvedDestination } from "@/lib/parent-hub/destinations";

export type RoomRecommendation = {
  destinationId: string;
  labelKey: string;
  labelFallback: string;
};

export type FlowContext = {
  isInfant: boolean;
};

/**
 * Exactly ONE contextual recommendation per room.
 * Help defaults to Ask Amy (Emotional remains secondary — no equal crisis split).
 * Care: Infant Care for 0–24m, else Nutrition.
 */
export function recommendForRoom(
  room: ParentHubRoomId,
  ctx: FlowContext,
): RoomRecommendation {
  switch (room) {
    case "help":
      return {
        destinationId: "ask-amy",
        labelKey: "parent_hub.flow.recommend.help",
        labelFallback: "Start here",
      };
    case "understand":
      return {
        destinationId: "guidance",
        labelKey: "parent_hub.flow.recommend.understand",
        labelFallback: "Today's guidance",
      };
    case "care":
      return ctx.isInfant
        ? {
            destinationId: "infant-care",
            labelKey: "parent_hub.flow.recommend.care",
            labelFallback: "Today's care",
          }
        : {
            destinationId: "nutrition",
            labelKey: "parent_hub.flow.recommend.care",
            labelFallback: "Today's care",
          };
    case "moments":
      return {
        destinationId: "presence",
        labelKey: "parent_hub.flow.recommend.moments",
        labelFallback: "Try this together",
      };
  }
}

/** Put the recommended destination first; leave others as secondary quiet paths. */
export function orderDestinationsForFlow(
  destinations: readonly ResolvedDestination[],
  recommendedId: string,
): ResolvedDestination[] {
  const recommended = destinations.find((d) => d.id === recommendedId);
  const rest = destinations.filter((d) => d.id !== recommendedId);
  return recommended ? [recommended, ...rest] : [...destinations];
}

export function isRecommendedDestination(
  destinationId: string,
  recommendedId: string,
): boolean {
  return destinationId === recommendedId;
}
