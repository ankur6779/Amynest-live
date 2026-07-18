import { describe, expect, it } from "vitest";
import {
  fitArenaHeight,
  fitCellFontSize,
  fitChoiceGridMaxWidth,
  fitGridCellSize,
  GAME_LAYOUT,
} from "./game-layout-tokens";

describe("fitGridCellSize", () => {
  it("never overflows a 320px-class content width for Spot Diff 4-col", () => {
    // Modal inner ≈ 320 - 32 overlay - 36 pad ≈ 252
    const cell = fitGridCellSize({ containerWidth: 252, columns: 4 });
    const total = GAME_LAYOUT.gridPadding * 2 + cell * 4 + GAME_LAYOUT.gridGap * 3;
    expect(total).toBeLessThanOrEqual(252);
    expect(cell).toBeGreaterThanOrEqual(GAME_LAYOUT.cellMinDense);
  });

  it("fits maze 12×12 into narrow content", () => {
    const cell = fitGridCellSize({
      containerWidth: 280,
      columns: 12,
      gap: 0,
      padding: 0,
      chrome: 4,
      minCell: 16,
      maxCell: 54,
    });
    expect(cell * 12 + 4).toBeLessThanOrEqual(280);
  });

  it("caps at maxCell when space is plentiful", () => {
    const cell = fitGridCellSize({ containerWidth: 500, columns: 4, maxCell: 52 });
    expect(cell).toBe(52);
  });
});

describe("fitArenaHeight", () => {
  it("clamps to viewport fraction and max", () => {
    expect(fitArenaHeight({ viewportHeight: 568 })).toBeLessThanOrEqual(GAME_LAYOUT.arenaMaxHeight);
    expect(fitArenaHeight({ viewportHeight: 568 })).toBeGreaterThanOrEqual(GAME_LAYOUT.arenaMinHeight);
    expect(fitArenaHeight({ viewportHeight: 900 })).toBe(GAME_LAYOUT.arenaMaxHeight);
  });
});

describe("fitChoiceGridMaxWidth", () => {
  it("respects narrow containers", () => {
    expect(fitChoiceGridMaxWidth(200)).toBeLessThanOrEqual(200);
    expect(fitChoiceGridMaxWidth(400)).toBe(GAME_LAYOUT.choiceGridMaxPx);
  });
});

describe("fitCellFontSize", () => {
  it("scales with cell", () => {
    expect(fitCellFontSize(44)).toBeGreaterThan(fitCellFontSize(28));
  });
});
