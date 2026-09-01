import { describe, expect, it } from "vitest";
import {
  parseParentingHubDeepLink,
  parentingHubHashForRoom,
  parentingHubHashForTile,
} from "./hub-activity-cross-link";

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
});
