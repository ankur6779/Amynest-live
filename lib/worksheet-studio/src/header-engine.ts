import {
  A4_WIDTH,
  PAGE_MARGIN,
  type WorksheetElement,
  type WorksheetMeta,
  type WorksheetTextElement,
} from "./types.js";
import { CLASS_LABELS, FONT_SIZES_BY_CLASS } from "./constants.js";
import type { SchoolBrandingProfile } from "./school-branding.js";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `brand_${prefix}_${idCounter}`;
}

export function resetBrandIdCounter(): void {
  idCounter = 0;
}

function textElement(
  id: string,
  content: string,
  x: number,
  y: number,
  profile: SchoolBrandingProfile,
  opts: Partial<WorksheetTextElement> = {},
): WorksheetTextElement {
  return {
    id,
    type: "text",
    content,
    x,
    y,
    width: opts.width ?? A4_WIDTH - PAGE_MARGIN * 2,
    height: opts.height ?? 30,
    fontSize: opts.fontSize ?? 14,
    fontWeight: opts.fontWeight ?? "normal",
    textAlign: opts.textAlign ?? "left",
    color: opts.color ?? profile.colors.text,
    lineHeight: opts.lineHeight ?? 1.4,
    zIndex: opts.zIndex ?? 2,
    locked: true,
  };
}

/** Dynamic school header — page 1 only */
export function buildSchoolHeaderElements(
  meta: WorksheetMeta,
  profile: SchoolBrandingProfile,
): WorksheetElement[] {
  resetBrandIdCounter();
  const centerX = A4_WIDTH / 2;
  const fonts = FONT_SIZES_BY_CLASS[meta.classLevel];
  const elements: WorksheetElement[] = [];
  const innerW = A4_WIDTH - PAGE_MARGIN * 2;
  const c = profile.colors;

  if (profile.logoSrc) {
    elements.push({
      id: "brand_logo",
      type: "image",
      x: centerX - 36,
      y: PAGE_MARGIN + 4,
      width: 72,
      height: 72,
      src: profile.logoSrc,
      zIndex: 2,
      locked: true,
    });
  }

  let textY = PAGE_MARGIN + 82;
  elements.push(
    textElement("brand_schoolName", profile.schoolName, PAGE_MARGIN, textY, profile, {
      fontSize: fonts.title,
      fontWeight: "bold",
      textAlign: "center",
      color: c.title,
    }),
  );
  textY += fonts.title + 4;

  if (profile.tagline?.trim()) {
    elements.push(
      textElement("brand_tagline", profile.tagline, PAGE_MARGIN, textY, profile, {
        fontSize: 11,
        textAlign: "center",
        color: c.secondary,
      }),
    );
    textY += 14;
  }

  if (profile.foundation?.trim()) {
    elements.push(
      textElement("brand_foundation", profile.foundation, PAGE_MARGIN, textY, profile, {
        fontSize: 12,
        textAlign: "center",
        color: c.text,
      }),
    );
    textY += 16;
  }

  const titlePrefix = profile.classPrefix?.trim() ? `${profile.classPrefix} — ` : "";
  const titleY = Math.max(textY + 8, PAGE_MARGIN + 128);
  elements.push(
    textElement("brand_title", `${titlePrefix}Topic – ${meta.topic}`, PAGE_MARGIN, titleY, profile, {
      fontSize: fonts.prompt,
      fontWeight: "bold",
      textAlign: "center",
      color: c.title,
    }),
  );

  const showTeacher = Boolean(profile.teacherName?.trim());
  const showSession = Boolean(profile.academicSession?.trim());

  const boxY = titleY + fonts.prompt + 20;
  const boxW = (innerW - 12) / 2;
  const boxH = 26;
  const standardFields = [
    { id: "brand_name", label: "Name", row: 0, col: 0 },
    { id: "brand_class", label: "Class", row: 0, col: 1, prefilled: CLASS_LABELS[meta.classLevel] },
    { id: "brand_section", label: "Sec", row: 1, col: 0 },
    { id: "brand_date", label: "Date", row: 1, col: 1 },
  ];

  const allFields: Array<{ id: string; label: string; row: number; col: number; prefilled?: string }> = [...standardFields];
  if (showTeacher || showSession) {
    if (showTeacher) allFields.push({ id: "brand_teacher", label: "Teacher", row: 2, col: 0 });
    if (showSession) allFields.push({ id: "brand_session", label: "Session", row: 2, col: showTeacher ? 1 : 0 });
  }

  allFields.forEach(({ id, label, row, col, prefilled }) => {
    const x = PAGE_MARGIN + col * (boxW + 12);
    const y = boxY + row * (boxH + 14);
    const displayLabel = id === "brand_teacher" && profile.teacherName
      ? `Teacher : ${profile.teacherName}`
      : id === "brand_session" && profile.academicSession
        ? `Session : ${profile.academicSession}`
        : prefilled
          ? `${label} : ${prefilled}`
          : `${label} :`;
    elements.push(
      textElement(id, displayLabel, x, y, profile, {
        fontSize: 12,
        width: boxW,
        height: 16,
        fontWeight: "bold",
        color: c.text,
      }),
    );
    if (!id.includes("teacher") && !id.includes("session") && !prefilled) {
      elements.push({
        id: `${id}_box`,
        type: "shape",
        x,
        y: y + 16,
        width: boxW,
        height: boxH,
        shapeKind: "rect",
        stroke: c.border,
        strokeWidth: 1,
        fill: "transparent",
        zIndex: 1,
        locked: true,
      });
    }
  });

  if (profile.signatureSrc) {
    elements.push({
      id: "brand_signature",
      type: "image",
      x: A4_WIDTH - PAGE_MARGIN - 120,
      y: boxY + (allFields.length > 4 ? 3 : 2) * (boxH + 14) + 8,
      width: 100,
      height: 36,
      src: profile.signatureSrc,
      zIndex: 2,
      locked: true,
    });
  }

  if (profile.stampSrc) {
    elements.push({
      id: "brand_stamp",
      type: "image",
      x: PAGE_MARGIN,
      y: boxY + (allFields.length > 4 ? 3 : 2) * (boxH + 14) + 8,
      width: 48,
      height: 48,
      src: profile.stampSrc,
      zIndex: 2,
      locked: true,
    });
  }

  elements.push({
    id: "brand_header_bg",
    type: "shape",
    x: PAGE_MARGIN - 4,
    y: PAGE_MARGIN,
    width: innerW + 8,
    height: computeSchoolHeaderHeight(meta, profile) - PAGE_MARGIN,
    shapeKind: "rect",
    stroke: c.border,
    strokeWidth: 0.5,
    fill: profile.colors.headerBackground,
    zIndex: 0,
    locked: true,
  });

  return elements.sort((a, b) => a.zIndex - b.zIndex);
}

export function computeSchoolHeaderHeight(meta: WorksheetMeta, profile: SchoolBrandingProfile): number {
  const fonts = FONT_SIZES_BY_CLASS[meta.classLevel];
  let h = PAGE_MARGIN + 82 + fonts.title + 4;
  if (profile.tagline?.trim()) h += 14;
  if (profile.foundation?.trim()) h += 16;
  h += 8 + fonts.prompt + 20;
  let rows = 2;
  if (profile.teacherName?.trim()) rows += 1;
  if (profile.academicSession?.trim()) rows += profile.teacherName?.trim() ? 0 : 1;
  if (profile.teacherName?.trim() && profile.academicSession?.trim()) rows = 3;
  h += rows * (26 + 14) + 16;
  if (profile.signatureSrc || profile.stampSrc) h += 44;
  return h;
}

export function computeSchoolContentStartY(meta: WorksheetMeta, profile: SchoolBrandingProfile): number {
  return computeSchoolHeaderHeight(meta, profile) + 8;
}
