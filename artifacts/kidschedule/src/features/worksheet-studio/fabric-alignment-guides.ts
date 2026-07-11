import type { Canvas, FabricObject, Line } from "fabric";
import { PAGE_MARGIN } from "@workspace/worksheet-studio";

export const GUIDE_COLOR = "#3b82f6";
/** Print-safe margin — matches LayoutTree / PDF PAGE_MARGIN. */
export const SAFE_MARGIN = PAGE_MARGIN;

export interface SnapResult {
  left: number;
  top: number;
  guides: Array<{ x1: number; y1: number; x2: number; y2: number; label?: string }>;
}

export interface SnapContext {
  pageW: number;
  pageH: number;
  scale: number;
  threshold: number;
  centerX: number;
  centerY: number;
  margin: number;
}

export function buildSnapContext(canvas: Canvas, scale: number, threshold = 8): SnapContext {
  return {
    pageW: canvas.getWidth(),
    pageH: canvas.getHeight(),
    scale,
    threshold,
    centerX: canvas.getWidth() / 2,
    centerY: canvas.getHeight() / 2,
    margin: SAFE_MARGIN * scale,
  };
}

export function computeSnap(
  obj: FabricObject,
  others: FabricObject[],
  ctx: SnapContext,
): SnapResult {
  const bound = obj.getBoundingRect();
  let left = obj.left ?? 0;
  let top = obj.top ?? 0;
  const guides: SnapResult["guides"] = [];

  const snapX = [
    { pos: ctx.margin, label: "margin" },
    { pos: ctx.centerX - bound.width / 2, label: "center" },
    { pos: ctx.pageW - ctx.margin - bound.width, label: "margin" },
  ];
  const snapY = [
    { pos: ctx.margin, label: "margin" },
    { pos: ctx.centerY - bound.height / 2, label: "center" },
    { pos: ctx.pageH - ctx.margin - bound.height, label: "margin" },
  ];

  for (const { pos } of snapX) {
    if (Math.abs(left - pos) < ctx.threshold) {
      left = pos;
      guides.push({ x1: pos + bound.width / 2, y1: 0, x2: pos + bound.width / 2, y2: ctx.pageH, label: "center" });
    }
  }
  for (const { pos } of snapY) {
    if (Math.abs(top - pos) < ctx.threshold) {
      top = pos;
      guides.push({ x1: 0, y1: pos + bound.height / 2, x2: ctx.pageW, y2: pos + bound.height / 2, label: "center" });
    }
  }

  for (const other of others) {
    const ob = other.getBoundingRect();
    const pairs: Array<[number, number, "v" | "h", number]> = [
      [bound.left, ob.left, "v", ob.top],
      [bound.top, ob.top, "h", ob.left],
      [bound.left + bound.width, ob.left + ob.width, "v", ob.top],
      [bound.top + bound.height, ob.top + ob.height, "h", ob.left],
      [bound.left + bound.width / 2, ob.left + ob.width / 2, "v", ob.top],
      [bound.top + bound.height / 2, ob.top + ob.height / 2, "h", ob.left],
    ];
    for (const [a, b, orient, anchor] of pairs) {
      if (Math.abs(a - b) < ctx.threshold) {
        if (orient === "v") {
          const delta = b - a;
          left += delta;
          guides.push({ x1: b, y1: Math.min(bound.top, ob.top) - 8, x2: b, y2: Math.max(bound.top + bound.height, ob.top + ob.height) + 8 });
        } else {
          const delta = b - a;
          top += delta;
          guides.push({ x1: Math.min(bound.left, ob.left) - 8, y1: b, x2: Math.max(bound.left + bound.width, ob.left + ob.width) + 8, y2: b });
        }
      }
    }

    const gapRight = ob.left - (bound.left + bound.width);
    const gapLeft = bound.left - (ob.left + ob.width);
    if (gapRight > 0 && gapRight < 40 && Math.abs(bound.top - ob.top) < ctx.threshold * 2) {
      guides.push({
        x1: bound.left + bound.width,
        y1: bound.top + bound.height / 2,
        x2: ob.left,
        y2: ob.top + ob.height / 2,
        label: `${Math.round(gapRight / ctx.scale)}px`,
      });
    }
    if (gapLeft > 0 && gapLeft < 40 && Math.abs(bound.top - ob.top) < ctx.threshold * 2) {
      guides.push({
        x1: ob.left + ob.width,
        y1: bound.top + bound.height / 2,
        x2: bound.left,
        y2: ob.top + ob.height / 2,
        label: `${Math.round(gapLeft / ctx.scale)}px`,
      });
    }
  }

  return { left, top, guides };
}

export class AlignmentGuideRenderer {
  private lines: Line[] = [];
  private fabric: typeof import("fabric");

  constructor(fabric: typeof import("fabric")) {
    this.fabric = fabric;
  }

  show(canvas: Canvas, guides: SnapResult["guides"]) {
    this.clear(canvas);
    const { Line } = this.fabric;
    for (const g of guides) {
      const line = new Line([g.x1, g.y1, g.x2, g.y2], {
        stroke: GUIDE_COLOR,
        strokeWidth: 1,
        strokeDashArray: g.label ? undefined : [4, 4],
        selectable: false,
        evented: false,
        opacity: 0.85,
        excludeFromExport: true,
      });
      (line as FabricObject & { data?: Record<string, unknown> }).data = { isGuide: true };
      this.lines.push(line);
      canvas.add(line);
    }
    canvas.requestRenderAll();
  }

  clear(canvas: Canvas) {
    for (const line of this.lines) canvas.remove(line);
    this.lines = [];
    canvas.requestRenderAll();
  }
}

export function attachGridOverlay(
  canvas: Canvas,
  fabric: typeof import("fabric"),
  scale: number,
  visible: boolean,
): import("fabric").FabricObject[] {
  const { Line } = fabric;
  const objects: import("fabric").FabricObject[] = [];
  if (!visible) return objects;
  const step = 40 * scale;
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  for (let x = step; x < w; x += step) {
    const line = new Line([x, 0, x, h], { stroke: "#e8e4dc", strokeWidth: 0.5, selectable: false, evented: false, excludeFromExport: true });
    (line as FabricObject & { data?: Record<string, unknown> }).data = { isGrid: true };
    objects.push(line);
    canvas.add(line);
  }
  for (let y = step; y < h; y += step) {
    const line = new Line([0, y, w, y], { stroke: "#e8e4dc", strokeWidth: 0.5, selectable: false, evented: false, excludeFromExport: true });
    (line as FabricObject & { data?: Record<string, unknown> }).data = { isGrid: true };
    objects.push(line);
    canvas.add(line);
  }
  return objects;
}

export function attachSafeAreaOverlay(
  canvas: Canvas,
  fabric: typeof import("fabric"),
  scale: number,
): import("fabric").Rect {
  const { Rect } = fabric;
  const m = SAFE_MARGIN * scale;
  const rect = new Rect({
    left: m,
    top: m,
    width: canvas.getWidth() - m * 2,
    height: canvas.getHeight() - m * 2,
    fill: "transparent",
    stroke: GUIDE_COLOR,
    strokeWidth: 1,
    strokeDashArray: [6, 6],
    opacity: 0.35,
    selectable: false,
    evented: false,
    excludeFromExport: true,
  });
  (rect as FabricObject & { data?: Record<string, unknown> }).data = { isSafeArea: true };
  canvas.add(rect);
  return rect;
}
