import type { WorksheetDocument } from "./types.js";
import { FONT_SIZES_BY_CLASS } from "./constants.js";
import { detectIllustrationFromText, getIllustration } from "./illustration-engine.js";

export type PrintMode =
  | "colour"
  | "bw"
  | "low_ink"
  | "eco"
  | "large_font"
  | "high_contrast";

export const PRINT_MODE_LABELS: Record<PrintMode, string> = {
  colour: "Colour",
  bw: "Black & White",
  low_ink: "Low Ink",
  eco: "Eco Print",
  large_font: "Large Font",
  high_contrast: "High Contrast",
};

export function applyPrintMode(doc: WorksheetDocument, mode: PrintMode): WorksheetDocument {
  const out = structuredClone(doc);
  out.meta.updatedAt = new Date().toISOString();

  switch (mode) {
    case "colour":
      out.meta.colorMode = "color";
      break;
    case "bw":
    case "low_ink":
    case "eco":
      out.meta.colorMode = "bw";
      break;
    case "large_font":
      out.meta.colorMode = doc.meta.colorMode;
      break;
    case "high_contrast":
      out.meta.colorMode = "bw";
      break;
  }

  const fontBoost = mode === "large_font" ? 1.2 : 1;
  const fonts = FONT_SIZES_BY_CLASS[out.meta.classLevel];

  for (const page of out.pages) {
    for (const el of page.elements) {
      if (el.type === "text") {
        if (mode === "large_font") el.fontSize = Math.round(el.fontSize * fontBoost);
        if (mode === "high_contrast") {
          el.color = "#000000";
          el.fontWeight = "bold";
        }
        if (mode === "low_ink" || mode === "eco") el.color = "#222222";
      }
      if (el.type === "question_block") {
        if (mode === "large_font") el.height = Math.round(el.height * 1.1);
        if (mode === "bw" || mode === "low_ink" || mode === "eco" || mode === "high_contrast") {
          if (el.illustrationSrc) {
            const kind = detectIllustrationFromText(el.illustrationLabel ?? el.prompt);
            el.illustrationSrc = getIllustration(kind);
          }
        }
      }
      if (el.type === "image") {
        el.outlineOnly = mode !== "colour";
        if (mode === "eco") (el as { opacity?: number }).opacity = 0.85;
        if (mode === "low_ink") (el as { opacity?: number }).opacity = 0.9;
      }
      if (el.type === "shape" && (mode === "low_ink" || mode === "eco")) {
        if (el.fill !== "transparent") el.fill = "#f5f5f5";
        el.stroke = "#333333";
      }
    }
  }

  void fonts;
  return out;
}
