import type {
  AnimationLevel,
  BrandingPlan,
  OverlayPlanItem,
  SafeMargins,
  ScenePlan,
  TimelinePlan,
} from "../types/storyboard.js";

export function buildOverlayPlan(
  scenes: readonly ScenePlan[],
  timeline: TimelinePlan,
  branding: BrandingPlan,
  safeMargins: SafeMargins,
  animationLevel: AnimationLevel,
): OverlayPlanItem[] {
  const clipById = new Map(timeline.clips.map((c) => [c.sceneId, c]));
  const overlays: OverlayPlanItem[] = [];
  let seq = 1;

  for (const scene of scenes) {
    const clip = clipById.get(scene.sceneId);
    if (!clip) continue;
    const start = clip.sceneStart + 0.1;
    const end = Math.max(start + 0.5, clip.sceneEnd - 0.1);
    const duration = round2(end - start);

    overlays.push({
      id: `overlay-${String(seq++).padStart(3, "0")}`,
      sceneId: scene.sceneId,
      kind: scene.purpose === "cta" ? "CTA" : scene.purpose === "hook" ? "Headline" : "Subtitle",
      text: truncate(scene.caption, scene.purpose === "hook" ? 56 : 72),
      position: {
        x: 50,
        y: scene.purpose === "cta" ? 78 : 18 + safeMargins.top * 0.02,
        anchor: scene.purpose === "cta" ? "bottom-center" : "top-center",
      },
      fontSize: fontSizeFor(scene.purpose, animationLevel),
      animation: scene.purpose === "cta" ? "Pulse" : animationLevel === "expressive" ? "Slide" : "Fade",
      start: round2(start),
      end: round2(end),
      duration,
    });

    if (scene.purpose === "key-point") {
      overlays.push({
        id: `overlay-${String(seq++).padStart(3, "0")}`,
        sceneId: scene.sceneId,
        kind: "Badge",
        text: "Tip",
        position: { x: 12 + safeMargins.left * 0.05, y: 14, anchor: "top-left" },
        fontSize: 22,
        animation: "Scale",
        start: round2(start),
        end: round2(Math.min(end, start + 1.2)),
        duration: round2(Math.min(duration, 1.2)),
      });
    }

    if (scene.purpose === "cta" || scene.purpose === "brand-end") {
      overlays.push({
        id: `overlay-${String(seq++).padStart(3, "0")}`,
        sceneId: scene.sceneId,
        kind: "Logo",
        text: branding.channelName,
        position: { x: 50, y: 42, anchor: "center" },
        fontSize: 28,
        animation: "Fade",
        start: round2(start),
        end: round2(end),
        duration,
      });
      overlays.push({
        id: `overlay-${String(seq++).padStart(3, "0")}`,
        sceneId: scene.sceneId,
        kind: "Lower Third",
        text: branding.cta,
        position: { x: 50, y: 86, anchor: "bottom-center" },
        fontSize: 20,
        animation: "Slide",
        start: round2(start + 0.2),
        end: round2(end),
        duration: round2(Math.max(0.4, end - (start + 0.2))),
      });
    }
  }

  if (branding.watermark && branding.mode !== "minimal") {
    const first = timeline.clips[0];
    const last = timeline.clips[timeline.clips.length - 1];
    if (first && last) {
      overlays.push({
        id: `overlay-${String(seq++).padStart(3, "0")}`,
        sceneId: first.sceneId,
        kind: "Logo",
        text: "AmyNest",
        position: {
          x: branding.watermarkPosition === "top-right" ? 88 : 88,
          y: branding.watermarkPosition === "top-right" ? 8 : 92,
          anchor: branding.watermarkPosition === "top-right" ? "top-right" : "bottom-right",
        },
        fontSize: 16,
        animation: "Fade",
        start: first.sceneStart,
        end: last.sceneEnd,
        duration: round2(last.sceneEnd - first.sceneStart),
      });
    }
  }

  if (branding.mode === "full") {
    const ctaScene = scenes.find((s) => s.purpose === "cta") ?? scenes[scenes.length - 1]!;
    const clip = clipById.get(ctaScene.sceneId);
    if (clip) {
      overlays.push({
        id: `overlay-${String(seq++).padStart(3, "0")}`,
        sceneId: ctaScene.sceneId,
        kind: "Label",
        text: "Play Store",
        position: { x: 28, y: 70, anchor: "center" },
        fontSize: 16,
        animation: "Fade",
        start: round2(clip.sceneStart + 0.3),
        end: clip.sceneEnd,
        duration: round2(Math.max(0.4, clip.sceneEnd - (clip.sceneStart + 0.3))),
      });
      overlays.push({
        id: `overlay-${String(seq++).padStart(3, "0")}`,
        sceneId: ctaScene.sceneId,
        kind: "Progress",
        text: "QR",
        position: { x: 72, y: 70, anchor: "center" },
        fontSize: 14,
        animation: "Fade",
        start: round2(clip.sceneStart + 0.3),
        end: clip.sceneEnd,
        duration: round2(Math.max(0.4, clip.sceneEnd - (clip.sceneStart + 0.3))),
      });
    }
  }

  return overlays;
}

function fontSizeFor(purpose: ScenePlan["purpose"], level: AnimationLevel): number {
  const boost = level === "expressive" ? 4 : level === "subtle" ? -2 : 0;
  switch (purpose) {
    case "hook":
      return 42 + boost;
    case "cta":
      return 36 + boost;
    case "key-point":
      return 30 + boost;
    default:
      return 28 + boost;
  }
}

function truncate(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
