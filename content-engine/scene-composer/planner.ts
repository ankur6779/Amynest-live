/**
 * Scene Planner — break an approved script into provider-aware cinematic scenes.
 * Never hardcodes scene count; adapts to max clip duration automatically.
 */

import type { ContentPackage } from "../types/content-package.js";
import type { SupportedDuration } from "../types/storyboard.js";
import { snapClipDuration } from "./providers.js";
import type {
  ComposerBeatRole,
  ComposerSceneIntent,
  VideoProviderCapabilities,
} from "./types.js";
import type { BrandCharacterId } from "../brand/types.js";
import { selectBrandCharacters } from "../brand/characters.js";

export interface ScriptBeats {
  hook: string;
  problem: string;
  emotion: string;
  feature: string;
  transformation: string;
  cta: string;
}

export function extractScriptBeats(pkg: ContentPackage): ScriptBeats {
  const keyPoint = pkg.keyPoints[0] ?? pkg.story.slice(0, 120);
  return {
    hook: pkg.hook || pkg.openingQuestion || pkg.title,
    problem: pkg.openingQuestion || pkg.story.split(/[.!?]/)[0] || pkg.story,
    emotion: pkg.story,
    feature: keyPoint,
    transformation: pkg.keyPoints.slice(0, 2).join(" ") || pkg.story,
    cta: pkg.cta,
  };
}

/**
 * Plan logical beat roles for a Short, then split any beat that exceeds
 * the provider's max clip duration into multiple generation scenes.
 */
export function planComposerIntents(input: {
  beats: ScriptBeats;
  totalDuration: SupportedDuration;
  provider: VideoProviderCapabilities;
  category: string;
  title: string;
  keywords: string[];
}): ComposerSceneIntent[] {
  const casting = selectBrandCharacters({
    category: input.category,
    title: input.title,
    keywords: input.keywords,
  });
  const characters: BrandCharacterId[] = [
    casting.primary,
    ...casting.supporting.slice(0, 1),
  ];

  const endCardSeconds = 2.5;
  const bodyBudget = Math.max(12, input.totalDuration - endCardSeconds);

  // Typical emotional Short spine — weights auto-scale; count is not fixed.
  const spine: Array<{
    role: ComposerBeatRole;
    weight: number;
    goal: string;
    narration: string;
    caption: string;
    emotion: ComposerSceneIntent["emotion"];
    camera: ComposerSceneIntent["camera"];
    visualType: ComposerSceneIntent["visualType"];
    purpose: ComposerSceneIntent["storyboardPurpose"];
  }> = [
    {
      role: "hook",
      weight: 2.2,
      goal: "Stop the scroll with a real parenting moment",
      narration: input.beats.hook,
      caption: truncate(input.beats.hook, 56),
      emotion: "curious",
      camera: "Push",
      visualType: "Future AI Video",
      purpose: "hook",
    },
    {
      role: "problem",
      weight: 3.2,
      goal: "Establish the emotional problem parents recognize",
      narration: input.beats.problem,
      caption: truncate(input.beats.problem, 56),
      emotion: "warm",
      camera: "Hold",
      visualType: "Future AI Video",
      purpose: "opening-question",
    },
    {
      role: "emotion",
      weight: 3.0,
      goal: "Deepen feeling before any product appears",
      narration: truncate(input.beats.emotion, 160),
      caption: "You're not alone in this.",
      emotion: "hopeful",
      camera: "Zoom In",
      visualType: "Future AI Video",
      purpose: "story",
    },
    {
      role: "feature",
      weight: 4.2,
      goal: "Introduce the real AmyNest feature as a warm guide",
      narration: input.beats.feature,
      caption: truncate(input.beats.feature, 56),
      emotion: "confident",
      camera: "Push",
      visualType: "App Screen",
      purpose: "key-point",
    },
    {
      role: "transformation",
      weight: 3.6,
      goal: "Show the parent/child transformation and hope",
      narration: input.beats.transformation,
      caption: truncate(input.beats.transformation, 56),
      emotion: "hopeful",
      camera: "Pull",
      visualType: "Future AI Video",
      purpose: "key-point",
    },
    {
      role: "cta",
      weight: 2.0,
      goal: "Soft CTA after hope — never fear",
      narration: input.beats.cta,
      caption: "Download AmyNest AI",
      emotion: "confident",
      camera: "Static",
      visualType: "Icon Animation",
      purpose: "cta",
    },
  ];

  // Keep one logical beat per role (brand Golden Master requires distinct purposes).
  // Provider max only controls whether a beat splits into multiple generation clips —
  // never drop CTA / story / opening-question by merging roles away.
  const weightSum = spine.reduce((s, b) => s + b.weight, 0);
  const intents: ComposerSceneIntent[] = [];
  let index = 0;

  for (const beat of spine) {
    const raw = (bodyBudget * beat.weight) / weightSum;
    const chunks = splitToProviderClips(raw, input.provider);
    chunks.forEach((seconds, chunkIndex) => {
      intents.push({
        index: index++,
        role: beat.role,
        goal:
          chunks.length > 1
            ? `${beat.goal} (part ${chunkIndex + 1}/${chunks.length})`
            : beat.goal,
        targetSeconds: raw / chunks.length,
        durationSeconds: seconds,
        narration: beat.narration,
        caption: beat.caption,
        emotion: beat.emotion,
        characters,
        camera: beat.camera,
        visualType: beat.visualType,
        // Preserve brand purpose on every chunk of a split beat
        storyboardPurpose: beat.purpose,
      });
    });
  }

  intents.push({
    index: index++,
    role: "end-card",
    goal: "Official AmyNest branded end card",
    targetSeconds: endCardSeconds,
    durationSeconds: Math.min(
      endCardSeconds,
      Math.max(2, snapClipDuration(endCardSeconds, {
        ...input.provider,
        maxClipSeconds: Math.max(input.provider.maxClipSeconds, 3),
        minClipSeconds: 2,
        allowedClipSeconds: undefined,
      })),
    ),
    narration: "Download AmyNest AI. Build Better Habits Every Day.",
    caption: "Download AmyNest AI",
    emotion: "confident",
    characters: ["amy-ai"],
    camera: "Static",
    visualType: "Icon Animation",
    storyboardPurpose: "brand-end",
  });

  return normalizeToTotalDuration(intents, input.totalDuration, input.provider.maxClipSeconds);
}

function splitToProviderClips(
  desired: number,
  provider: VideoProviderCapabilities,
): number[] {
  const max = provider.maxClipSeconds;
  if (desired <= max + 0.35) {
    return [snapClipDuration(desired, provider)];
  }
  const parts: number[] = [];
  let remaining = desired;
  while (remaining > 0.35) {
    const chunk = Math.min(max, remaining);
    parts.push(snapClipDuration(chunk, provider));
    remaining -= chunk;
    // Safety against infinite loops with awkward snaps
    if (parts.length > 12) break;
  }
  return parts.length ? parts : [snapClipSecondsSafe(provider)];
}

function snapClipSecondsSafe(provider: VideoProviderCapabilities): number {
  return snapClipDuration(provider.maxClipSeconds, provider);
}

function normalizeToTotalDuration(
  intents: ComposerSceneIntent[],
  total: SupportedDuration,
  maxBodyClipSeconds?: number,
): ComposerSceneIntent[] {
  const sum = intents.reduce((s, i) => s + i.durationSeconds, 0);
  if (sum <= 0) return intents;
  const scale = total / sum;
  let cursor = 0;
  const scaled = intents.map((intent, index) => {
    const isLast = index === intents.length - 1;
    let duration = round1(intent.durationSeconds * scale);
    if (isLast) duration = round1(total - cursor);
    duration = Math.max(1.2, duration);
    if (
      maxBodyClipSeconds &&
      intent.role !== "end-card" &&
      duration > maxBodyClipSeconds
    ) {
      duration = maxBodyClipSeconds;
    }
    cursor = round1(cursor + duration);
    return { ...intent, durationSeconds: duration };
  });

  // Redistribute leftover seconds into scenes that still have headroom.
  let used = scaled.reduce((s, i) => s + i.durationSeconds, 0);
  let leftover = round1(total - used);
  if (leftover > 0.05 && maxBodyClipSeconds) {
    for (const scene of scaled) {
      if (leftover <= 0.05) break;
      if (scene.role === "end-card") continue;
      const headroom = round1(maxBodyClipSeconds - scene.durationSeconds);
      if (headroom <= 0) continue;
      const add = Math.min(headroom, leftover);
      scene.durationSeconds = round1(scene.durationSeconds + add);
      leftover = round1(leftover - add);
    }
  }

  // Final drift fix on end-card / last scene
  used = scaled.slice(0, -1).reduce((s, i) => s + i.durationSeconds, 0);
  const last = scaled[scaled.length - 1]!;
  last.durationSeconds = round1(Math.max(2, total - used));
  return scaled.map((intent, index) => ({ ...intent, index }));
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
