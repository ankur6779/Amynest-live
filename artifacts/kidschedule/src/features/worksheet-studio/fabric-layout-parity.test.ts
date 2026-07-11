import { describe, expect, it } from "vitest";
import { compareFabricToLayout, type FabricLayoutDebugInfo, verifyLayoutTreePage, findFirstHardMismatch, isAcceptableFabricMatch } from "./fabric-layout-verify";
import { generateWorksheetLocal, prepareLayoutForRender, A4_WIDTH, A4_HEIGHT } from "@workspace/worksheet-studio";

function mockObj(opts: {
  left: number;
  top: number;
  width: number;
  height: number;
  layoutRect: { x: number; y: number; width: number; height: number };
  kind?: string;
}) {
  return {
    left: opts.left,
    top: opts.top,
    width: opts.width,
    height: opts.height,
    scaleX: 1,
    scaleY: 1,
    getBoundingRect: () => ({
      left: opts.left,
      top: opts.top,
      width: opts.width,
      height: opts.height,
    }),
    data: {
      elementId: "el1",
      elementType: "text",
      layoutNodeId: "ln_1",
      layoutKind: opts.kind ?? "header",
      layoutRect: opts.layoutRect,
    },
  } as unknown as import("fabric").FabricObject;
}

describe("fabric layout parity", () => {
  it("reports no warning when Fabric matches LayoutTree within 2px", () => {
    const scale = 0.5;
    const info = compareFabricToLayout(
      mockObj({
        left: 28 * scale,
        top: 40 * scale,
        width: 200 * scale,
        height: 24 * scale,
        layoutRect: { x: 28, y: 40, width: 200, height: 24 },
      }),
      scale,
      2,
    );
    expect(info).not.toBeNull();
    expect(info!.warning).toBe(false);
    expect(info!.delta.x).toBeCloseTo(0, 5);
    expect(info!.delta.y).toBeCloseTo(0, 5);
  });

  it("warns when Fabric X drifts more than 2px from LayoutTree", () => {
    const scale = 1;
    const info = compareFabricToLayout(
      mockObj({
        left: 10,
        top: 40,
        width: 200,
        height: 24,
        layoutRect: { x: 28, y: 40, width: 200, height: 24 },
      }),
      scale,
      2,
    ) as FabricLayoutDebugInfo;
    expect(info.warning).toBe(true);
    expect(info.delta.x).toBe(-18);
  });

  it("uses top-left page coordinates (no center-origin shift)", () => {
    const scale = 0.8;
    const layoutX = 28;
    const layoutY = 200;
    const info = compareFabricToLayout(
      mockObj({
        left: layoutX * scale,
        top: layoutY * scale,
        width: 555 * scale,
        height: 80 * scale,
        layoutRect: { x: layoutX, y: layoutY, width: 555, height: 80 },
        kind: "question_block",
      }),
      scale,
    );
    expect(info!.expected.x).toBe(layoutX);
    expect(info!.actual.x).toBeCloseTo(layoutX, 5);
    expect(info!.warning).toBe(false);
  });
});

describe("layout tree verification (STEP1)", () => {
  it("dumps page size and question geometry for generated worksheets", () => {
    const doc = generateWorksheetLocal({
      prompt: "verify layout tree dump",
      classLevel: "ukg",
      subject: "english",
      difficulty: "easy",
      pageCount: 1,
    });
    const { layoutTree } = prepareLayoutForRender(doc);
    const page = layoutTree.pages[0]!;
    const result = verifyLayoutTreePage(page);
    expect(result.dump.pageWidth).toBe(A4_WIDTH);
    expect(result.dump.pageHeight).toBe(A4_HEIGHT);
    expect(result.ok).toBe(true);
    expect(result.dump.questions.length).toBeGreaterThan(0);
    for (const q of result.dump.questions) {
      expect(q.width).toBeGreaterThan(0);
      expect(q.height).toBeGreaterThan(0);
      expect(q.children.length).toBeGreaterThan(0);
    }
  });

  it("treats illustration containment as acceptable match", () => {
    const info: FabricLayoutDebugInfo = {
      layoutNodeId: "ill",
      elementId: "q1",
      kind: "illustration",
      expected: { x: 100, y: 100, width: 56, height: 56 },
      actual: { x: 110, y: 108, width: 36, height: 36 },
      delta: { x: 10, y: 8 },
      warning: true,
    };
    expect(isAcceptableFabricMatch(info, 1, 2)).toBe(true);
    expect(findFirstHardMismatch([info], 1, 2)).toBeNull();
  });

  it("fails fast on question_block position drift", () => {
    const info: FabricLayoutDebugInfo = {
      layoutNodeId: "qb",
      elementId: "q1",
      kind: "question_block",
      expected: { x: 28, y: 200, width: 555, height: 80 },
      actual: { x: 0, y: 100, width: 555, height: 80 },
      delta: { x: -28, y: -100 },
      warning: true,
    };
    expect(findFirstHardMismatch([info], 1, 2)?.layoutNodeId).toBe("qb");
  });
});
