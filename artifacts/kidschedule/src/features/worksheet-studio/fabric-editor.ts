/**
 * Fabric.js canvas bridge — professional editor with snapping, gestures, images.
 */
import {
  A4_HEIGHT,
  A4_WIDTH,
  EXPORT_SCALE_MULTIPLIER,
  PAGE_BORDER_RADIUS,
  PAGE_MARGIN,
  type WorksheetPage,
  type WorksheetElement,
  type WorksheetQuestionBlock,
  type WorksheetShapeElement,
  type WorksheetTextElement,
} from "@workspace/worksheet-studio";
import { attachSnapping } from "./fabric-snapping";
import {
  extractSelectionStyle,
  type SelectionStyle,
  type SelectionObjectType,
} from "./selection-style";
import { attachGridOverlay, attachSafeAreaOverlay } from "./fabric-alignment-guides";

export type { SelectionStyle, SelectionObjectType };

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
  renderPage: (page: WorksheetPage, colorMode?: "color" | "bw") => Promise<void>;
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
}

function mapText(el: WorksheetTextElement, scale: number, fabric: FabricModule) {
  const { Textbox } = fabric;
  const tb = new Textbox(el.content, {
    left: el.x * scale,
    top: el.y * scale,
    width: el.width * scale,
    fontSize: el.fontSize * scale,
    fontWeight: el.fontWeight,
    textAlign: el.textAlign,
    fill: el.color,
    editable: !el.locked,
    selectable: !el.locked,
    lockMovementX: el.locked,
    lockMovementY: el.locked,
    lineHeight: el.lineHeight ?? 1.4,
    cornerSize: 14,
    touchCornerSize: 28,
    transparentCorners: false,
    borderColor: "#1e3a5f",
    cornerColor: "#1e3a5f",
    cornerStyle: "circle",
  });
  (tb as import("fabric").FabricObject & { data?: Record<string, unknown> }).data = { elementId: el.id, elementType: "text" };
  return tb;
}

function mapShape(el: WorksheetShapeElement, scale: number, fabric: FabricModule) {
  const { Rect, Circle, Line, Triangle } = fabric;
  const common = {
    left: el.x * scale,
    top: el.y * scale,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth * scale,
    fill: el.fill === "transparent" ? "transparent" : el.fill,
    selectable: !el.locked,
    cornerSize: 14,
    touchCornerSize: 28,
  };
  let obj;
  if (el.shapeKind === "circle") obj = new Circle({ ...common, radius: (el.width / 2) * scale });
  else if (el.shapeKind === "line") obj = new Line([el.x * scale, el.y * scale, (el.x + el.width) * scale, el.y * scale], { stroke: el.stroke, strokeWidth: el.strokeWidth * scale });
  else if (el.shapeKind === "triangle") obj = new Triangle({ ...common, width: el.width * scale, height: el.height * scale });
  else obj = new Rect({ ...common, width: el.width * scale, height: el.height * scale, rx: 4, ry: 4 });
  (obj as import("fabric").FabricObject & { data?: Record<string, unknown> }).data = { elementId: el.id, elementType: "shape" };
  return obj;
}

async function mapQuestion(el: WorksheetQuestionBlock, scale: number, fabric: FabricModule, colorMode: "color" | "bw") {
  const { Group, Textbox, Rect, FabricImage } = fabric;
  const items: import("fabric").FabricObject[] = [];
  items.push(new Textbox(el.prompt, { left: 0, top: 0, width: el.width * scale, fontSize: 15 * scale, fontWeight: "600", fill: "#111", editable: true }));
  if (el.illustrationSrc) {
    try {
      const img = await FabricImage.fromURL(el.illustrationSrc, { crossOrigin: "anonymous" });
      img.set({ left: (el.width * scale - 56 * scale) / 2, top: 28 * scale, scaleX: (56 * scale) / (img.width || 1), scaleY: (56 * scale) / (img.height || 1), selectable: false });
      items.push(img);
    } catch { /* emoji fallback */ }
  }
  if (!el.illustrationSrc && el.illustrationEmoji) {
    items.push(new Textbox(colorMode === "bw" ? `⬜ ${el.illustrationLabel ?? "Picture"}` : el.illustrationEmoji, { left: 0, top: 32 * scale, fontSize: 28 * scale, editable: false }));
  }
  if (el.options?.length) {
    el.options.forEach((opt, i) => {
      items.push(new Textbox(opt, { left: (i % 2) * 140 * scale, top: (60 + Math.floor(i / 2) * 28) * scale, fontSize: 13 * scale, width: 130 * scale }));
    });
  }
  if (el.answerLine) {
    items.push(new Rect({ left: 0, top: (el.options?.length ? 108 : 64) * scale, width: 140 * scale, height: 1, fill: "#333", stroke: "#333" }));
  }
  const group = new Group(items, { left: el.x * scale, top: el.y * scale, subTargetCheck: true, cornerSize: 14, touchCornerSize: 28 });
  (group as import("fabric").FabricObject & { data?: Record<string, unknown> }).data = { elementId: el.id, elementType: "question_block" };
  return group;
}

async function mapElement(el: WorksheetElement, scale: number, fabric: FabricModule, colorMode: "color" | "bw") {
  if (el.type === "text") return mapText(el, scale, fabric);
  if (el.type === "shape") return mapShape(el, scale, fabric);
  if (el.type === "question_block") return mapQuestion(el, scale, fabric, colorMode);
  if (el.type === "image") {
    const { FabricImage } = fabric;
    try {
      const img = await FabricImage.fromURL(el.src, { crossOrigin: "anonymous" });
      img.set({
        left: el.x * scale, top: el.y * scale,
        scaleX: (el.width * scale) / (img.width || 1),
        scaleY: (el.height * scale) / (img.height || 1),
        selectable: !el.locked, cornerSize: 14, touchCornerSize: 28,
        borderColor: "#1e3a5f", cornerColor: "#1e3a5f",
      });
      (img as import("fabric").FabricObject & { data?: Record<string, unknown> }).data = { elementId: el.id, elementType: "image" };
      return img;
    } catch { return null; }
  }
  return null;
}

export async function createWorksheetCanvas(container: HTMLCanvasElement, viewportWidth: number): Promise<WorksheetCanvasHandle> {
  const fabric = await loadFabric();
  const { Canvas, Rect } = fabric;
  const scale = Math.min(1, (viewportWidth - 24) / A4_WIDTH);
  const height = A4_HEIGHT * scale;
  let zoomFactor = 1;
  let clipboard: import("fabric").FabricObject | null = null;
  let colorMode: "color" | "bw" = "color";

  const canvas = new Canvas(container, {
    width: A4_WIDTH * scale,
    height,
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
    left: 0, top: 0, width: A4_WIDTH * scale, height: A4_HEIGHT * scale,
    fill: "#ffffff", stroke: "#d4cfc4", strokeWidth: 2,
    rx: PAGE_BORDER_RADIUS * scale, ry: PAGE_BORDER_RADIUS * scale,
    selectable: false, evented: false,
  });
  canvas.add(pageBorder);
  canvas.sendObjectToBack(pageBorder);

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

  const renderPage = async (page: WorksheetPage, mode: "color" | "bw" = "color") => {
    colorMode = mode;
    skipHistory = true;
    canvas.getObjects().filter((o) => o !== pageBorder).forEach((o) => canvas.remove(o));
    for (const el of page.elements) {
      const obj = await mapElement(el, scale, fabric, mode);
      if (obj) canvas.add(obj);
    }
    canvas.requestRenderAll();
    skipHistory = false;
    pushHistory();
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
    canvas, scale,
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
      canvas.on("text:changed", handler);
      return () => {
        canvas.off("object:modified", handler);
        canvas.off("text:changed", handler);
      };
    },
    onSelectionChange: (cb) => {
      selectionCb = cb;
      return () => { selectionCb = null; };
    },
  };
}

export { EXPORT_SCALE_MULTIPLIER };
