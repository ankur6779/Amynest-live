import { describe, expect, it } from "vitest";
import {
  AMY_MOUTH_FRAME_SRC,
  AMY_MOUTH_SHEET,
  mouthFrameSrc,
  PORTRAIT_LIP_CYCLE,
} from "@/lib/amy-3d/amy-mouth-sprites";

describe("amy-mouth-sprites", () => {
  it("maps all visemes to frame URLs", () => {
    expect(mouthFrameSrc("REST")).toBe(AMY_MOUTH_FRAME_SRC.REST);
    expect(mouthFrameSrc("AA")).toMatch(/amy-mouth-aa\.png$/);
    expect(mouthFrameSrc("OU")).toMatch(/amy-mouth-ou\.png$/);
  });

  it("uses row-major sheet indices REST→OU", () => {
    expect(AMY_MOUTH_SHEET.index.REST).toBe(0);
    expect(AMY_MOUTH_SHEET.index.AA).toBe(1);
    expect(AMY_MOUTH_SHEET.index.OU).toBe(5);
    expect(AMY_MOUTH_SHEET.cols * AMY_MOUTH_SHEET.rows).toBe(6);
  });

  it("procedural cycle matches 3D lip-sync order", () => {
    expect(PORTRAIT_LIP_CYCLE).toEqual(["AA", "OH", "EE", "IH", "OU"]);
  });
});
