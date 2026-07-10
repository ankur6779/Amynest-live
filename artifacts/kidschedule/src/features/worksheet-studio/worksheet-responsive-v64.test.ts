import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WS_VIEWPORT_WIDTHS,
  WS_RESPONSIVE_UI_FILES,
  auditSourceForForbiddenLayouts,
} from "./worksheet-responsive-architecture";
import * as theme from "./worksheet-studio-theme";

const FEATURE_DIR = import.meta.dirname;

describe("responsive architecture tokens v6.4", () => {
  it("exports required layout tokens", () => {
    expect(theme.WS_ROOT).toContain("overflow-x-hidden");
    expect(theme.WS_CONTAINER).toContain("min-w-0");
    expect(theme.WS_CONTAINER).toContain("max-w-");
    expect(theme.WS_SHEET).toContain("safe-area-inset");
    expect(theme.WS_DIALOG).toContain("min(28rem");
    expect(theme.WS_HEADING).toContain("clamp(");
    expect(theme.WS_CHIP_GRID).toContain("grid-cols-2");
    expect(theme.WS_EDITOR_CANVAS).toContain("min(30rem");
    expect(theme.WS_BTN_GRID).toContain("grid-cols-2");
  });

  it("defines QA viewport widths from 320 to 1440", () => {
    expect(WS_VIEWPORT_WIDTHS[0]).toBe(320);
    expect(WS_VIEWPORT_WIDTHS).toContain(375);
    expect(WS_VIEWPORT_WIDTHS).toContain(768);
    expect(WS_VIEWPORT_WIDTHS.at(-1)).toBe(1440);
  });
});

describe("responsive UI file audit v6.4", () => {
  for (const file of WS_RESPONSIVE_UI_FILES) {
    it(`${file} has no forbidden fixed layout patterns`, () => {
      const source = readFileSync(join(FEATURE_DIR, file), "utf8");
      const hits = auditSourceForForbiddenLayouts(source);
      expect(hits, `Forbidden patterns in ${file}: ${hits.join(", ")}`).toEqual([]);
    });
  }

  it("theme uses fluid spacing not hardcoded page widths", () => {
    const source = readFileSync(join(FEATURE_DIR, "worksheet-studio-theme.ts"), "utf8");
    expect(source).toContain("clamp(");
    expect(source).not.toMatch(/w-\[600px\]/);
    expect(source).not.toMatch(/w-\[700px\]/);
  });
});
