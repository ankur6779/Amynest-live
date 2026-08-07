import { describe, expect, it } from "vitest";
import {
  isRecommendedDestination,
  orderDestinationsForFlow,
  recommendForRoom,
} from "./flow";
import type { ResolvedDestination } from "./destinations";

function dest(id: string): ResolvedDestination {
  return {
    id,
    room: "help",
    kind: "single",
    tileIds: [id],
    titleKey: id,
    titleFallback: id,
    purposeKey: id,
    purposeFallback: id,
    visibleTileIds: [id],
  };
}

describe("Pack 4 living flow", () => {
  it("recommends exactly one destination per room", () => {
    expect(recommendForRoom("help", { isInfant: false }).destinationId).toBe(
      "ask-amy",
    );
    expect(recommendForRoom("understand", { isInfant: false }).destinationId).toBe(
      "guidance",
    );
    expect(recommendForRoom("care", { isInfant: true }).destinationId).toBe(
      "infant-care",
    );
    expect(recommendForRoom("care", { isInfant: false }).destinationId).toBe(
      "nutrition",
    );
    expect(recommendForRoom("moments", { isInfant: false }).destinationId).toBe(
      "presence",
    );
  });

  it("orders recommended path first", () => {
    const ordered = orderDestinationsForFlow(
      [dest("speech-coach"), dest("ask-amy"), dest("emotional")],
      "ask-amy",
    );
    expect(ordered.map((d) => d.id)).toEqual([
      "ask-amy",
      "speech-coach",
      "emotional",
    ]);
  });

  it("identifies the single recommendation", () => {
    expect(isRecommendedDestination("guidance", "guidance")).toBe(true);
    expect(isRecommendedDestination("grow", "guidance")).toBe(false);
  });
});
