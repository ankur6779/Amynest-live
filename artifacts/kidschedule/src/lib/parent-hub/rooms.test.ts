import { describe, expect, it } from "vitest";
import {
  HUB_REMOVED_TILE_IDS,
  PARENT_HUB_ROOM_IDS,
  isHubTileRemovedFromRooms,
  roomForLegacyGroup,
  roomForTile,
  tileIdsForRoom,
} from "./rooms";

describe("parent-hub rooms map", () => {
  it("exposes exactly four rooms", () => {
    expect(PARENT_HUB_ROOM_IDS).toEqual(["help", "understand", "care", "moments"]);
  });

  it("maps Constitution keep/move tiles to rooms", () => {
    expect(roomForTile("amy-ai")).toBe("help");
    expect(roomForTile("speech-coach")).toBe("help");
    expect(roomForTile("birth-sky")).toBe("understand");
    expect(roomForTile("nutrition")).toBe("care");
    expect(roomForTile("infant-hub")).toBe("care");
    expect(roomForTile("story-hub")).toBe("moments");
    expect(roomForTile("talking-amy")).toBe("moments");
  });

  it("treats removed Hub chrome as non-rooms", () => {
    for (const id of HUB_REMOVED_TILE_IDS) {
      expect(isHubTileRemovedFromRooms(id)).toBe(true);
      expect(roomForTile(id)).toBeNull();
    }
  });

  it("maps legacy mall groups to rooms", () => {
    expect(roomForLegacyGroup("learning")).toBe("understand");
    expect(roomForLegacyGroup("health")).toBe("care");
    expect(roomForLegacyGroup("creativity")).toBe("moments");
    expect(roomForLegacyGroup("support")).toBe("help");
    expect(roomForLegacyGroup("care")).toBe("care");
  });

  it("filters visible tiles into a room without removed ids", () => {
    const visible = [
      "amy-ai",
      "emotional",
      "generate-routine",
      "nutrition",
      "story-hub",
      "gaming-rewards",
    ];
    expect(tileIdsForRoom("help", visible)).toEqual(["amy-ai", "emotional"]);
    expect(tileIdsForRoom("care", visible)).toEqual(["nutrition"]);
    expect(tileIdsForRoom("moments", visible)).toEqual(["story-hub"]);
  });
});
