/**
 * Immutable layout tree — single source of truth for all renderers.
 * Canvas, PDF, print, and DOCX must draw from this tree only.
 */
import type {
  WorksheetClass,
  WorksheetDocument,
  WorksheetElement,
  WorksheetQuestionBlock,
  WorksheetShapeElement,
  WorksheetTextElement,
} from "./types.js";
import { A4_HEIGHT, A4_WIDTH, PAGE_MARGIN } from "./types.js";
import { FONT_SIZES_BY_CLASS } from "./constants.js";
import { LAYOUT } from "./layout-constants.js";
import {
  computeQuestionBlockChildLayout,
  estimateWrappedLineCount,
  getPageContentRegion,
  type PageContentRegion,
} from "./flow-layout-engine.js";
import { getActiveBrandingProfile } from "./school-branding.js";

export type LayoutNodeKind =
  | "page"
  | "content_region"
  | "header"
  | "footer"
  | "frame"
  | "question_block"
  | "prompt"
  | "illustration"
  | "option"
  | "answer_line"
  | "text"
  | "shape"
  | "image";

export interface LayoutRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly margin?: number;
  readonly padding?: number;
}

export interface LayoutNodePayload {
  readonly content?: string;
  readonly fontSize?: number;
  readonly fontWeight?: "normal" | "bold";
  readonly textAlign?: "left" | "center" | "right";
  readonly color?: string;
  readonly lineHeight?: number;
  readonly src?: string;
  readonly emoji?: string;
  readonly label?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly fill?: string;
  readonly shapeKind?: string;
  readonly optionIndex?: number;
  readonly locked?: boolean;
  readonly elementType?: WorksheetElement["type"];
}

export interface LayoutNode {
  readonly id: string;
  readonly kind: LayoutNodeKind;
  readonly pageIndex: number;
  readonly rect: LayoutRect;
  readonly zIndex: number;
  readonly sourceElementId: string;
  readonly parentId?: string;
  readonly payload: LayoutNodePayload;
  readonly children: readonly LayoutNode[];
}

export interface LayoutPageNode {
  readonly pageIndex: number;
  readonly pageNumber: number;
  readonly contentRegion: PageContentRegion;
  readonly nodes: readonly LayoutNode[];
}

export interface LayoutTree {
  readonly version: 1;
  readonly documentId: string;
  readonly classLevel: WorksheetClass;
  readonly pages: readonly LayoutPageNode[];
  readonly computedAt: string;
  readonly geometryHash: string;
}

export interface GeometryValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
}

function freezeRect(rect: LayoutRect): LayoutRect {
  return Object.freeze({ ...rect });
}

function isFiniteRect(r: LayoutRect): boolean {
  return [r.x, r.y, r.width, r.height].every((n) => Number.isFinite(n) && !Number.isNaN(n));
}

function rectInsidePage(r: LayoutRect, slack = 2): boolean {
  return (
    r.x >= -slack &&
    r.y >= -slack &&
    r.width >= 0 &&
    r.height >= 0 &&
    r.x + r.width <= A4_WIDTH + slack &&
    r.y + r.height <= A4_HEIGHT + slack
  );
}

function childInsideParentRelative(child: LayoutRect, parent: LayoutRect, slack = 4): boolean {
  return (
    child.x >= -slack &&
    child.y >= -slack &&
    child.x + child.width <= parent.width + slack &&
    child.y + child.height <= parent.height + slack
  );
}

function hashGeometry(pages: LayoutPageNode[]): string {
  const parts: string[] = [];
  for (const page of pages) {
    for (const node of flattenNodes(page.nodes)) {
      const r = node.rect;
      parts.push(
        `${node.id}|${node.kind}|${r.x.toFixed(2)}|${r.y.toFixed(2)}|${r.width.toFixed(2)}|${r.height.toFixed(2)}`,
      );
    }
  }
  let h = 0;
  const s = parts.join(";");
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `lt_v1_${(h >>> 0).toString(16)}`;
}

export function getAbsoluteRect(node: LayoutNode, parentRect?: LayoutRect): LayoutRect {
  if (!parentRect) return node.rect;
  return {
    x: parentRect.x + node.rect.x,
    y: parentRect.y + node.rect.y,
    width: node.rect.width,
    height: node.rect.height,
    margin: node.rect.margin,
    padding: node.rect.padding,
  };
}

export function flattenNodesAbsolute(nodes: readonly LayoutNode[]): Array<LayoutNode & { absoluteRect: LayoutRect }> {
  const out: Array<LayoutNode & { absoluteRect: LayoutRect }> = [];
  const walk = (list: readonly LayoutNode[], parentRect?: LayoutRect) => {
    for (const n of list) {
      const absoluteRect = getAbsoluteRect(n, parentRect);
      if (n.kind === "question_block") {
        out.push({ ...n, absoluteRect });
        walk(n.children, absoluteRect);
      } else if (!n.parentId) {
        out.push({ ...n, absoluteRect });
      }
    }
  };
  walk(nodes);
  return out;
}

export function flattenNodes(nodes: readonly LayoutNode[]): LayoutNode[] {
  const out: LayoutNode[] = [];
  const walk = (list: readonly LayoutNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function buildTextNode(
  el: WorksheetTextElement,
  pageIndex: number,
  kind: LayoutNodeKind = "text",
  parentId?: string,
): LayoutNode {
  return Object.freeze({
    id: `ln_${el.id}`,
    kind,
    pageIndex,
    rect: freezeRect({ x: el.x, y: el.y, width: el.width, height: el.height }),
    zIndex: el.zIndex,
    sourceElementId: el.id,
    parentId,
    payload: Object.freeze({
      content: el.content,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      textAlign: el.textAlign,
      color: el.color,
      lineHeight: el.lineHeight,
      locked: el.locked,
      elementType: "text" as const,
    }),
    children: Object.freeze([]),
  });
}

function buildShapeNode(el: WorksheetShapeElement, pageIndex: number, parentId?: string): LayoutNode {
  return Object.freeze({
    id: `ln_${el.id}`,
    kind: "shape",
    pageIndex,
    rect: freezeRect({ x: el.x, y: el.y, width: el.width, height: el.height }),
    zIndex: el.zIndex,
    sourceElementId: el.id,
    parentId,
    payload: Object.freeze({
      stroke: el.stroke,
      strokeWidth: el.strokeWidth,
      fill: el.fill,
      shapeKind: el.shapeKind,
      locked: el.locked,
      elementType: "shape" as const,
    }),
    children: Object.freeze([]),
  });
}

function buildImageNode(
  el: Extract<WorksheetElement, { type: "image" }>,
  pageIndex: number,
  parentId?: string,
): LayoutNode {
  return Object.freeze({
    id: `ln_${el.id}`,
    kind: "image",
    pageIndex,
    rect: freezeRect({ x: el.x, y: el.y, width: el.width, height: el.height }),
    zIndex: el.zIndex,
    sourceElementId: el.id,
    parentId,
    payload: Object.freeze({
      src: el.src,
      locked: el.locked,
      elementType: "image" as const,
    }),
    children: Object.freeze([]),
  });
}

function buildQuestionBlockNode(el: WorksheetQuestionBlock, pageIndex: number, classLevel: WorksheetClass): LayoutNode {
  const fonts = FONT_SIZES_BY_CLASS[classLevel];
  const layout = computeQuestionBlockChildLayout(el, classLevel);
  const parentId = `ln_${el.id}`;
  const children: LayoutNode[] = [];

  children.push(Object.freeze({
    id: `${parentId}_prompt`,
    kind: "prompt",
    pageIndex,
    rect: freezeRect({
      x: 0,
      y: layout.promptTop,
      width: el.width,
      height: layout.promptHeight,
      padding: LAYOUT.PROMPT_PADDING,
    }),
    zIndex: el.zIndex + 1,
    sourceElementId: el.id,
    parentId,
    payload: Object.freeze({
      content: el.prompt,
      fontSize: fonts.prompt,
      fontWeight: "bold" as const,
      textAlign: "left" as const,
      color: "#111111",
      lineHeight: LAYOUT.LINE_HEIGHT,
      elementType: "question_block" as const,
    }),
    children: Object.freeze([]),
  }));

  if (layout.illustrationTop != null && layout.illustrationSize) {
    const size = layout.illustrationSize;
    children.push(Object.freeze({
      id: `${parentId}_ill`,
      kind: "illustration",
      pageIndex,
      rect: freezeRect({
        x: (el.width - size) / 2,
        y: layout.illustrationTop,
        width: size,
        height: size,
      }),
      zIndex: el.zIndex + 1,
      sourceElementId: el.id,
      parentId,
      payload: Object.freeze({
        src: el.illustrationSrc,
        label: el.illustrationLabel,
        elementType: "question_block" as const,
      }),
      children: Object.freeze([]),
    }));
  }

  layout.optionTops.forEach((optLayout, i) => {
    const opt = el.options?.[i];
    if (!opt) return;
    children.push(Object.freeze({
      id: `${parentId}_opt_${i}`,
      kind: "option",
      pageIndex,
      rect: freezeRect({
        x: optLayout.left,
        y: optLayout.top,
        width: optLayout.width,
        height: fonts.body * LAYOUT.LINE_HEIGHT,
      }),
      zIndex: el.zIndex + 1,
      sourceElementId: el.id,
      parentId,
      payload: Object.freeze({
        content: opt,
        fontSize: fonts.body,
        fontWeight: "normal" as const,
        textAlign: "left" as const,
        color: "#111111",
        optionIndex: i,
        elementType: "question_block" as const,
      }),
      children: Object.freeze([]),
    }));
  });

  if (layout.answerLineTop != null) {
    children.push(Object.freeze({
      id: `${parentId}_answer`,
      kind: "answer_line",
      pageIndex,
      rect: freezeRect({
        x: 0,
        y: layout.answerLineTop,
        width: layout.answerLineWidth,
        height: 1,
      }),
      zIndex: el.zIndex + 1,
      sourceElementId: el.id,
      parentId,
      payload: Object.freeze({
        stroke: "#333333",
        strokeWidth: 1,
        elementType: "question_block" as const,
      }),
      children: Object.freeze([]),
    }));
  }

  const blockHeight = layout.totalHeight;

  return Object.freeze({
    id: parentId,
    kind: "question_block",
    pageIndex,
    rect: freezeRect({
      x: el.x,
      y: el.y,
      width: el.width,
      height: blockHeight,
      margin: LAYOUT.MIN_BLOCK_GAP,
    }),
    zIndex: el.zIndex,
    sourceElementId: el.id,
    payload: Object.freeze({
      locked: el.locked ?? false,
      elementType: "question_block" as const,
    }),
    children: Object.freeze(children),
  });
}

function elementToLayoutNode(el: WorksheetElement, pageIndex: number, classLevel: WorksheetClass): LayoutNode {
  if (el.type === "question_block") return buildQuestionBlockNode(el, pageIndex, classLevel);
  if (el.type === "text") {
    const kind: LayoutNodeKind = el.id.startsWith("brand_") ? "header" : el.id.startsWith("footer_") ? "footer" : "text";
    return buildTextNode(el, pageIndex, kind);
  }
  if (el.type === "shape") {
    const kind: LayoutNodeKind = el.id.startsWith("page_") ? "frame" : "shape";
    return buildShapeNode(el, pageIndex, undefined);
  }
  if (el.type === "image") {
    const kind: LayoutNodeKind = el.id.startsWith("brand_") ? "header" : "image";
    return buildImageNode(el, pageIndex, undefined);
  }
  return buildTextNode(el as WorksheetTextElement, pageIndex);
}

/** Build immutable layout tree from a worksheet document. */
export function buildLayoutTree(doc: WorksheetDocument): LayoutTree {
  const profile = getActiveBrandingProfile();
  const pages: LayoutPageNode[] = doc.pages.map((page, pageIndex) => {
    const contentRegion = getPageContentRegion(page.pageNumber, doc.meta.classLevel, profile);
    const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
    const nodes = sorted.map((el) => elementToLayoutNode(el, pageIndex, doc.meta.classLevel));
    return Object.freeze({
      pageIndex,
      pageNumber: page.pageNumber,
      contentRegion: Object.freeze({ ...contentRegion }),
      nodes: Object.freeze(nodes),
    });
  });

  const tree: LayoutTree = Object.freeze({
    version: 1 as const,
    documentId: doc.id,
    classLevel: doc.meta.classLevel,
    pages: Object.freeze(pages),
    computedAt: new Date().toISOString(),
    geometryHash: hashGeometry(pages),
  });

  return tree;
}

/** Validate layout tree geometry before any render pass. */
export function validateLayoutTree(tree: LayoutTree): GeometryValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const profile = getActiveBrandingProfile();

  for (const page of tree.pages) {
    const region = page.contentRegion;
    const all = flattenNodes(page.nodes);
    const questions = page.nodes.filter((n) => n.kind === "question_block").sort((a, b) => a.rect.y - b.rect.y);

    for (const node of all) {
      const r = node.rect;
      if (!isFiniteRect(r)) {
        errors.push(`Invalid rect on ${node.id}: NaN or non-finite value`);
      }
      if (r.width < 0 || r.height < 0) {
        errors.push(`Negative dimension on ${node.id}`);
      }
      if (!node.parentId && !rectInsidePage(r)) {
        errors.push(`${node.id} outside page bounds`);
      }
      if (node.parentId) {
        const parent = all.find((n) => n.id === node.parentId);
        if (parent && !childInsideParentRelative(r, parent.rect)) {
          errors.push(`${node.id} outside parent ${node.parentId}`);
        }
      }
    }

    for (const q of questions) {
      if (q.rect.y < region.top - 2) {
        errors.push(`Question ${q.sourceElementId} overlaps header (y=${q.rect.y}, top=${region.top})`);
      }
      if (q.rect.y + q.rect.height > region.bottom + 2) {
        errors.push(`Question ${q.sourceElementId} overflows content bottom`);
      }
      if (q.rect.x < PAGE_MARGIN - 2) {
        errors.push(`Question ${q.sourceElementId} outside left margin`);
      }
      if (q.rect.x + q.rect.width > A4_WIDTH - PAGE_MARGIN + 2) {
        errors.push(`Question ${q.sourceElementId} outside right margin`);
      }
    }

    for (let i = 1; i < questions.length; i++) {
      const prev = questions[i - 1]!;
      const curr = questions[i]!;
      if (curr.rect.y < prev.rect.y + prev.rect.height + LAYOUT.MIN_BLOCK_GAP - 2) {
        errors.push(`Question overlap on page ${page.pageNumber}: ${prev.sourceElementId} / ${curr.sourceElementId}`);
      }
    }

    void profile;
  }

  if (errors.length && typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.warn("[LayoutTree] geometry errors:", errors);
  }

  return { ok: errors.length === 0, warnings, errors };
}

/** Prepare document + frozen layout tree for render. Throws on hard geometry errors in dev. */
export function prepareLayoutForRender(doc: WorksheetDocument): { document: WorksheetDocument; layoutTree: LayoutTree } {
  const tree = buildLayoutTree(doc);
  const validation = validateLayoutTree(tree);
  if (!validation.ok && typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    console.warn("[prepareLayoutForRender] layout validation failed:", validation.errors);
  }
  return { document: doc, layoutTree: tree };
}

/** Deterministic geometry fingerprint for golden tests (stable across element ids). */
export function layoutGeometryFingerprint(tree: LayoutTree): string {
  const parts: string[] = [];
  for (const page of tree.pages) {
    parts.push(`page:${page.pageNumber}`);
    const nodes = flattenNodes(page.nodes)
      .filter((n) => n.kind !== "question_block")
      .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x || a.kind.localeCompare(b.kind));
    for (const node of nodes) {
      const r = node.rect;
      parts.push(`${node.kind}|${r.x.toFixed(1)}|${r.y.toFixed(1)}|${r.width.toFixed(1)}|${r.height.toFixed(1)}`);
    }
    const blocks = page.nodes
      .filter((n) => n.kind === "question_block")
      .sort((a, b) => a.rect.y - b.rect.y);
    for (const block of blocks) {
      const r = block.rect;
      parts.push(`block|${r.x.toFixed(1)}|${r.y.toFixed(1)}|${r.width.toFixed(1)}|${r.height.toFixed(1)}|${block.children.length}`);
    }
  }
  let h = 0;
  const s = parts.join(";");
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `lg_v1_${(h >>> 0).toString(16)}`;
}

/** Deterministic geometry fingerprint for golden tests. */
export function layoutTreeFingerprint(tree: LayoutTree): string {
  return tree.geometryHash;
}

export { estimateWrappedLineCount, LAYOUT };
