/**
 * Infant weekly & milestone share cards — canvas rendering + mobile export helpers.
 */

export type WeeklyShareCardData = {
  childFirstName: string;
  weekEndingDate: string;
  sleepScore: number;
  feedCount: number;
  growthStatus: string;
  vaccineStatus: string;
  newMilestones: string[];
  amyMessage: string;
};

export type MilestoneShareCardData = {
  childFirstName: string;
  milestoneTitle: string;
  milestoneEmoji: string;
  amyMessage: string;
};

export type ShareCardExportMethod = "save_image" | "whatsapp" | "system_share" | "pdf";

export type DoctorReportPayload = {
  child?: { ageMonths?: number };
  sleep?: { sessionsLast7Days?: number; totalSleepHours?: number };
  feeding?: { logsLast7Days?: number };
  growth?: Array<{ measuredAt?: string }>;
  vaccines?: { pending?: number; missed?: number; done?: number };
  milestones?: { recentAchieved?: string[] };
};

const CARD_W = 1080;
const CARD_H = 1350;

const AMY_WEEKLY_MESSAGES = [
  "Great progress this week.",
  "You're doing an amazing job — every day counts.",
  "Small steps, big growth. Keep it up!",
  "This week shows real care and consistency.",
  "Beautiful week of milestones and moments.",
];

const AMY_MILESTONE_MESSAGES = [
  "What a wonderful moment to celebrate!",
  "Every milestone is a memory in the making.",
  "Share this joy with the people who love your little one.",
];

/** End of current ISO week (Sunday) formatted for the card header. */
export function getWeekEndingDateLabel(now = new Date()): string {
  const d = new Date(now);
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function computeWeeklySleepScore(
  sessionsLast7Days: number,
  totalSleepHours: number,
  ageMonths: number,
): number {
  const dailyTarget =
    ageMonths < 3 ? 16 : ageMonths < 6 ? 15 : ageMonths < 12 ? 14 : 13;
  const weeklyTarget = dailyTarget * 7;
  const sleepRatio = weeklyTarget > 0 ? totalSleepHours / weeklyTarget : 0;
  const sleepPts = Math.min(sleepRatio, 1.15) * 82;
  const sessionPts = Math.min(sessionsLast7Days / 14, 1) * 18;
  return Math.round(Math.min(100, Math.max(0, sleepPts + sessionPts)));
}

export function formatGrowthStatus(
  measurements: Array<{ measuredAt?: string }> | undefined,
): string {
  if (!measurements?.length) return "Add measurement";
  const latest = measurements[0]?.measuredAt;
  if (!latest) return "Logged";
  const ageMs = Date.now() - new Date(latest).getTime();
  const days = ageMs / (24 * 60 * 60_000);
  if (days <= 30) return "On Track";
  if (days <= 90) return "Logged";
  return "Update soon";
}

export function formatVaccineStatus(
  vaccines: { pending?: number; missed?: number } | undefined,
): string {
  const pending = vaccines?.pending ?? 0;
  const missed = vaccines?.missed ?? 0;
  if (pending === 0 && missed === 0) return "Up To Date";
  if (pending > 0) return `${pending} due`;
  return "Review schedule";
}

export function pickAmyWeeklyMessage(seed: number): string {
  return AMY_WEEKLY_MESSAGES[Math.abs(seed) % AMY_WEEKLY_MESSAGES.length]!;
}

export function pickAmyMilestoneMessage(seed: number): string {
  return AMY_MILESTONE_MESSAGES[Math.abs(seed) % AMY_MILESTONE_MESSAGES.length]!;
}

export function buildWeeklyShareCardData(
  childFirstName: string,
  report: DoctorReportPayload,
  milestoneTitles: string[],
  weekSeed = 0,
): WeeklyShareCardData {
  const ageMonths = report.child?.ageMonths ?? 0;
  const sleep = report.sleep ?? {};
  const feeding = report.feeding ?? {};

  return {
    childFirstName,
    weekEndingDate: getWeekEndingDateLabel(),
    sleepScore: computeWeeklySleepScore(
      sleep.sessionsLast7Days ?? 0,
      sleep.totalSleepHours ?? 0,
      ageMonths,
    ),
    feedCount: feeding.logsLast7Days ?? 0,
    growthStatus: formatGrowthStatus(report.growth),
    vaccineStatus: formatVaccineStatus(report.vaccines),
    newMilestones: milestoneTitles.slice(0, 3),
    amyMessage: pickAmyWeeklyMessage(weekSeed),
  };
}

export function buildMilestoneShareCardData(
  childFirstName: string,
  milestoneTitle: string,
  milestoneEmoji: string,
  seed = 0,
): MilestoneShareCardData {
  return {
    childFirstName,
    milestoneTitle,
    milestoneEmoji,
    amyMessage: pickAmyMilestoneMessage(seed),
  };
}

/** Milestones achieved within the last 7 days from local progress store. */
export function getWeeklyAchievedMilestoneIds(
  progress: Record<string, { state?: string; updatedAt?: number }>,
  resolveTitle: (id: string) => string,
): string[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60_000;
  return Object.entries(progress)
    .filter(([, v]) => v.state === "achieved" && (v.updatedAt ?? 0) >= cutoff)
    .sort((a, b) => (b[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0))
    .map(([id]) => resolveTitle(id));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCardBackground(ctx: CanvasRenderingContext2D): void {
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, "#1a0f2e");
  bg.addColorStop(0.45, "#2d1b4e");
  bg.addColorStop(1, "#4a2c6a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const orb1 = ctx.createRadialGradient(CARD_W * 0.5, CARD_H * 0.08, 0, CARD_W * 0.5, CARD_H * 0.08, CARD_W * 0.55);
  orb1.addColorStop(0, "rgba(251, 191, 36, 0.35)");
  orb1.addColorStop(1, "rgba(251, 191, 36, 0)");
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, CARD_W, CARD_H * 0.45);

  const orb2 = ctx.createRadialGradient(CARD_W * 0.85, CARD_H * 0.92, 0, CARD_W * 0.85, CARD_H * 0.92, CARD_W * 0.4);
  orb2.addColorStop(0, "rgba(236, 72, 153, 0.22)");
  orb2.addColorStop(1, "rgba(236, 72, 153, 0)");
  ctx.fillStyle = orb2;
  ctx.fillRect(0, CARD_H * 0.5, CARD_W, CARD_H * 0.5);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  roundRect(ctx, 48, 48, CARD_W - 96, CARD_H - 96, 48);
  ctx.stroke();
}

function drawFooter(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 28px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Powered by AmyNest", CARD_W / 2, CARD_H - 88);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, cy);
      line = words[i] + " ";
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, cy);
  return cy + lineHeight;
}

function drawStatRow(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  y: number,
): void {
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "500 34px system-ui, -apple-system, sans-serif";
  ctx.fillText(label, 120, y);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 34px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(value, CARD_W - 120, y);
}

export function renderWeeklyShareCard(data: WeeklyShareCardData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  drawCardBackground(ctx);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
  ctx.font = "700 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("WEEKLY PROGRESS", CARD_W / 2, 130);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 72px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${data.childFirstName}'s Week`, CARD_W / 2, 230);

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "500 30px system-ui, -apple-system, sans-serif";
  ctx.fillText(`Week ending ${data.weekEndingDate}`, CARD_W / 2, 285);

  roundRect(ctx, 96, 330, CARD_W - 192, 420, 32);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.stroke();

  drawStatRow(ctx, "Sleep Score", String(data.sleepScore), 410);
  drawStatRow(ctx, "Feeds Logged", String(data.feedCount), 480);
  drawStatRow(ctx, "Growth", data.growthStatus, 550);
  drawStatRow(ctx, "Vaccines", data.vaccineStatus, 620);

  let y = 820;
  if (data.newMilestones.length > 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
    ctx.font = "700 28px system-ui, -apple-system, sans-serif";
    ctx.fillText("NEW ACHIEVEMENT", CARD_W / 2, y);
    y += 52;
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px system-ui, -apple-system, sans-serif";
    ctx.fillText(data.newMilestones[0]!, CARD_W / 2, y);
    y += 40;
    if (data.newMilestones.length > 1) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "500 30px system-ui, -apple-system, sans-serif";
      ctx.fillText(`+ ${data.newMilestones.length - 1} more`, CARD_W / 2, y + 36);
      y += 72;
    }
  }

  y = Math.max(y + 40, 980);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "italic 500 38px Georgia, 'Times New Roman', serif";
  wrapText(ctx, `"${data.amyMessage}"`, CARD_W / 2, y, CARD_W - 200, 48);

  drawFooter(ctx);
  return canvas;
}

export function renderMilestoneShareCard(data: MilestoneShareCardData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  drawCardBackground(ctx);

  ctx.textAlign = "center";
  ctx.font = "120px system-ui, -apple-system, sans-serif";
  ctx.fillText(data.milestoneEmoji, CARD_W / 2, 320);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 64px system-ui, -apple-system, sans-serif";
  wrapText(
    ctx,
    `${data.childFirstName} Just Learned`,
    CARD_W / 2,
    420,
    CARD_W - 160,
    72,
  );

  ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
  ctx.font = "800 56px system-ui, -apple-system, sans-serif";
  wrapText(ctx, data.milestoneTitle, CARD_W / 2, 560, CARD_W - 160, 68);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "italic 500 36px Georgia, 'Times New Roman', serif";
  wrapText(ctx, `"${data.amyMessage}"`, CARD_W / 2, 820, CARD_W - 200, 48);

  ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
  ctx.font = "700 40px system-ui, -apple-system, sans-serif";
  ctx.fillText("🎉 Share with Family 🎉", CARD_W / 2, 980);

  drawFooter(ctx);
  return canvas;
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("blob_failed"))),
      "image/png",
      1,
    );
  });
}

export async function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await canvasToBlob(canvas);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(blob);
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildShareFilename(prefix: string, childName: string): string {
  const safe = childName.replace(/[^\w.-]+/g, "_").slice(0, 24);
  return `${prefix}-${safe}-${Date.now()}.png`;
}

export function buildShareTextWeekly(data: WeeklyShareCardData): string {
  const lines = [
    `${data.childFirstName}'s Week — AmyNest`,
    `Sleep Score: ${data.sleepScore}`,
    `Feeds Logged: ${data.feedCount}`,
    `Growth: ${data.growthStatus}`,
    `Vaccines: ${data.vaccineStatus}`,
  ];
  if (data.newMilestones[0]) {
    lines.push(`New Achievement: ${data.newMilestones[0]}`);
  }
  lines.push(`"${data.amyMessage}"`);
  return lines.join("\n");
}

export function buildShareTextMilestone(data: MilestoneShareCardData): string {
  return `${data.childFirstName} just learned: ${data.milestoneTitle} ${data.milestoneEmoji}\n${data.amyMessage}\n— AmyNest`;
}

export async function exportShareCard(
  canvas: HTMLCanvasElement,
  method: ShareCardExportMethod,
  opts: { filename: string; title: string; text: string },
): Promise<boolean> {
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], opts.filename, { type: "image/png" });

  if (method === "save_image") {
    downloadBlob(blob, opts.filename);
    return true;
  }

  if (method === "whatsapp") {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ files: [file], title: opts.title, text: opts.text });
        return true;
      } catch {
        /* fall through to wa.me text link */
      }
    }
    const url = `https://wa.me/?text=${encodeURIComponent(opts.text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    downloadBlob(blob, opts.filename);
    return true;
  }

  if (method === "system_share") {
    if (typeof navigator.share === "function") {
      try {
        const payload: ShareData = { title: opts.title, text: opts.text };
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ ...payload, files: [file] });
        } else {
          await navigator.share(payload);
        }
        return true;
      } catch {
        return false;
      }
    }
    try {
      await navigator.clipboard.writeText(opts.text);
      downloadBlob(blob, opts.filename);
      return true;
    } catch {
      return false;
    }
  }

  if (method === "pdf") {
    const dataUrl = await canvasToDataUrl(canvas);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${opts.title}</title>
<style>@page{size:portrait;margin:12mm}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}
img{max-width:100%;max-height:100vh;object-fit:contain}</style></head>
<body><img src="${dataUrl}" alt="${opts.title}"/></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return false;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    return true;
  }

  return false;
}
