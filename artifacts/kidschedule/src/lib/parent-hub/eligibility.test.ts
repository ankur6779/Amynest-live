import { describe, expect, it } from "vitest";
import {
  INFANT_CARE_MAX_AGE_MONTHS,
  isInfantCareAge,
  isNutritionModuleEligible,
  isHealthModuleEligible,
  isSyntheticRoomTileId,
  isUrlSafeRoomTileId,
  resolveQuietPathsForRoom,
  UNIVERSAL_ROOM_MODULE_TILE_IDS,
  visibleHelpTileIdsForAge,
} from "./eligibility";
import { GROW_STREAM_TILE_ID } from "@/lib/grow/living-room";

const ALL_VISIBLE = [
  "amy-ai",
  "emotional",
  "speech-coach",
  "ptm-prep",
  "life-skills",
  "daily-tips",
  "birth-sky",
  "answer-to-kids-how",
  "nutrition",
  "health-lab",
  "infant-hub",
];

describe("Rooms eligibility product model", () => {
  it("treats Nutrition and Health as universal Care modules", () => {
    expect(isNutritionModuleEligible(4)).toBe(true);
    expect(isNutritionModuleEligible(18)).toBe(true);
    expect(isNutritionModuleEligible(60)).toBe(true);
    expect(isHealthModuleEligible(4)).toBe(true);
    expect(isHealthModuleEligible(90)).toBe(true);
    expect(UNIVERSAL_ROOM_MODULE_TILE_IDS).toContain("nutrition");
    expect(UNIVERSAL_ROOM_MODULE_TILE_IDS).toContain("health-lab");
  });

  it("restricts Infant Care to under 24 months", () => {
    expect(INFANT_CARE_MAX_AGE_MONTHS).toBe(24);
    expect(isInfantCareAge(0)).toBe(true);
    expect(isInfantCareAge(23)).toBe(true);
    expect(isInfantCareAge(24)).toBe(false);
  });

  it("keeps Nutrition in Care quiet paths for infants and older children", () => {
    const infant = resolveQuietPathsForRoom("care", {
      isInfant: true,
      visibleTileIds: ALL_VISIBLE,
    });
    const older = resolveQuietPathsForRoom("care", {
      isInfant: false,
      visibleTileIds: ALL_VISIBLE.filter((id) => id !== "infant-hub"),
    });
    expect(infant.map((p) => p.id)).toContain("nutrition");
    expect(older.map((p) => p.id)).toContain("nutrition");
    expect(older.map((p) => p.tileId)).not.toContain("infant-hub");
  });

  it("hides school-meeting Help path when the tile is not visible", () => {
    const infantHelp = resolveQuietPathsForRoom("help", {
      isInfant: true,
      visibleTileIds: ["amy-ai", "emotional", "speech-coach"],
    });
    expect(infantHelp.map((p) => p.id)).toContain("speech-coach");
    expect(infantHelp.map((p) => p.id)).not.toContain("ptm-prep");
    expect(infantHelp.map((p) => p.id)).not.toContain("life-skills");
  });

  it("keeps Grow stream path even though it is not a Hub tile id", () => {
    const paths = resolveQuietPathsForRoom("understand", {
      isInfant: false,
      visibleTileIds: ["daily-tips", "birth-sky"],
    });
    expect(paths.some((p) => p.tileId === GROW_STREAM_TILE_ID)).toBe(true);
  });

  it("does not put synthetic stream ids in URLs", () => {
    expect(isSyntheticRoomTileId(GROW_STREAM_TILE_ID)).toBe(true);
    expect(isUrlSafeRoomTileId("nutrition")).toBe(true);
    expect(isUrlSafeRoomTileId(GROW_STREAM_TILE_ID)).toBe(false);
  });

  it("flips Infant Care exactly at the 24-month boundary", () => {
    expect(isInfantCareAge(23)).toBe(true);
    expect(isInfantCareAge(24)).toBe(false);
    const infant = resolveQuietPathsForRoom("care", { isInfant: isInfantCareAge(23) });
    const toddler = resolveQuietPathsForRoom("care", { isInfant: isInfantCareAge(24) });
    expect(infant.map((p) => p.tileId)).toEqual(["nutrition", "health-lab"]);
    expect(toddler.map((p) => p.tileId)).toEqual(["nutrition", "health-lab"]);
  });

  it("intersects Help quiet paths with Hub visibility at infant and school ages", () => {
    const infantVisible = visibleHelpTileIdsForAge(11);
    expect(infantVisible).toContain("speech-coach");
    expect(infantVisible).not.toContain("ptm-prep");
    expect(infantVisible).not.toContain("life-skills");

    const infantHelp = resolveQuietPathsForRoom("help", {
      isInfant: true,
      visibleTileIds: infantVisible,
    });
    expect(infantHelp.map((p) => p.id)).toEqual(["emotional", "speech-coach"]);

    const schoolVisible = visibleHelpTileIdsForAge(72);
    expect(schoolVisible).toContain("ptm-prep");
    expect(schoolVisible).toContain("life-skills");
    const schoolHelp = resolveQuietPathsForRoom("help", {
      isInfant: false,
      visibleTileIds: schoolVisible,
    });
    expect(schoolHelp.map((p) => p.id)).toEqual([
      "emotional",
      "speech-coach",
      "ptm-prep",
      "life-skills",
    ]);
  });
});
