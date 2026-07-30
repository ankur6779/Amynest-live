/**
 * Server-generated Birth Sky PDF (pdf-lib) — not browser print / HTML download.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AstronomyData } from "./ephemeris-port.js";
import {
  attachChartDetails,
  buildChartDetails,
  type HouseDetail,
  type PlanetDetail,
  VEDIC_GRAHAS,
} from "./chart-details.js";

export const BIRTH_SKY_PDF_MANIFEST_VERSION = "birth_sky_pdf/1.0.0" as const;

export type BirthSkyPdfInput = {
  childFirstName: string;
  birthDate: string;
  birthTime: string | null;
  timePrecision: string;
  placeLabel: string | null;
  snapshotId: string;
  snapshotVersion: string;
  engineVersion: string;
  mode: string;
  astronomy: AstronomyData;
  generatedAt?: string;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const GOLD = rgb(0.78, 0.62, 0.28);
const INK = rgb(0.12, 0.1, 0.18);
const MUTED = rgb(0.35, 0.32, 0.4);
const RULE = rgb(0.85, 0.78, 0.55);

type DrawCtx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
};

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function ensureSpace(ctx: DrawCtx, need: number) {
  if (ctx.y < MARGIN + need) {
    ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN;
  }
}

function drawText(
  ctx: DrawCtx,
  text: string,
  size: number,
  opts?: { bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number },
) {
  const font = opts?.bold ? ctx.bold : ctx.font;
  const color = opts?.color ?? INK;
  const x = MARGIN + (opts?.indent ?? 0);
  const maxW = PAGE_W - MARGIN * 2 - (opts?.indent ?? 0);
  for (const line of wrap(text, font, size, maxW)) {
    ensureSpace(ctx, size + 4);
    ctx.page.drawText(line, { x, y: ctx.y, size, font, color });
    ctx.y -= size + 4;
  }
}

function drawRule(ctx: DrawCtx) {
  ensureSpace(ctx, 12);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.8,
    color: RULE,
  });
  ctx.y -= 14;
}

function drawSection(ctx: DrawCtx, title: string) {
  ctx.y -= 6;
  drawText(ctx, title, 13, { bold: true, color: GOLD });
  drawRule(ctx);
}

/** Simple North-Indian diamond sketch with graha abbreviations in houses. */
function drawKundli(ctx: DrawCtx, planets: PlanetDetail[]) {
  ensureSpace(ctx, 220);
  const cx = PAGE_W / 2;
  const cy = ctx.y - 100;
  const s = 90;
  const page = ctx.page;

  const diamond = (size: number) => {
    page.drawLine({ start: { x: cx, y: cy + size }, end: { x: cx + size, y: cy }, thickness: 1, color: GOLD });
    page.drawLine({ start: { x: cx + size, y: cy }, end: { x: cx, y: cy - size }, thickness: 1, color: GOLD });
    page.drawLine({ start: { x: cx, y: cy - size }, end: { x: cx - size, y: cy }, thickness: 1, color: GOLD });
    page.drawLine({ start: { x: cx - size, y: cy }, end: { x: cx, y: cy + size }, thickness: 1, color: GOLD });
  };
  diamond(s);
  diamond(s * 0.55);
  page.drawLine({ start: { x: cx, y: cy + s }, end: { x: cx, y: cy - s }, thickness: 0.6, color: GOLD });
  page.drawLine({ start: { x: cx - s, y: cy }, end: { x: cx + s, y: cy }, thickness: 0.6, color: GOLD });

  const centers: Record<number, { x: number; y: number }> = {
    1: { x: cx, y: cy + s * 0.72 },
    2: { x: cx + s * 0.45, y: cy + s * 0.45 },
    3: { x: cx + s * 0.72, y: cy },
    4: { x: cx + s * 0.45, y: cy - s * 0.45 },
    5: { x: cx, y: cy - s * 0.72 },
    6: { x: cx - s * 0.45, y: cy - s * 0.45 },
    7: { x: cx - s * 0.72, y: cy },
    8: { x: cx - s * 0.45, y: cy + s * 0.45 },
    9: { x: cx, y: cy + s * 0.28 },
    10: { x: cx + s * 0.28, y: cy },
    11: { x: cx, y: cy - s * 0.28 },
    12: { x: cx - s * 0.28, y: cy },
  };

  const byHouse = new Map<number, string[]>();
  for (const p of planets) {
    if (p.house == null) continue;
    const abbr = p.label.slice(0, 2);
    const list = byHouse.get(p.house) ?? [];
    list.push(abbr);
    byHouse.set(p.house, list);
  }
  for (let h = 1; h <= 12; h++) {
    const c = centers[h]!;
    const labels = byHouse.get(h) ?? [];
    page.drawText(String(h), {
      x: c.x - 3,
      y: c.y + 8,
      size: 7,
      font: ctx.font,
      color: MUTED,
    });
    if (labels.length) {
      page.drawText(labels.join(" "), {
        x: c.x - Math.min(24, labels.length * 7),
        y: c.y - 4,
        size: 8,
        font: ctx.bold,
        color: INK,
      });
    }
  }
  ctx.y = cy - s - 24;
}

export async function generateBirthSkyPdf(input: BirthSkyPdfInput): Promise<{
  bytes: Uint8Array;
  fileName: string;
  chartDetailsVersion: string;
}> {
  const astronomy = input.astronomy.houseDetails
    ? input.astronomy
    : attachChartDetails(input.astronomy);
  const details = buildChartDetails(astronomy);
  if (!details.completeness.canExportPdf) {
    throw new Error(
      `pdf_chart_incomplete:${details.completeness.status}:${details.completeness.reasons.join(",")}`,
    );
  }

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const ctx: DrawCtx = { doc, page, font, bold, y: PAGE_H - MARGIN };
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  drawText(ctx, "AmyNest · Amy Astro Intelligence", 11, { bold: true, color: GOLD });
  drawText(ctx, `${input.childFirstName}'s Birth Sky Chart`, 20, { bold: true });
  drawText(ctx, "Professional Vedic birth chart keepsake — reflective, never predictive.", 9, {
    color: MUTED,
  });
  drawRule(ctx);

  drawSection(ctx, "Birth details");
  drawText(ctx, `Child: ${input.childFirstName}`, 10);
  drawText(ctx, `Birth date: ${input.birthDate}`, 10);
  drawText(ctx, `Birth time: ${input.birthTime ?? "—"} (${input.timePrecision})`, 10);
  drawText(ctx, `Birth place: ${input.placeLabel ?? "—"}`, 10);
  drawText(ctx, `Chart mode: ${input.mode}`, 10);

  drawSection(ctx, "Astronomy summary");
  drawText(ctx, `Sun sign: ${astronomy.sunSign}`, 10);
  drawText(ctx, `Moon sign: ${astronomy.moonSign}`, 10);
  drawText(ctx, `Rising / Lagna: ${details.lagna.sign ?? "—"}`, 10);
  drawText(ctx, `Moon phase: ${astronomy.moonPhaseLabel}`, 10);
  if (astronomy.nakshatra?.name) {
    drawText(
      ctx,
      `Moon nakshatra: ${astronomy.nakshatra.name} (pada ${astronomy.nakshatra.pada}, lord ${astronomy.nakshatra.lord})`,
      10,
    );
  }
  if (astronomy.dasha?.mahadasha) {
    drawText(
      ctx,
      `Vimshottari: ${astronomy.dasha.mahadasha.lord} mahadasha / ${astronomy.dasha.antardasha?.lord ?? "—"} antardasha`,
      10,
    );
  }

  drawSection(ctx, "North Indian Kundli");
  drawKundli(ctx, details.planetDetails);

  drawSection(ctx, "Planet table");
  for (const id of VEDIC_GRAHAS) {
    const p = details.planetDetails.find((x) => x.id === id);
    if (!p) continue;
    const flags = [
      p.retrograde ? "R" : null,
      p.combust ? "combust" : null,
      p.nakshatra ? `${p.nakshatra} p${p.pada}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    drawText(
      ctx,
      `${p.label}: ${p.sign} · House ${p.house ?? "—"} · ${p.degreeInSign?.toFixed(1) ?? "—"}°${flags ? ` · ${flags}` : ""}`,
      9,
    );
  }

  drawSection(ctx, "House table");
  for (const h of details.houseDetails as HouseDetail[]) {
    const occupants = h.planets.length
      ? h.planets.map((pid) => details.planetDetails.find((p) => p.id === pid)?.label ?? pid).join(", ")
      : "empty";
    drawText(
      ctx,
      `H${h.house} ${h.name} (${h.sanskrit}) — ${h.sign}, lord ${h.lord}; planets: ${occupants}`,
      9,
    );
  }

  drawSection(ctx, "House insights");
  for (const h of details.houseDetails.slice(0, 12)) {
    drawText(ctx, `House ${h.house} — ${h.name}`, 10, { bold: true });
    drawText(ctx, h.aiInterpretation, 9);
    drawText(ctx, `Strengths: ${h.strengths}`, 8, { color: MUTED });
    drawText(ctx, `Challenges: ${h.challenges}`, 8, { color: MUTED });
    ctx.y -= 4;
  }

  drawSection(ctx, "Parenting guidance");
  for (const p of details.planetDetails as PlanetDetail[]) {
    drawText(ctx, `${p.label}: ${p.parentingInterpretation}`, 9);
  }
  const guidance = (
    astronomy.meaningSnapshot as
      | { parentingGuidance?: Array<{ label: string }> }
      | null
      | undefined
  )?.parentingGuidance;
  if (Array.isArray(guidance) && guidance.length) {
    ctx.y -= 4;
    drawText(ctx, "Meaning Engine themes", 10, { bold: true });
    for (const g of guidance.slice(0, 8)) {
      drawText(ctx, `• ${g.label}`, 9);
    }
  }

  drawSection(ctx, "Document metadata");
  drawText(ctx, `Generated: ${generatedAt}`, 8, { color: MUTED });
  drawText(ctx, `PDF manifest: ${BIRTH_SKY_PDF_MANIFEST_VERSION}`, 8, { color: MUTED });
  drawText(ctx, `Chart details: ${details.chartDetailsVersion}`, 8, { color: MUTED });
  drawText(ctx, `Snapshot: ${input.snapshotVersion}`, 8, { color: MUTED });
  drawText(ctx, `Engine: ${input.engineVersion}`, 8, { color: MUTED });
  drawText(ctx, `Snapshot id: ${input.snapshotId}`, 8, { color: MUTED });
  drawText(
    ctx,
    "Birth Sky is reflective and optional — not a scientific prediction about a child's future.",
    8,
    { color: MUTED },
  );

  const bytes = await doc.save();
  const safeName = input.childFirstName.replace(/[^\w.-]+/g, "_").slice(0, 40) || "child";
  const fileName = `AmyNest_BirthSky_${safeName}_${input.birthDate}.pdf`;
  return {
    bytes: Uint8Array.from(bytes),
    fileName,
    chartDetailsVersion: details.chartDetailsVersion,
  };
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}
