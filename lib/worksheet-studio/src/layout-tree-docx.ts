/**
 * DOCX export — content order derived from immutable layout tree only.
 */
import type { LayoutNode, LayoutTree } from "./layout-tree.js";
import { flattenNodes, getAbsoluteRect } from "./layout-tree.js";
import type { WorksheetDocument } from "./types.js";
import { prepareLayoutForRender } from "./layout-tree.js";

type DocxParagraph = import("docx").Paragraph;

function collectRenderableNodes(pageNodes: readonly LayoutNode[]): LayoutNode[] {
  const out: LayoutNode[] = [];
  for (const node of pageNodes) {
    if (node.kind === "question_block") {
      for (const child of node.children) {
        out.push({ ...child, rect: getAbsoluteRect(child, node.rect) });
      }
    } else if (!node.parentId && node.kind !== "header" && node.kind !== "footer" && node.kind !== "frame") {
      out.push(node);
    }
  }
  return out.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
}

function nodeToParagraph(
  node: LayoutNode,
  Paragraph: typeof import("docx").Paragraph,
  TextRun: typeof import("docx").TextRun,
  AlignmentType: typeof import("docx").AlignmentType,
): DocxParagraph | null {
  const p = node.payload;
  switch (node.kind) {
    case "prompt":
      return new Paragraph({
        children: [new TextRun({ text: p.content ?? "", bold: true, size: 24 })],
        spacing: { before: 160, after: 120 },
      });
    case "option":
      return new Paragraph({
        children: [new TextRun({ text: p.content ?? "", size: 22 })],
        spacing: { after: 80 },
      });
    case "illustration":
      if (p.emoji || p.label) {
        return new Paragraph({
          text: p.emoji ?? p.label ?? "",
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        });
      }
      return null;
    case "answer_line":
      return new Paragraph({
        text: "Answer: ________________________________",
        spacing: { after: 200 },
      });
    case "text":
    case "header":
    case "footer":
      if (!p.content || p.locked) return null;
      return new Paragraph({
        text: p.content,
        alignment: p.textAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 120 },
      });
    default:
      return null;
  }
}

/** Build DOCX paragraph children from layout tree page content. */
export function buildDocxParagraphsFromLayoutTree(
  tree: LayoutTree,
  docx: typeof import("docx"),
): DocxParagraph[] {
  const { Paragraph, TextRun, AlignmentType } = docx;
  const children: DocxParagraph[] = [];

  for (const page of tree.pages) {
    if (page.pageNumber > 1) {
      children.push(new Paragraph({ text: "", pageBreakBefore: true }));
    }
    for (const node of collectRenderableNodes(page.nodes)) {
      const para = nodeToParagraph(node, Paragraph, TextRun, AlignmentType);
      if (para) children.push(para);
    }
  }

  return children;
}

export async function buildDocxFromLayoutTree(document: WorksheetDocument): Promise<InstanceType<typeof import("docx").Document>> {
  const { Document } = await import("docx");
  const { layoutTree } = prepareLayoutForRender(document);
  const children = buildDocxParagraphsFromLayoutTree(layoutTree, await import("docx"));
  return new Document({ sections: [{ children }] });
}
