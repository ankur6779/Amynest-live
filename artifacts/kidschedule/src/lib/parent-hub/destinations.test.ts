import { describe, expect, it } from "vitest";
import {
  ROOM_DESTINATIONS,
  ROOM_INTENTION,
  destinationIdForTile,
  destinationsForRoom,
} from "./destinations";
import { PARENT_HUB_ROOM_IDS } from "./rooms";

describe("Pack 3 destinations", () => {
  it("defines an intention sentence for every room", () => {
    for (const room of PARENT_HUB_ROOM_IDS) {
      expect(ROOM_INTENTION[room].fallback.endsWith("?")).toBe(true);
    }
  });

  it("merges Constitution groups into single doors", () => {
    const understand = ROOM_DESTINATIONS.understand;
    const guidance = understand.find((d) => d.id === "guidance");
    const grow = understand.find((d) => d.id === "grow");
    expect(guidance?.tileIds).toEqual(
      expect.arrayContaining(["daily-tips", "articles", "new-parent-tips"]),
    );
    expect(grow?.tileIds).toEqual(
      expect.arrayContaining([
        "smart-math-tricks",
        "phonics",
        "olympiad",
        "abacus",
        "spelling-mastery",
        "smart-study",
      ]),
    );

    const moments = ROOM_DESTINATIONS.moments;
    expect(moments.find((d) => d.id === "presence")?.tileIds).toEqual(
      expect.arrayContaining(["activities", "origami-studio", "art-craft"]),
    );
    expect(moments.find((d) => d.id === "make")?.tileIds).toEqual(
      expect.arrayContaining(["worksheets", "coloring-books", "fun-sheets"]),
    );
  });

  it("does not expose duplicate peer tips or six learning heroes at room root", () => {
    const rootIds = ROOM_DESTINATIONS.understand.map((d) => d.id);
    expect(rootIds).toEqual(["guidance", "birth-sky", "curiosity", "grow"]);
    expect(rootIds).not.toContain("daily-tips");
    expect(rootIds).not.toContain("phonics");
  });

  it("resolves visible destinations only", () => {
    const dests = destinationsForRoom("help", ["amy-ai", "emotional", "generate-routine"]);
    expect(dests.map((d) => d.id)).toEqual(["ask-amy", "emotional"]);
  });

  it("maps legacy tiles to merge doors for deep links", () => {
    expect(destinationIdForTile("daily-tips")).toBe("guidance");
    expect(destinationIdForTile("phonics")).toBe("grow");
    expect(destinationIdForTile("worksheets")).toBe("make");
    expect(destinationIdForTile("activities")).toBe("presence");
    expect(destinationIdForTile("amy-ai")).toBe("ask-amy");
  });

  it("Apple test — tired parent can read destination names without photography", () => {
    const names = PARENT_HUB_ROOM_IDS.flatMap((room) =>
      ROOM_DESTINATIONS[room].map((d) => d.titleFallback),
    );
    for (const name of [
      "Ask Amy",
      "Guidance",
      "Grow",
      "Presence",
      "Make",
      "Infant Care",
      "Story",
    ]) {
      expect(names).toContain(name);
    }
    // No product-mall residue as primary names
    expect(names).not.toContain("Smart Math Tricks");
    expect(names).not.toContain("Daily Tips");
  });
});
