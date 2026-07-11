/**
 * Fabric.js canvas bridge — professional editor with snapping, gestures, images.
 */
import {
  A4_HEIGHT,
  A4_WIDTH,
  EXPORT_SCALE_MULTIPLIER,
  PAGE_BORDER_RADIUS,
  PAGE_MARGIN,
  LAYOUT,
  type LayoutNode,
  type LayoutPageNode,
  type WorksheetClass,
  type WorksheetPage,
  type WorksheetElement,
} from "@workspace/worksheet-studio";
import { attachSnapping } from "./fabric-snapping";
import {
  extractSelectionStyle,
  type SelectionStyle,
  type SelectionObjectType,
} from "./selection-style";
import { attachGridOverlay, attachSafeAreaOverlay } from "./fabric-alignment-guides";
import {
  auditFabricLayoutParity,
  compareFabricToLayout,
  logFabricObjectBeforeAdd,
  runPostRenderVerification,
  type FabricLayoutDebugInfo,
  type PipelineVerifyResult,
} from "./fabric-layout-verify";

export type { SelectionStyle, SelectionObjectType };
export type { FabricLayoutDebugInfo, PipelineVerifyResult };
export { compareFabricToLayout, auditFabricLayoutParity } from "./fabric-layout-verify";

/** Fabric must draw LayoutTree with top-left anchors — never center origin. */
const TOP_LEFT = { originX: "left" as const, originY: "top" as const };

let fabricMod: FabricModule | null = null;

export async function loadFabric(): Promise<FabricModule> {
  if (!fabricMod) fabricMod = await import("fabric");
  return fabricMod;
}

export type FabricModule = typeof import("fabric");

export interface WorksheetCanvasHandle {
  canvas: import("fabric").Canvas;
  scale: number;
  dispose: () => void;
  renderPage: (page: WorksheetPage, colorMode?: "color" | "bw", classLevel?: WorksheetClass, layoutPage?: LayoutPageNode) => Promise<void>;
  /** Viewport/CSS size only — does not call renderPage or rebuild objects. */
  resizeToWidth: (viewportWidth: number) => Promise<void>;
  toDataURL: (dpiMultiplier?: number) => string;
  getActiveObject: () => import("fabric").FabricObject | undefined;
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  addTextBox: () => void;
  addImageFromDataUrl: (dataUrl: string) => Promise<void>;
  replaceSelectedImage: (dataUrl: string) => Promise<void>;
  addRectShape: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  toggleLock: () => void;
  setOpacity: (value: number) => void;
  rotateSelected: (deg: number) => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  setFontSize: (size: number) => void;
  toggleBold: () => void;
  setTextAlign: (align: "left" | "center" | "right") => void;
  setZoom: (factor: number) => void;
  getZoom: () => number;
  enterTextEdit: () => void;
  getSelectionStyle: () => SelectionStyle | null;
  applySelectionStyle: (style: Partial<SelectionStyle>) => void;
  onSelectionChange: (cb: (style: SelectionStyle | null) => void) => () => void;
  copyStyle: () => void;
  pasteStyle: () => void;
  setGridVisible: (visible: boolean) => void;
  setSafeAreaVisible: (visible: boolean) => void;
  panBy: (dx: number, dy: number) => void;
  resetViewport: () => void;
  exportPageState: (page: WorksheetPage) => WorksheetPage;
  onPageModified: (cb: () => void) => () => void;
  getLayoutDebugForSelection: () => FabricLayoutDebugInfo | null;
  auditLayoutParity: (tolerancePx?: number) => FabricLayoutDebugInfo[];
  setVerifyDebug: (enabled: boolean) => void;
  getLastVerifyResult: () => PipelineVerifyResult | null;
}

type LayoutObjData = {
  elementId: string;
  elementType: string;
  layoutNodeId: string;
  layoutKind: string;
  parentId?: string;
  layoutRect: { x: number; y: number; width: number; height: number };
};

function attachLayoutData(
  obj: import("fabric").FabricObject,
  node: LayoutNode,
  pageRect: { x: number; y: number; width: number; height: number },
) {
  (obj as import("fabric").FabricObject & { data?: LayoutObjData }).data = {
    elementId: node.sourceElementId,
    elementType: node.payload.elementType ?? node.kind,
    layoutNodeId: node.id,
    layoutKind: node.kind,
    parentId: node.parentId,
    layoutRect: { ...pageRect },
  };
  return obj;
}

/**
 * Pure LayoutTree → Fabric draw. Never computes layout.
 * Roots use page-absolute rects. Question-block children use relative rects inside the group.
 */
async function renderLayoutNodeToFabric(
  node: LayoutNode,
  scale: number,
  fabric: FabricModule,
  colorMode: "color" | "bw",
  opts?: {
    /** Parent block page origin — used to store absolute layoutRect for debug. */
    parentAbs?: { x: number; y: number };
    /** When true, Fabric left/top use node.rect (parent-relative). */
    relativeToParent?: boolean;
  },
): Promise<import("fabric").FabricObject | null> {
  const { Group, Textbox, Rect, FabricImage, Line, Circle, Triangle, LayoutManager, FixedLayout } = fabric as FabricModule & {
    LayoutManager?: new (strategy?: unknown) => unknown;
    FixedLayout?: new () => unknown;
  };
  const r = node.rect;
  const p = node.payload;
  const pageX = opts?.parentAbs ? opts.parentAbs.x + r.x : r.x;
  const pageY = opts?.parentAbs ? opts.parentAbs.y + r.y : r.y;
  const pageRect = { x: pageX, y: pageY, width: r.width, height: r.height };
  const left = (opts?.relativeToParent ? r.x : pageX) * scale;
  const top = (opts?.relativeToParent ? r.y : pageY) * scale;
  const width = r.width * scale;
  const height = r.height * scale;

  switch (node.kind) {
    case "prompt":
    case "option":
    case "text":
    case "header":
    case "footer": {
      const tb = new Textbox(p.content ?? "", {
        ...TOP_LEFT,
        left,
        top,
        width,
        fontSize: (p.fontSize ?? 12) * scale,
        fontWeight: p.fontWeight === "bold" ? "bold" : "normal",
        textAlign: p.textAlign ?? "left",
        fill: p.color ?? "#111",
        editable: !p.locked,
        selectable: !p.locked,
        lockMovementX: !!p.locked,
        lockMovementY: !!p.locked,
        lineHeight: p.lineHeight ?? LAYOUT.LINE_HEIGHT,
        cornerSize: 14,
        touchCornerSize: 28,
      });
      return attachLayoutData(tb, node, pageRect);
    }
    case "illustration": {
      if (p.src) {
        try {
          const img = await FabricImage.fromURL(p.src, { crossOrigin: "anonymous" });
          const natW = img.width || 1;
          const natH = img.height || 1;
          const fit = Math.min(width / natW, height / natH);
          const drawW = natW * fit;
          const drawH = natH * fit;
          img.set({
            ...TOP_LEFT,
            left: left + (width - drawW) / 2,
            top: top + (height - drawH) / 2,
            scaleX: fit,
            scaleY: fit,
            selectable: true,
            cornerSize: 14,
            touchCornerSize: 28,
          });
          return attachLayoutData(img, node, pageRect);
        } catch {
          return null;
        }
      }
      const tb = new Textbox(p.label ?? "Picture", {
          ...TOP_LEFT,
          left,
          top,
          width,
          fontSize: 14 * scale,
          textAlign: "center",
          fill: "#555",
          editable: true,
        });
      return attachLayoutData(tb, node, pageRect);
    }
    case "answer_line": {
      const line = new Rect({
        ...TOP_LEFT,
        left,
        top,
        width,
        height: Math.max(1 * scale, height),
        fill: p.stroke ?? "#333",
        stroke: p.stroke ?? "#333",
        selectable: true,
        cornerSize: 14,
        touchCornerSize: 28,
      });
      return attachLayoutData(line, node, pageRect);
    }
    case "shape":
    case "frame": {
      if (p.shapeKind === "line") {
        const line = new Line([0, 0, width, 0], {
          ...TOP_LEFT,
          left,
          top,
          stroke: p.stroke ?? "#333",
          strokeWidth: (p.strokeWidth ?? 1) * scale,
          selectable: !p.locked,
        });
        return attachLayoutData(line, node, pageRect);
      }
      const common = {
        ...TOP_LEFT,
        left,
        top,
        stroke: p.stroke ?? "#333",
        strokeWidth: (p.strokeWidth ?? 1) * scale,
        fill: p.fill === "transparent" ? "transparent" : (p.fill ?? "transparent"),
        selectable: !p.locked,
        cornerSize: 14,
        touchCornerSize: 28,
      };
      if (p.shapeKind === "circle") {
        return attachLayoutData(new Circle({ ...common, radius: width / 2 }), node, pageRect);
      }
      if (p.shapeKind === "triangle") {
        return attachLayoutData(new Triangle({ ...common, width, height }), node, pageRect);
      }
      return attachLayoutData(
        new Rect({ ...common, width, height, rx: 4, ry: 4 }),
        node,
        pageRect,
      );
    }
    case "image": {
      if (!p.src) return null;
      try {
        const img = await FabricImage.fromURL(p.src, { crossOrigin: "anonymous" });
        img.set({
          ...TOP_LEFT,
          left,
          top,
          scaleX: width / (img.width || 1),
          scaleY: height / (img.height || 1),
          selectable: !p.locked,
          cornerSize: 14,
          touchCornerSize: 28,
        });
        return attachLayoutData(img, node, pageRect);
      } catch {
        return null;
      }
    }
    case "question_block": {
      // Place children at PAGE-ABSOLUTE coords first, then Group.
      // Fabric converts them to group-local coords and sets group left/top to the bbox origin.
      const items: import("fabric").FabricObject[] = [];
      for (const child of node.children) {
        const childObj = await renderLayoutNodeToFabric(child, scale, fabric, colorMode, {
          parentAbs: { x: r.x, y: r.y },
          relativeToParent: false,
        });
        if (childObj) items.push(childObj);
      }
      if (items.length === 0) return null;

      const groupOpts: Record<string, unknown> = {
        ...TOP_LEFT,
        subTargetCheck: true,
        interactive: true,
        cornerSize: 14,
        touchCornerSize: 28,
        lockMovementX: !!p.locked,
        lockMovementY: !!p.locked,
      };
      if (typeof LayoutManager === "function" && typeof FixedLayout === "function") {
        groupOpts.layoutManager = new LayoutManager(new FixedLayout());
      }

      const group = new Group(items, groupOpts);
      // Pin group to LayoutTree rect — never trust auto-layout drift.
      group.set({
        ...TOP_LEFT,
        left: r.x * scale,
        top: r.y * scale,
      });
      group.setCoords();
      return attachLayoutData(group, node, { x: r.x, y: r.y, width: r.width, height: r.height });
    }
    default:
      return null;
  }
}

export async function createWorksheetCanvas(container: HTMLCanvasElement, viewportWidth: number): Promise<WorksheetCanvasHandle> {
  const fabric = await loadFabric();
  const { Canvas, Rect } = fabric;
  let scale = computeWorksheetCanvasScale(viewportWidth);
  let canvasWidth = Math.round(A4_WIDTH * scale);
  let canvasHeight = Math.round(A4_HEIGHT * scale);
  let zoomFactor = 1;
  let clipboard: import("fabric").FabricObject | null = null;
  let colorMode: "color" | "bw" = "color";
  let verifyDebug = false;
  let lastVerifyResult: PipelineVerifyResult | null = null;

  const canvas = new Canvas(container, {
    width: canvasWidth,
    height: canvasHeight,
    backgroundColor: "#f8f6f2",
    selection: true,
    preserveObjectStacking: true,
    enableRetinaScaling: true,
    stopContextMenu: true,
    fireRightClick: true,
  });

  const history: string[] = [];
  let historyStep = -1;
  let skipHistory = false;

  const pushHistory = () => {
    if (skipHistory) return;
    const json = JSON.stringify(canvas.toJSON());
    history.splice(historyStep + 1);
    history.push(json);
    if (history.length > 50) history.shift();
    historyStep = history.length - 1;
  };

  canvas.on("object:modified", pushHistory);
  canvas.on("object:added", pushHistory);

  const pageBorder = new Rect({
    ...TOP_LEFT,
    left: 0, top: 0, width: canvasWidth, height: canvasHeight,
    fill: "#ffffff", stroke: "#d4cfc4", strokeWidth: 2,
    rx: PAGE_BORDER_RADIUS * scale, ry: PAGE_BORDER_RADIUS * scale,
    selectable: false, evented: false,
  });
  canvas.add(pageBorder);
  canvas.sendObjectToBack(pageBorder);

  const syncCanvasDimensions = (nextScale: number) => {
    scale = nextScale;
    canvasWidth = Math.round(A4_WIDTH * scale);
    canvasHeight = Math.round(A4_HEIGHT * scale);
    canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
    pageBorder.set({
      width: canvasWidth,
      height: canvasHeight,
      rx: PAGE_BORDER_RADIUS * scale,
      ry: PAGE_BORDER_RADIUS * scale,
    });
    pageBorder.setCoords();
  };

  const detachSnap = attachSnapping(canvas, scale, fabric);
  let selectionCb: ((style: SelectionStyle | null) => void) | null = null;
  let styleClipboard: Partial<SelectionStyle> | null = null;
  let gridObjects: import("fabric").FabricObject[] = [];
  let safeAreaObj: import("fabric").Rect | null = null;
  let gridVisible = false;
  let safeAreaVisible = false;
  let dupClone: import("fabric").FabricObject | null = null;
  let selectionRaf = 0;

  const emitSelection = () => {
    cancelAnimationFrame(selectionRaf);
    selectionRaf = requestAnimationFrame(() => {
      const o = canvas.getActiveObject();
      if (!o || o === pageBorder) { selectionCb?.(null); return; }
      selectionCb?.(extractSelectionStyle(o, scale));
    });
  };

  canvas.on("selection:created", emitSelection);
  canvas.on("selection:updated", emitSelection);
  canvas.on("selection:cleared", () => selectionCb?.(null));
  canvas.on("object:scaling", emitSelection);
  canvas.on("object:rotating", emitSelection);

  canvas.on("object:moving", (e) => {
    const ev = e.e as MouseEvent | undefined;
    const target = e.target;
    if (!target || target === pageBorder) return;
    if (ev?.altKey && !dupClone) {
      target.clone().then((cloned) => {
        dupClone = cloned;
        cloned.set({ left: (target.left ?? 0) - 16, top: (target.top ?? 0) - 16, opacity: 0.92 });
        canvas.add(cloned);
        canvas.sendObjectToBack(pageBorder);
      });
    }
    const vpt = canvas.viewportTransform;
    if (!vpt) return;
    const bound = target.getBoundingRect();
    const edge = 48;
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    if (bound.left < edge) vpt[4] += 6;
    if (bound.left + bound.width > w - edge) vpt[4] -= 6;
    if (bound.top < edge) vpt[5] += 6;
    if (bound.top + bound.height > h - edge) vpt[5] -= 6;
    canvas.setViewportTransform(vpt);
  });

  canvas.on("mouse:up", () => { dupClone = null; });

  canvas.on("mouse:dblclick", (opt) => {
    const target = opt.target;
    if (target && "enterEditing" in target && typeof target.enterEditing === "function") {
      (target as { enterEditing: () => void }).enterEditing();
    }
  });

  const renderPage = async (
    page: WorksheetPage,
    mode: "color" | "bw" = "color",
    classLevel?: WorksheetClass,
    layoutPage?: LayoutPageNode,
  ) => {
    colorMode = mode;
    skipHistory = true;
    canvas.getObjects().filter((o) => o !== pageBorder).forEach((o) => canvas.remove(o));

    if (!layoutPage) {
      console.error("[FabricLayoutVerify] STEP8 — layoutPage required. Legacy element renderer removed.");
      skipHistory = false;
      throw new Error("Fabric render requires LayoutTree page (layoutPage). Legacy path removed.");
    }

    const sorted = [...layoutPage.nodes].sort((a, b) => a.zIndex - b.zIndex);
    for (const node of sorted) {
      const obj = await renderLayoutNodeToFabric(node, scale, fabric, mode);
      if (!obj) continue;
      logFabricObjectBeforeAdd(node, obj.left ?? 0, obj.top ?? 0, scale);
      canvas.add(obj);
    }

    // Viewport reset — visual only; does not rewrite object geometry.
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    zoomFactor = 1;
    canvas.requestRenderAll();

    if (verifyDebug) {
      lastVerifyResult = runPostRenderVerification({
        layoutPage,
        canvas,
        scale,
        zoomFactor,
        pageBorder,
        tolerancePx: 2,
        failFast: true,
      });
      if (!lastVerifyResult.ok) {
        console.error("[FabricLayoutVerify] pipeline failed", lastVerifyResult.stoppedAt, lastVerifyResult.logs);
      }
    }

    skipHistory = false;
    pushHistory();
  };

  /**
   * Viewport / CSS size only — never rebuilds Fabric page objects.
   * Scale change without re-layout keeps existing objects; caller must not expect a full reflow.
   */
  const resizeToWidth = async (nextViewportWidth: number) => {
    const nextScale = computeWorksheetCanvasScale(nextViewportWidth);
    if (Math.abs(nextScale - scale) < 0.01) {
      canvas.requestRenderAll();
      return;
    }
    syncCanvasDimensions(nextScale);
    // Do not call renderPage() — that recreates objects and causes layout corruption.
    // Do not rebuild grid/safe-area overlays here (would recreate Fabric objects).
    canvas.requestRenderAll();
  };

  const addImageFromDataUrl = async (dataUrl: string) => {
    const { FabricImage } = fabric;
    const img = await FabricImage.fromURL(dataUrl);
    const maxW = 180 * scale;
    const ratio = Math.min(maxW / (img.width || 1), maxW / (img.height || 1));
    img.set({
      left: PAGE_MARGIN * scale, top: 280 * scale,
      scaleX: ratio, scaleY: ratio,
      cornerSize: 14, touchCornerSize: 28,
    });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
  };

  return {
    canvas,
    get scale() {
      return scale;
    },
    dispose: () => { detachSnap(); canvas.dispose(); },
    renderPage,
    toDataURL: (dpiMultiplier = 1) =>
      canvas.toDataURL({
        format: "png",
        multiplier: (dpiMultiplier * zoomFactor) / scale,
        enableRetinaScaling: true,
      }),
    getActiveObject: () => canvas.getActiveObject(),
    undo: () => {
      if (historyStep <= 0) return;
      historyStep -= 1;
      skipHistory = true;
      canvas.loadFromJSON(history[historyStep]).then(() => { canvas.requestRenderAll(); skipHistory = false; });
    },
    redo: () => {
      if (historyStep >= history.length - 1) return;
      historyStep += 1;
      skipHistory = true;
      canvas.loadFromJSON(history[historyStep]).then(() => { canvas.requestRenderAll(); skipHistory = false; });
    },
    deleteSelected: () => {
      canvas.getActiveObjects().forEach((o) => { if (o !== pageBorder) canvas.remove(o); });
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    },
    duplicateSelected: () => {
      const active = canvas.getActiveObject();
      if (!active || active === pageBorder) return;
      active.clone().then((cloned) => {
        cloned.set({ left: (active.left ?? 0) + 16, top: (active.top ?? 0) + 16 });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
      });
    },
    copySelected: () => {
      const active = canvas.getActiveObject();
      if (active && active !== pageBorder) clipboard = active;
    },
    pasteClipboard: () => {
      if (!clipboard) return;
      clipboard.clone().then((cloned) => {
        cloned.set({ left: (clipboard!.left ?? 0) + 24, top: (clipboard!.top ?? 0) + 24 });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
      });
    },
    groupSelected: () => {
      const objs = canvas.getActiveObjects().filter((o) => o !== pageBorder);
      if (objs.length < 2) return;
      const { Group } = fabric;
      const group = new Group(objs, { subTargetCheck: true });
      objs.forEach((o) => canvas.remove(o));
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
    },
    ungroupSelected: () => {
      const active = canvas.getActiveObject();
      if (!active || active.type !== "group") return;
      const items = (active as import("fabric").Group).getObjects();
      canvas.remove(active);
      items.forEach((item) => {
        item.set({ left: (item.left ?? 0) + (active.left ?? 0), top: (item.top ?? 0) + (active.top ?? 0) });
        canvas.add(item);
      });
      canvas.requestRenderAll();
    },
    addTextBox: () => {
      const { Textbox } = fabric;
      const tb = new Textbox("Tap to edit", { left: PAGE_MARGIN * scale, top: 200 * scale, width: 200 * scale, fontSize: 16 * scale, fill: "#111", cornerSize: 14, touchCornerSize: 28 });
      canvas.add(tb);
      canvas.setActiveObject(tb);
      canvas.requestRenderAll();
    },
    addImageFromDataUrl,
    replaceSelectedImage: async (dataUrl: string) => {
      const active = canvas.getActiveObject();
      if (!active || active.type !== "image") return;
      const { FabricImage } = fabric;
      const img = await FabricImage.fromURL(dataUrl);
      img.set({ left: active.left, top: active.top, scaleX: active.scaleX, scaleY: active.scaleY, angle: active.angle });
      canvas.remove(active);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    },
    addRectShape: () => {
      const { Rect } = fabric;
      const rect = new Rect({ left: PAGE_MARGIN * scale, top: 240 * scale, width: 80 * scale, height: 80 * scale, fill: "transparent", stroke: "#333", strokeWidth: 2, cornerSize: 14, touchCornerSize: 28 });
      canvas.add(rect);
      canvas.setActiveObject(rect);
      canvas.requestRenderAll();
    },
    bringForward: () => { const o = canvas.getActiveObject(); if (o) canvas.bringObjectForward(o); canvas.requestRenderAll(); },
    sendBackward: () => { const o = canvas.getActiveObject(); if (o) canvas.sendObjectBackwards(o); canvas.requestRenderAll(); },
    bringToFront: () => { const o = canvas.getActiveObject(); if (o) canvas.bringObjectToFront(o); canvas.requestRenderAll(); },
    sendToBack: () => { const o = canvas.getActiveObject(); if (o && o !== pageBorder) canvas.sendObjectToBack(o); canvas.requestRenderAll(); },
    toggleLock: () => {
      const o = canvas.getActiveObject();
      if (!o) return;
      const locked = !o.lockMovementX;
      o.set({ lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked, selectable: !locked, hasControls: !locked });
      canvas.requestRenderAll();
    },
    setOpacity: (value: number) => { const o = canvas.getActiveObject(); if (o) { o.set("opacity", value); canvas.requestRenderAll(); } },
    rotateSelected: (deg: number) => { const o = canvas.getActiveObject(); if (o) { o.rotate(((o.angle ?? 0) + deg) % 360); canvas.requestRenderAll(); } },
    flipHorizontal: () => { const o = canvas.getActiveObject(); if (o) { o.set("flipX", !o.flipX); canvas.requestRenderAll(); } },
    flipVertical: () => { const o = canvas.getActiveObject(); if (o) { o.set("flipY", !o.flipY); canvas.requestRenderAll(); } },
    setFontSize: (size: number) => { const o = canvas.getActiveObject(); if (o && "fontSize" in o) { o.set("fontSize", size * scale); canvas.requestRenderAll(); } },
    toggleBold: () => { const o = canvas.getActiveObject(); if (o && "fontWeight" in o) { o.set("fontWeight", o.fontWeight === "bold" ? "normal" : "bold"); canvas.requestRenderAll(); } },
    setTextAlign: (align: "left" | "center" | "right") => { const o = canvas.getActiveObject(); if (o && "textAlign" in o) { o.set("textAlign", align); canvas.requestRenderAll(); } },
    setZoom: (factor: number) => { zoomFactor = Math.max(0.5, Math.min(3, factor)); canvas.setZoom(zoomFactor); canvas.requestRenderAll(); },
    getZoom: () => zoomFactor,
    enterTextEdit: () => {
      const o = canvas.getActiveObject();
      if (o && "enterEditing" in o && typeof o.enterEditing === "function") (o as { enterEditing: () => void }).enterEditing();
    },
    getSelectionStyle: () => {
      const o = canvas.getActiveObject();
      if (!o || o === pageBorder) return null;
      return extractSelectionStyle(o, scale);
    },
    applySelectionStyle: (style: Partial<SelectionStyle>) => {
      const o = canvas.getActiveObject();
      if (!o || o === pageBorder) return;
      if (style.fontSize != null && "fontSize" in o) o.set("fontSize", style.fontSize * scale);
      if (style.fontFamily != null && "fontFamily" in o) o.set("fontFamily", style.fontFamily);
      if (style.fontWeight != null && "fontWeight" in o) o.set("fontWeight", style.fontWeight);
      if (style.fontStyle != null && "fontStyle" in o) o.set("fontStyle", style.fontStyle);
      if (style.underline != null && "underline" in o) o.set("underline", style.underline);
      if (style.fill != null && "fill" in o) o.set("fill", style.fill);
      if (style.backgroundColor != null && "textBackgroundColor" in o) o.set("textBackgroundColor", style.backgroundColor);
      if (style.lineHeight != null && "lineHeight" in o) o.set("lineHeight", style.lineHeight);
      if (style.charSpacing != null && "charSpacing" in o) o.set("charSpacing", style.charSpacing * scale);
      if (style.textAlign != null && "textAlign" in o) o.set("textAlign", style.textAlign);
      if (style.stroke != null && "stroke" in o) o.set("stroke", style.stroke);
      if (style.strokeWidth != null && "strokeWidth" in o) o.set("strokeWidth", style.strokeWidth * scale);
      if (style.rx != null && "rx" in o) { o.set({ rx: style.rx * scale, ry: style.rx * scale }); }
      if (style.opacity != null) o.set("opacity", style.opacity);
      if (style.angle != null) o.set("angle", style.angle);
      if (style.left != null) o.set("left", style.left * scale);
      if (style.top != null) o.set("top", style.top * scale);
      if (style.width != null && "width" in o) o.set("width", style.width * scale);
      if (style.flipX != null) o.set("flipX", style.flipX);
      if (style.flipY != null) o.set("flipY", style.flipY);
      if (style.brightness != null || style.contrast != null || style.saturation != null) {
        void (async () => {
          const { filters } = await import("fabric");
          const img = o as import("fabric").FabricImage;
          if (img.type !== "image") return;
          const list: import("fabric").filters.BaseFilter<string, object, object>[] = [];
          if (style.brightness != null) list.push(new filters.Brightness({ brightness: style.brightness }));
          if (style.contrast != null) list.push(new filters.Contrast({ contrast: style.contrast }));
          if (style.saturation != null) list.push(new filters.Saturation({ saturation: style.saturation }));
          img.filters = list;
          await img.applyFilters();
          canvas.requestRenderAll();
          emitSelection();
        })();
      }
      o.setCoords();
      canvas.requestRenderAll();
      emitSelection();
    },
    copyStyle: () => {
      const o = canvas.getActiveObject();
      if (o && o !== pageBorder) styleClipboard = extractSelectionStyle(o, scale);
    },
    pasteStyle: () => {
      if (!styleClipboard) return;
      const o = canvas.getActiveObject();
      if (!o || o === pageBorder) return;
      const { objectType: _t, left: _l, top: _tp, width: _w, height: _h, locked: _lk, ...rest } = styleClipboard;
      const apply = canvas.getActiveObject();
      if (!apply) return;
      if (rest.fontSize != null && "fontSize" in apply) apply.set("fontSize", (rest.fontSize as number) * scale);
      if (rest.fill != null && "fill" in apply) apply.set("fill", rest.fill);
      if (rest.opacity != null) apply.set("opacity", rest.opacity);
      if (rest.stroke != null && "stroke" in apply) apply.set("stroke", rest.stroke);
      canvas.requestRenderAll();
      emitSelection();
    },
    setGridVisible: (visible: boolean) => {
      gridVisible = visible;
      gridObjects.forEach((g) => canvas.remove(g));
      gridObjects = visible ? attachGridOverlay(canvas, fabric, scale, true) : [];
      gridObjects.forEach((g) => canvas.sendObjectToBack(g));
      canvas.sendObjectToBack(pageBorder);
      canvas.requestRenderAll();
    },
    setSafeAreaVisible: (visible: boolean) => {
      safeAreaVisible = visible;
      if (safeAreaObj) { canvas.remove(safeAreaObj); safeAreaObj = null; }
      if (visible) {
        safeAreaObj = attachSafeAreaOverlay(canvas, fabric, scale);
        canvas.bringObjectToFront(safeAreaObj);
      }
      canvas.requestRenderAll();
    },
    panBy: (dx: number, dy: number) => {
      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[4] += dx;
        vpt[5] += dy;
        canvas.setViewportTransform(vpt);
        canvas.requestRenderAll();
      }
    },
    resetViewport: () => {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      zoomFactor = 1;
      canvas.requestRenderAll();
    },
    resizeToWidth,
    exportPageState: (page: WorksheetPage): WorksheetPage => {
      const byId = new Map(page.elements.map((e) => [e.id, structuredClone(e)]));
      const extras: WorksheetElement[] = [];
      for (const obj of canvas.getObjects()) {
        if (obj === pageBorder) continue;
        const data = (obj as import("fabric").FabricObject & { data?: { elementId?: string } }).data;
        const id = data?.elementId;
        const left = (obj.left ?? 0) / scale;
        const top = (obj.top ?? 0) / scale;
        const w = ((obj.width ?? 0) * (obj.scaleX ?? 1)) / scale;
        const h = ((obj.height ?? 0) * (obj.scaleY ?? 1)) / scale;
        if (id && byId.has(id)) {
          const el = byId.get(id)!;
          el.x = left;
          el.y = top;
          if (w > 0) el.width = w;
          if (h > 0) el.height = h;
          if (el.type === "text" && (obj.type === "textbox" || obj.type === "i-text")) {
            const tb = obj as import("fabric").Textbox;
            if (tb.text != null) el.content = tb.text;
            if (typeof tb.fontSize === "number") el.fontSize = tb.fontSize / scale;
            if (typeof tb.fill === "string") el.color = tb.fill;
            if (tb.fontWeight === "bold" || tb.fontWeight === "normal") el.fontWeight = tb.fontWeight;
          }
          continue;
        }
        if (!id && (obj.type === "textbox" || obj.type === "i-text")) {
          const tb = obj as import("fabric").Textbox;
          extras.push({
            id: `user_${Date.now()}_${extras.length}`,
            type: "text",
            content: tb.text ?? "",
            x: left,
            y: top,
            width: w || 200,
            height: 30,
            fontSize: (typeof tb.fontSize === "number" ? tb.fontSize : 16 * scale) / scale,
            fontWeight: tb.fontWeight === "bold" ? "bold" : "normal",
            textAlign: (tb.textAlign as "left" | "center" | "right") ?? "left",
            color: typeof tb.fill === "string" ? tb.fill : "#111111",
            zIndex: 5,
          });
        }
      }
      return { ...page, elements: [...byId.values(), ...extras] };
    },
    onPageModified: (cb: () => void) => {
      const handler = () => cb();
      canvas.on("object:modified", handler);
      canvas.on("object:added", handler);
      canvas.on("object:removed", handler);
      return () => {
        canvas.off("object:modified", handler);
        canvas.off("object:added", handler);
        canvas.off("object:removed", handler);
      };
    },
    onSelectionChange: (cb) => {
      selectionCb = cb;
      return () => { selectionCb = null; };
    },
    getLayoutDebugForSelection: () => {
      const o = canvas.getActiveObject();
      if (!o || o === pageBorder) return null;
      return compareFabricToLayout(o, scale);
    },
    auditLayoutParity: (tolerancePx = 2) => auditFabricLayoutParity(canvas, scale, pageBorder, tolerancePx),
    setVerifyDebug: (enabled: boolean) => {
      verifyDebug = enabled;
    },
    getLastVerifyResult: () => lastVerifyResult,
  };
}

export { EXPORT_SCALE_MULTIPLIER };

const MIN_VIEWPORT_WIDTH = 280;

/** Fit A4 page width to container — guards against 0-width measure during layout. */
export function computeWorksheetCanvasScale(viewportWidth: number): number {
  const w = Math.max(MIN_VIEWPORT_WIDTH, viewportWidth);
  return Math.min(1, (w - 16) / A4_WIDTH);
}

export function computeWorksheetCanvasDimensions(viewportWidth: number): { width: number; height: number; scale: number } {
  const scale = computeWorksheetCanvasScale(viewportWidth);
  return {
    scale,
    width: Math.round(A4_WIDTH * scale),
    height: Math.round(A4_HEIGHT * scale),
  };
}
