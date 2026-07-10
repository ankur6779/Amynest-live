import { describe, expect, it } from "vitest";
import { buildSnapContext, computeSnap } from "./fabric-alignment-guides";
import { detectObjectType, extractSelectionStyle, FONT_FAMILIES } from "./selection-style";
import { computeWorksheetCanvasDimensions, computeWorksheetCanvasScale } from "./fabric-editor";

describe("worksheet canvas scale", () => {
  it("falls back when container width is 0", () => {
    expect(computeWorksheetCanvasScale(0)).toBeGreaterThan(0.4);
  });

  it("fits phone width without undershooting", () => {
    const { width, scale } = computeWorksheetCanvasDimensions(390);
    expect(scale).toBeGreaterThan(0.55);
    expect(width).toBeGreaterThan(320);
  });

  it("caps at full A4 on wide desktop", () => {
    expect(computeWorksheetCanvasScale(1200)).toBe(1);
    expect(computeWorksheetCanvasDimensions(1200).width).toBe(595);
  });
});

describe("alignment guides", () => {
  it("snaps object to center", () => {
    const ctx = {
      pageW: 400, pageH: 600, scale: 1, threshold: 8,
      centerX: 200, centerY: 300, margin: 20,
    };
    const obj = {
      left: 153,
      top: 100,
      lockMovementX: false,
      getBoundingRect: () => ({ left: 153, top: 100, width: 100, height: 40 }),
    };
    const result = computeSnap(obj as never, [], ctx);
    expect(result.left).toBe(150);
    expect(result.guides.length).toBeGreaterThan(0);
  });

  it("builds snap context from dimensions", () => {
    const canvas = { getWidth: () => 595, getHeight: () => 842 } as never;
    const ctx = buildSnapContext(canvas, 0.8);
    expect(ctx.margin).toBe(16);
    expect(ctx.centerX).toBe(297.5);
  });
});

describe("selection-style", () => {
  it("lists font families for teachers", () => {
    expect(FONT_FAMILIES.length).toBeGreaterThanOrEqual(4);
    expect(FONT_FAMILIES).toContain("Arial");
  });

  it("detects text object type", () => {
    expect(detectObjectType({ type: "textbox" } as never)).toBe("text");
    expect(detectObjectType({ type: "image" } as never)).toBe("image");
  });

  it("extracts font size scaled", () => {
    const style = extractSelectionStyle({
      type: "textbox",
      fontSize: 32,
      opacity: 1,
      angle: 0,
      left: 40,
      top: 80,
      getBoundingRect: () => ({ left: 40, top: 80, width: 200, height: 50 }),
    } as never, 2);
    expect(style.fontSize).toBe(16);
    expect(style.left).toBe(20);
  });
});
