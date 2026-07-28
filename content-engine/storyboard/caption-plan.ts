import type { ContentPackage } from "../types/content-package.js";
import type {
  CaptionPlan,
  CaptionPlanItem,
  ScenePlan,
  TimelinePlan,
} from "../types/storyboard.js";

/**
 * Synchronize captions to scenes.
 * Prefer Phase 2 caption segments when available; otherwise derive from scene text.
 */
export function buildCaptionPlan(
  pkg: ContentPackage,
  scenes: readonly ScenePlan[],
  timeline: TimelinePlan,
): CaptionPlan {
  const clipById = new Map(timeline.clips.map((c) => [c.sceneId, c]));

  if (pkg.captions.length > 0) {
    return {
      items: mapPackageCaptions(pkg, scenes, timeline),
    };
  }

  const items: CaptionPlanItem[] = [];
  let seq = 1;
  for (const scene of scenes) {
    const clip = clipById.get(scene.sceneId);
    if (!clip) continue;
    items.push({
      captionId: `cap-${String(seq++).padStart(3, "0")}`,
      sceneId: scene.sceneId,
      start: clip.sceneStart,
      end: clip.sceneEnd,
      text: scene.caption,
      style:
        scene.purpose === "cta"
          ? "cta"
          : scene.purpose === "opening-question"
            ? "question"
            : scene.purpose === "hook"
              ? "emphasis"
              : "default",
      position: "bottom",
    });
  }
  return { items };
}

function mapPackageCaptions(
  pkg: ContentPackage,
  scenes: readonly ScenePlan[],
  timeline: TimelinePlan,
): CaptionPlanItem[] {
  const total = timeline.totalDuration;
  const sourceDuration = Math.max(
    pkg.estimatedDuration,
    pkg.captions[pkg.captions.length - 1]?.end ?? pkg.estimatedDuration,
    1,
  );
  const scale = total / sourceDuration;
  const items: CaptionPlanItem[] = [];

  pkg.captions.forEach((caption, index) => {
    const start = round2(caption.start * scale);
    const end = round2(Math.min(total, Math.max(start + 0.3, caption.end * scale)));
    const scene = sceneAt(scenes, timeline, (start + end) / 2) ?? scenes[Math.min(index, scenes.length - 1)]!;
    items.push({
      captionId: `cap-${String(index + 1).padStart(3, "0")}`,
      sceneId: scene.sceneId,
      start,
      end,
      text: caption.text,
      style: caption.style,
      position: caption.position,
    });
  });

  return items;
}

function sceneAt(
  scenes: readonly ScenePlan[],
  timeline: TimelinePlan,
  time: number,
): ScenePlan | undefined {
  const clip = timeline.clips.find((c) => time >= c.sceneStart && time <= c.sceneEnd);
  if (!clip) return undefined;
  return scenes.find((s) => s.sceneId === clip.sceneId);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
