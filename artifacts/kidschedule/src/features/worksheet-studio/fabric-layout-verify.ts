/**
 * Fabric ↔ LayoutTree verification (debug sprint).
 * Read-only diagnostics — does not change LayoutTree or AI.
 */
import {
  A4_HEIGHT,
  A4_WIDTH,
  PAGE_MARGIN,
  type LayoutNode,
  type LayoutPageNode,
  type LayoutTree,
} from "@workspace/worksheet-studio";

export type FabricLayoutDebugInfo = {
  layoutNodeId: string;
  elementId: string;
  kind: string;
  parentId?: string;
  expected: { x: number; y: number; width: number; height: number };
  actual: { x: number; y: number; width: number; height: number };
  delta: { x: number; y: number };
  warning: boolean;
  geometryHash?: string;
};

type LayoutObjData = {
  elementId: string;
  elementType: string;
  layoutNodeId: string;
  layoutKind: string;
  parentId?: string;
  layoutRect: { x: number; y: number; width: number; height: number };
};

/** Compare a Fabric object's canvas position to its LayoutTree rect (page points). */
export function compareFabricToLayout(
  obj: import("fabric").FabricObject,
  scale: number,
  tolerancePx = 2,
): FabricLayoutDebugInfo | null {
  const data = (obj as import("fabric").FabricObject & { data?: LayoutObjData }).data;
  if (!data?.layoutRect || scale <= 0) return null;
  const br = obj.getBoundingRect();
  const actual = {
    x: br.left / scale,
    y: br.top / scale,
    width: br.width / scale,
    height: br.height / scale,
  };
  const expected = data.layoutRect;
  const delta = { x: actual.x - expected.x, y: actual.y - expected.y };
  const warning =
    Math.abs(delta.x) * scale > tolerancePx || Math.abs(delta.y) * scale > tolerancePx;
  return {
    layoutNodeId: data.layoutNodeId,
    elementId: data.elementId,
    kind: data.layoutKind,
    parentId: data.parentId,
    expected,
    actual,
    delta,
    warning,
  };
}

export function auditFabricLayoutParity(
  canvas: import("fabric").Canvas,
  scale: number,
  pageBorder?: import("fabric").FabricObject | null,
  tolerancePx = 2,
): FabricLayoutDebugInfo[] {
  const out: FabricLayoutDebugInfo[] = [];
  const walk = (objs: import("fabric").FabricObject[]) => {
    for (const obj of objs) {
      if (pageBorder && obj === pageBorder) continue;
      const info = compareFabricToLayout(obj, scale, tolerancePx);
      if (info) out.push(info);
      const group = obj as import("fabric").Group;
      if (typeof group.getObjects === "function") {
        walk(group.getObjects());
      }
    }
  };
  walk(canvas.getObjects());
  return out;
}

export type LayoutTreeDump = {
  pageWidth: number;
  pageHeight: number;
  pageIndex: number;
  pageNumber: number;
  contentRegion: { top: number; bottom: number; width: number };
  questions: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    children: Array<{
      id: string;
      kind: string;
      x: number;
      y: number;
      width: number;
      height: number;
      contentPreview?: string;
    }>;
  }>;
  otherRoots: Array<{ id: string; kind: string; x: number; y: number; width: number; height: number }>;
};

export type ViewportDump = {
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  zoom: number;
  pan: { x: number; y: number };
  viewportTransform: number[];
};

export type GroupDump = {
  layoutNodeId?: string;
  originX: string;
  originY: string;
  left: number;
  top: number;
  width: number;
  height: number;
  childrenCount: number;
  boundingRect: { left: number; top: number; width: number; height: number };
  expected?: { x: number; y: number; width: number; height: number };
  deltaPx?: { x: number; y: number };
  mismatch: boolean;
};

export type PipelineVerifyResult = {
  ok: boolean;
  layoutTreeOk: boolean;
  layoutDump: LayoutTreeDump | null;
  viewport: ViewportDump | null;
  groups: GroupDump[];
  mismatches: FabricLayoutDebugInfo[];
  firstMismatch: FabricLayoutDebugInfo | null;
  stoppedAt?: string;
  logs: string[];
};

const LOG_PREFIX = "[FabricLayoutVerify]";

export function dumpLayoutPage(page: LayoutPageNode): LayoutTreeDump {
  const questions = page.nodes
    .filter((n) => n.kind === "question_block")
    .map((q) => ({
      id: q.id,
      x: q.rect.x,
      y: q.rect.y,
      width: q.rect.width,
      height: q.rect.height,
      children: q.children.map((c) => ({
        id: c.id,
        kind: c.kind,
        x: c.rect.x,
        y: c.rect.y,
        width: c.rect.width,
        height: c.rect.height,
        contentPreview: c.payload.content?.slice(0, 48)
          ?? c.payload.label
          ?? c.payload.emoji
          ?? undefined,
      })),
    }));

  const otherRoots = page.nodes
    .filter((n) => n.kind !== "question_block")
    .map((n) => ({
      id: n.id,
      kind: n.kind,
      x: n.rect.x,
      y: n.rect.y,
      width: n.rect.width,
      height: n.rect.height,
    }));

  return {
    pageWidth: A4_WIDTH,
    pageHeight: A4_HEIGHT,
    pageIndex: page.pageIndex,
    pageNumber: page.pageNumber,
    contentRegion: {
      top: page.contentRegion.top,
      bottom: page.contentRegion.bottom,
      width: page.contentRegion.width,
    },
    questions,
    otherRoots,
  };
}

/** STEP 1 — dump + basic LayoutTree sanity (does not mutate tree). */
export function verifyLayoutTreePage(page: LayoutPageNode): { ok: boolean; errors: string[]; dump: LayoutTreeDump } {
  const dump = dumpLayoutPage(page);
  const errors: string[] = [];

  if (dump.pageWidth !== A4_WIDTH || dump.pageHeight !== A4_HEIGHT) {
    errors.push(`Page size mismatch: ${dump.pageWidth}x${dump.pageHeight}`);
  }

  for (const q of dump.questions) {
    if (![q.x, q.y, q.width, q.height].every(Number.isFinite)) {
      errors.push(`Question ${q.id} has non-finite geometry`);
    }
    if (q.width <= 0 || q.height <= 0) {
      errors.push(`Question ${q.id} has non-positive size`);
    }
    if (q.x < PAGE_MARGIN - 2) {
      errors.push(`Question ${q.id} x=${q.x} outside left margin`);
    }
    if (q.y < 0) {
      errors.push(`Question ${q.id} y=${q.y} negative`);
    }
    for (const c of q.children) {
      if (c.x < -2 || c.y < -2) {
        errors.push(`Child ${c.id} relative coords negative (${c.x},${c.y})`);
      }
      if (c.x + c.width > q.width + 4) {
        errors.push(`Child ${c.id} overflows parent width`);
      }
      if (c.y + c.height > q.height + 4) {
        errors.push(`Child ${c.id} overflows parent height`);
      }
    }
  }

  return { ok: errors.length === 0, errors, dump };
}

export function dumpViewport(
  canvas: import("fabric").Canvas,
  scale: number,
  zoomFactor: number,
): ViewportDump {
  const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
  return {
    canvasWidth: canvas.getWidth(),
    canvasHeight: canvas.getHeight(),
    scale,
    zoom: zoomFactor,
    pan: { x: vpt[4] ?? 0, y: vpt[5] ?? 0 },
    viewportTransform: [...vpt],
  };
}

export function dumpFabricGroups(
  canvas: import("fabric").Canvas,
  scale: number,
  pageBorder?: import("fabric").FabricObject | null,
  tolerancePx = 2,
): GroupDump[] {
  const out: GroupDump[] = [];
  for (const obj of canvas.getObjects()) {
    if (pageBorder && obj === pageBorder) continue;
    const group = obj as import("fabric").Group;
    if (typeof group.getObjects !== "function") continue;
    const br = obj.getBoundingRect();
    const data = (obj as import("fabric").FabricObject & {
      data?: { layoutNodeId?: string; layoutRect?: { x: number; y: number; width: number; height: number } };
    }).data;
    const expected = data?.layoutRect;
    const deltaPx = expected
      ? {
          x: br.left - expected.x * scale,
          y: br.top - expected.y * scale,
        }
      : undefined;
    const mismatch = !!(
      deltaPx &&
      (Math.abs(deltaPx.x) > tolerancePx || Math.abs(deltaPx.y) > tolerancePx)
    );
    out.push({
      layoutNodeId: data?.layoutNodeId,
      originX: String(obj.originX ?? "left"),
      originY: String(obj.originY ?? "top"),
      left: obj.left ?? 0,
      top: obj.top ?? 0,
      width: (obj.width ?? 0) * (obj.scaleX ?? 1),
      height: (obj.height ?? 0) * (obj.scaleY ?? 1),
      childrenCount: group.getObjects().length,
      boundingRect: { left: br.left, top: br.top, width: br.width, height: br.height },
      expected,
      deltaPx,
      mismatch,
    });
  }
  return out;
}

/**
 * Kind-aware Fabric vs LayoutTree check.
 * Illustrations may be centered inside their box (same as PDF) — compare containment, not exact left.
 */
export function isAcceptableFabricMatch(info: FabricLayoutDebugInfo, scale: number, tolerancePx = 2): boolean {
  if (!info.warning) return true;
  if (info.kind === "illustration" || info.kind === "image") {
    const { expected, actual } = info;
    const contained =
      actual.x >= expected.x - tolerancePx / scale &&
      actual.y >= expected.y - tolerancePx / scale &&
      actual.x + actual.width <= expected.x + expected.width + tolerancePx / scale &&
      actual.y + actual.height <= expected.y + expected.height + tolerancePx / scale;
    return contained;
  }
  return false;
}

/** STEP 7 — first hard mismatch stops the pipeline. */
export function findFirstHardMismatch(
  mismatches: FabricLayoutDebugInfo[],
  scale: number,
  tolerancePx = 2,
): FabricLayoutDebugInfo | null {
  for (const m of mismatches) {
    if (!isAcceptableFabricMatch(m, scale, tolerancePx)) return m;
  }
  return null;
}

export function logLayoutTreeDump(dump: LayoutTreeDump): void {
  console.groupCollapsed(`${LOG_PREFIX} STEP1 LayoutTree page ${dump.pageNumber}`);
  console.log("page", dump.pageWidth, "x", dump.pageHeight);
  console.log("contentRegion", dump.contentRegion);
  console.table(
    dump.questions.map((q) => ({
      id: q.id,
      x: q.x,
      y: q.y,
      w: q.width,
      h: q.height,
      children: q.children.length,
    })),
  );
  for (const q of dump.questions) {
    console.table(
      q.children.map((c) => ({
        parent: q.id,
        id: c.id,
        kind: c.kind,
        x: c.x,
        y: c.y,
        w: c.width,
        h: c.height,
        preview: c.contentPreview,
      })),
    );
  }
  console.table(dump.otherRoots);
  console.groupEnd();
}

export function logFabricObjectBeforeAdd(
  node: LayoutNode,
  fabricLeft: number,
  fabricTop: number,
  scale: number,
  tolerancePx = 2,
): void {
  const expectedLeft = node.rect.x * scale;
  const expectedTop = node.rect.y * scale;
  const dx = fabricLeft - expectedLeft;
  const dy = fabricTop - expectedTop;
  const row = {
    id: node.id,
    kind: node.kind,
    layoutX: node.rect.x,
    layoutY: node.rect.y,
    fabricLeft,
    fabricTop,
    dx,
    dy,
  };
  if ((Math.abs(dx) > tolerancePx || Math.abs(dy) > tolerancePx) && (!node.parentId || node.kind === "question_block")) {
    console.warn(`${LOG_PREFIX} STEP2 Fabric input mismatch`, row);
  }
}

export function runPostRenderVerification(args: {
  layoutPage: LayoutPageNode;
  layoutTree?: LayoutTree;
  canvas: import("fabric").Canvas;
  scale: number;
  zoomFactor: number;
  pageBorder?: import("fabric").FabricObject | null;
  tolerancePx?: number;
  failFast?: boolean;
}): PipelineVerifyResult {
  const tolerancePx = args.tolerancePx ?? 2;
  const logs: string[] = [];
  const treeCheck = verifyLayoutTreePage(args.layoutPage);
  logLayoutTreeDump(treeCheck.dump);

  if (!treeCheck.ok) {
    for (const e of treeCheck.errors) {
      console.error(`${LOG_PREFIX} STEP1 LayoutTree INVALID — STOP`, e);
      logs.push(`STEP1: ${e}`);
    }
    return {
      ok: false,
      layoutTreeOk: false,
      layoutDump: treeCheck.dump,
      viewport: null,
      groups: [],
      mismatches: [],
      firstMismatch: null,
      stoppedAt: "STEP1_LAYOUTTREE",
      logs,
    };
  }
  logs.push("STEP1 LayoutTree OK");

  const viewport = dumpViewport(args.canvas, args.scale, args.zoomFactor);
  console.groupCollapsed(`${LOG_PREFIX} STEP4 Viewport`);
  console.log(viewport);
  console.groupEnd();
  logs.push(
    `STEP4 canvas ${viewport.canvasWidth}x${viewport.canvasHeight} scale=${viewport.scale.toFixed(3)} zoom=${viewport.zoom} pan=${viewport.pan.x},${viewport.pan.y}`,
  );

  const groups = dumpFabricGroups(args.canvas, args.scale, args.pageBorder, tolerancePx);
  console.groupCollapsed(`${LOG_PREFIX} STEP5 Groups (${groups.length})`);
  console.table(
    groups.map((g) => ({
      id: g.layoutNodeId,
      originX: g.originX,
      originY: g.originY,
      left: g.left.toFixed(1),
      top: g.top.toFixed(1),
      kids: g.childrenCount,
      brL: g.boundingRect.left.toFixed(1),
      brT: g.boundingRect.top.toFixed(1),
      dX: g.deltaPx?.x.toFixed(1),
      dY: g.deltaPx?.y.toFixed(1),
      mismatch: g.mismatch,
    })),
  );
  console.groupEnd();

  const mismatches = auditFabricLayoutParity(args.canvas, args.scale, args.pageBorder, tolerancePx)
    .filter((info) => info.warning);

  const firstMismatch = findFirstHardMismatch(mismatches, args.scale, tolerancePx);
  if (firstMismatch) {
    const msg = `${LOG_PREFIX} STEP7 FIRST MISMATCH — STOP`;
    console.error(msg, {
      objectId: firstMismatch.layoutNodeId,
      kind: firstMismatch.kind,
      expected: firstMismatch.expected,
      actual: firstMismatch.actual,
      delta: firstMismatch.delta,
      parent: firstMismatch.parentId,
    });
    console.trace(msg);
    logs.push(
      `STEP7 mismatch ${firstMismatch.layoutNodeId} expected (${firstMismatch.expected.x},${firstMismatch.expected.y}) actual (${firstMismatch.actual.x.toFixed(1)},${firstMismatch.actual.y.toFixed(1)})`,
    );
    if (args.failFast) {
      return {
        ok: false,
        layoutTreeOk: true,
        layoutDump: treeCheck.dump,
        viewport,
        groups,
        mismatches,
        firstMismatch,
        stoppedAt: "STEP7_FIRST_MISMATCH",
        logs,
      };
    }
  } else {
    logs.push("STEP7 no hard Fabric↔LayoutTree mismatches");
  }

  if (args.layoutTree) {
    logs.push(`STEP6 PDF parity: shared geometryHash=${args.layoutTree.geometryHash}`);
    console.info(`${LOG_PREFIX} STEP6 PDF/Canvas share LayoutTree`, args.layoutTree.geometryHash);
  }

  const groupMismatch = groups.find((g) => g.mismatch);
  return {
    ok: !firstMismatch && !groupMismatch,
    layoutTreeOk: true,
    layoutDump: treeCheck.dump,
    viewport,
    groups,
    mismatches,
    firstMismatch,
    stoppedAt: groupMismatch ? "STEP5_GROUP_MISMATCH" : undefined,
    logs,
  };
}

/** Overlay boxes derived from LayoutTree (expected geometry), not Fabric. */
export function layoutTreeDebugBoxes(
  page: LayoutPageNode,
  scale: number,
): Array<{ id: string; label: string; x: number; y: number; w: number; h: number; color: string; stroke: string }> {
  const boxes: Array<{ id: string; label: string; x: number; y: number; w: number; h: number; color: string; stroke: string }> = [
    {
      id: "page-origin",
      label: "origin (0,0)",
      x: 0,
      y: 0,
      w: 8 * scale,
      h: 8 * scale,
      color: "rgba(220,38,38,0.5)",
      stroke: "#dc2626",
    },
    {
      id: "margin",
      label: "margin",
      x: PAGE_MARGIN * scale,
      y: PAGE_MARGIN * scale,
      w: (A4_WIDTH - PAGE_MARGIN * 2) * scale,
      h: (A4_HEIGHT - PAGE_MARGIN * 2) * scale,
      color: "transparent",
      stroke: "#16a34a",
    },
  ];

  for (const node of page.nodes) {
    if (node.kind === "question_block") {
      boxes.push({
        id: node.id,
        label: `Q ${node.id}`,
        x: node.rect.x * scale,
        y: node.rect.y * scale,
        w: node.rect.width * scale,
        h: node.rect.height * scale,
        color: "rgba(220,38,38,0.08)",
        stroke: "#dc2626",
      });
      for (const child of node.children) {
        boxes.push({
          id: child.id,
          label: child.kind,
          x: (node.rect.x + child.rect.x) * scale,
          y: (node.rect.y + child.rect.y) * scale,
          w: child.rect.width * scale,
          h: Math.max(child.rect.height, 2) * scale,
          color: "rgba(37,99,235,0.08)",
          stroke: "#2563eb",
        });
      }
    }
  }
  return boxes;
}
