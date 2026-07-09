import type { WorksheetDocument } from "../types.js";
import { downloadBlob } from "./pdf-export.js";
import { getActiveBrandingProfile } from "../school-branding.js";
import { getBrandedDocxFooterLines, getBrandedDocxHeaderLines } from "../footer-engine.js";

export async function exportWorksheetDocx(document: WorksheetDocument): Promise<void> {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle,
  } = await import("docx");

  const profile = getActiveBrandingProfile();
  const borderColor = profile.colors.border.replace("#", "");

  const headerRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Name:", bold: true })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "________________" })], width: { size: 25, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Class:", bold: true })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "________________" })], width: { size: 25, type: WidthType.PERCENTAGE } }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Section:", bold: true })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "________________" })], width: { size: 25, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date:", bold: true })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "________________" })], width: { size: 25, type: WidthType.PERCENTAGE } }),
      ],
    }),
  ];

  const headerLines = getBrandedDocxHeaderLines(profile, document.meta.topic);
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({
      text: headerLines[0] ?? profile.schoolName,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
  ];

  if (headerLines[1]) {
    children.push(new Paragraph({ text: headerLines[1], alignment: AlignmentType.CENTER, spacing: { after: 80 } }));
  }
  if (headerLines[2]) {
    children.push(new Paragraph({ text: headerLines[2], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
  }
  children.push(
    new Paragraph({ text: headerLines[3] ?? `Topic – ${document.meta.topic}`, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
        left: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
        right: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
      },
      rows: headerRows,
    }),
    new Paragraph({ text: "", spacing: { after: 300 } }),
  );

  let headerDone = false;
  const totalPages = document.pages.length;
  for (const page of document.pages) {
    if (page.pageNumber > 1) {
      children.push(new Paragraph({ text: "", pageBreakBefore: true }));
    }
    for (const el of page.elements) {
      if (el.type === "question_block") {
        if (!headerDone && page.pageNumber === 1) headerDone = true;
        children.push(new Paragraph({
          children: [new TextRun({ text: el.prompt, bold: true, size: 24 })],
          spacing: { before: 200, after: 160 },
        }));
        if (el.illustrationEmoji || el.illustrationLabel) {
          children.push(new Paragraph({
            text: el.illustrationLabel ?? el.illustrationEmoji ?? "",
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
          }));
        }
        if (el.options?.length) {
          children.push(new Paragraph({ text: el.options.join("     "), spacing: { after: 160 } }));
        }
        if (el.answerLine) {
          children.push(new Paragraph({ text: "Answer: ________________________________", spacing: { after: 280 } }));
        }
      } else if (el.type === "text" && !el.locked) {
        children.push(new Paragraph({ text: el.content, spacing: { after: 120 } }));
      }
    }
    const footerLines = getBrandedDocxFooterLines(profile, page.pageNumber, totalPages);
    for (const line of footerLines) {
      children.push(new Paragraph({ text: line, alignment: AlignmentType.CENTER, spacing: { before: 200 } }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const safeName = document.meta.topic.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "worksheet";
  const schoolSlug = profile.schoolName.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 20) || "school";
  await downloadBlob(blob, `${schoolSlug}-${safeName}.docx`);
}
