import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { StoryboardPackage } from "../../types/storyboard.js";
import type { SubtitleCue, SubtitleMode, SubtitlePlan } from "../../types/render-package.js";

export function buildSubtitlePlan(
  storyboard: StoryboardPackage,
  mode: SubtitleMode,
): SubtitlePlan {
  const cues: SubtitleCue[] = storyboard.captionPlan.items.map((item, index) => ({
    index: index + 1,
    startSeconds: item.start,
    endSeconds: item.end,
    text: wrapSubtitle(item.text, 42),
    sceneId: item.sceneId,
  }));

  return {
    mode,
    cues,
    safeMargins: {
      top: storyboard.branding.mode === "full" ? 120 : 80,
      right: 64,
      bottom: 180,
      left: 64,
    },
  };
}

export function writeSubtitleFiles(
  plan: SubtitlePlan,
  outputDirectory: string,
  basename: string,
): { srtPath?: string; assPath?: string } {
  mkdirSync(outputDirectory, { recursive: true });
  const artifacts: { srtPath?: string; assPath?: string } = {};

  if (plan.mode === "srt" || plan.mode === "burned-in" || plan.mode === "ass") {
    const srtPath = join(outputDirectory, `${basename}.srt`);
    writeFileSync(srtPath, toSrt(plan.cues), "utf8");
    artifacts.srtPath = srtPath;
  }

  if (plan.mode === "ass" || plan.mode === "burned-in") {
    const assPath = join(outputDirectory, `${basename}.ass`);
    writeFileSync(assPath, toAss(plan), "utf8");
    artifacts.assPath = assPath;
  }

  return artifacts;
}

export function toSrt(cues: readonly SubtitleCue[]): string {
  return cues
    .map((cue) => {
      return [
        String(cue.index),
        `${formatSrtTime(cue.startSeconds)} --> ${formatSrtTime(cue.endSeconds)}`,
        cue.text,
        "",
      ].join("\n");
    })
    .join("\n");
}

export function toAss(plan: SubtitlePlan): string {
  const marginV = plan.safeMargins.bottom;
  const marginL = plan.safeMargins.left;
  const marginR = plan.safeMargins.right;
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Source Sans 3,48,&H00F0F8FF,&H000000FF,&H0014283A,&H64000000,0,0,0,0,100,100,0,0,1,3,1,2,${marginL},${marginR},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events = plan.cues
    .map(
      (cue) =>
        `Dialogue: 0,${formatAssTime(cue.startSeconds)},${formatAssTime(cue.endSeconds)},Default,,0,0,0,,${escapeAss(cue.text)}`,
    )
    .join("\n");
  return `${header}${events}\n`;
}

export function wrapSubtitle(text: string, maxChars: number): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2).join("\n");
}

function formatSrtTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const frac = ms % 1000;
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(frac, 3)}`;
}

function formatAssTime(seconds: number): string {
  const cs = Math.max(0, Math.round(seconds * 100));
  const h = Math.floor(cs / 360_000);
  const m = Math.floor((cs % 360_000) / 6_000);
  const s = Math.floor((cs % 6_000) / 100);
  const frac = cs % 100;
  return `${h}:${pad(m, 2)}:${pad(s, 2)}.${pad(frac, 2)}`;
}

function escapeAss(text: string): string {
  return text.replace(/\n/g, "\\N").replace(/[{}]/g, "");
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

export function ensureDirFor(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}
