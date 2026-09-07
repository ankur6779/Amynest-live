import { describe, expect, it } from "vitest";
import {
  destinationIdForRoomLivingTile,
  isRoomLivingPeerRoom,
  quietPathsForRoom,
  recommendPathForRoom,
  roomLivingPurpose,
} from "./room-living";
import { ASK_AMY_STREAM_TILE_ID } from "@/lib/ask-amy/living-room";
import { GUIDANCE_STREAM_TILE_ID } from "@/lib/guidance/living-room";

describe("P0-6 room living (Moments law for Help/Understand/Care)", () => {
  it("identifies peer rooms that need one-room living", () => {
    expect(isRoomLivingPeerRoom("help")).toBe(true);
    expect(isRoomLivingPeerRoom("understand")).toBe(true);
    expect(isRoomLivingPeerRoom("care")).toBe(true);
    expect(isRoomLivingPeerRoom("moments")).toBe(false);
  });

  it("Help recommends Ask Amy companionship spine", () => {
    const r = recommendPathForRoom("help", { isInfant: false, childName: "Arla" });
    expect(r.destinationId).toBe("ask-amy");
    expect(r.tileId).toBe(ASK_AMY_STREAM_TILE_ID);
    expect(r.label).toBe("Start here");
    expect(r.title.toLowerCase()).toContain("ask amy");
  });

  it("Understand recommends Today's guidance", () => {
    const r = recommendPathForRoom("understand", {
      isInfant: false,
      childName: "Arla",
    });
    expect(r.destinationId).toBe("guidance");
    expect(r.tileId).toBe(GUIDANCE_STREAM_TILE_ID);
    expect(r.label).toBe("Today's guidance");
  });

  it("Care recommends Infant Care for infants and Nutrition otherwise", () => {
    expect(
      recommendPathForRoom("care", { isInfant: true, childName: "Arla" })
        .destinationId,
    ).toBe("infant-care");
    expect(
      recommendPathForRoom("care", { isInfant: false, childName: "Arla" })
        .destinationId,
    ).toBe("nutrition");
    expect(
      recommendPathForRoom("care", { isInfant: false, childName: "Arla" }).title,
    ).toMatch(/nutrition/i);
  });

  it("quiet paths never compete as equal peer shelves", () => {
    const help = quietPathsForRoom("help", { isInfant: false });
    expect(help.map((p) => p.id)).not.toContain("ask-amy");
    expect(help.some((p) => p.id === "emotional" && p.demoted)).toBe(true);

    const understand = quietPathsForRoom("understand", { isInfant: false });
    expect(understand.map((p) => p.id)).not.toContain("guidance");
    expect(understand.every((p) => p.id !== "guidance")).toBe(true);

    const careInfant = quietPathsForRoom("care", { isInfant: true });
    const careOlder = quietPathsForRoom("care", { isInfant: false });
    expect(careInfant.map((p) => p.id)).toEqual(["nutrition", "health-lab"]);
    expect(careOlder.map((p) => p.id)).toEqual(["nutrition", "health-lab"]);
    expect(careOlder.map((p) => p.id)).not.toContain("infant-care");
  });

  it("purposes stay companionship — not browse language", () => {
    for (const room of ["help", "understand", "care"] as const) {
      const purpose = roomLivingPurpose(room).toLowerCase();
      expect(purpose).not.toMatch(/explore more|what's next|feature shelf/);
      expect(purpose).toMatch(/one |never /);
    }
  });

  it("maps living tiles back to destination ids", () => {
    expect(
      destinationIdForRoomLivingTile("help", ASK_AMY_STREAM_TILE_ID, {
        isInfant: false,
      }),
    ).toBe("ask-amy");
    expect(
      destinationIdForRoomLivingTile("understand", GUIDANCE_STREAM_TILE_ID, {
        isInfant: false,
      }),
    ).toBe("guidance");
  });
});
