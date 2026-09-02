import { describe, expect, it } from "vitest";
import {
  parseParentingHubDeepLink,
  parentingHubHashForRoom,
  parentingHubHashForTile,
  resolveRoomsDeepLinkHash,
  roomsHashAfterChildSwitch,
} from "./hub-activity-cross-link";
import { GROW_STREAM_TILE_ID } from "@/lib/grow/living-room";

describe("parseParentingHubDeepLink", () => {
  it("parses a simple tile hash", () => {
    expect(parseParentingHubDeepLink("tile-activities")).toEqual({
      group: "creativity",
      tileId: "activities",
    });
  });

  it("parses infant hub tile without section", () => {
    expect(parseParentingHubDeepLink("tile-infant-hub")).toEqual({
      group: "today",
      tileId: "infant-hub",
      sectionId: undefined,
    });
  });

  it("parses compound infant hub + section hash", () => {
    expect(parseParentingHubDeepLink("tile-infant-hub#infant-cry")).toEqual({
      group: "today",
      tileId: "infant-hub",
      sectionId: "infant-cry",
    });
  });

  it("parses direct infant section hash", () => {
    expect(parseParentingHubDeepLink("infant-sleep")).toEqual({
      group: "today",
      tileId: "infant-hub",
      sectionId: "infant-sleep",
    });
  });

  it("returns null for unknown hash", () => {
    expect(parseParentingHubDeepLink("unknown")).toBeNull();
  });

  it("opens Rooms V1 doors from home-nav hashes without new routes", () => {
    expect(parseParentingHubDeepLink("help")).toEqual({ group: "help", tileId: "" });
    expect(parseParentingHubDeepLink("understand")).toEqual({
      group: "understand",
      tileId: "",
    });
    expect(parseParentingHubDeepLink("care")).toEqual({ group: "care", tileId: "" });
    expect(parseParentingHubDeepLink("moments")).toEqual({
      group: "moments",
      tileId: "",
    });
  });

  it("builds canonical Rooms hashes", () => {
    expect(parentingHubHashForRoom("care")).toBe("#care");
    expect(parentingHubHashForTile("nutrition")).toBe("#tile-nutrition");
    expect(parseParentingHubDeepLink("tile-nutrition")).toEqual({
      group: "health",
      tileId: "nutrition",
    });
  });

  it("recovers unknown hashes without a blank-screen target", () => {
    expect(parseParentingHubDeepLink("nonexistent")).toBeNull();
    expect(parseParentingHubDeepLink("tile-invalid")).toEqual({
      group: "creativity",
      tileId: "invalid",
    });
  });

  it("keeps synthetic stream ids off the URL", () => {
    expect(
      resolveRoomsDeepLinkHash({ room: "understand", tileId: GROW_STREAM_TILE_ID }),
    ).toBe("#understand");
    expect(
      resolveRoomsDeepLinkHash({ room: "care", tileId: "nutrition" }),
    ).toBe("#tile-nutrition");
    expect(resolveRoomsDeepLinkHash({ room: null, tileId: null })).toBe("");
  });

  it("clears a module hash when the selected child changes", () => {
    expect(
      roomsHashAfterChildSwitch({
        activeRoom: "care",
        currentHash: "#tile-infant-hub",
      }),
    ).toBe("#care");
    expect(
      roomsHashAfterChildSwitch({
        activeRoom: "help",
        currentHash: "#help",
      }),
    ).toBeNull();
  });
});
