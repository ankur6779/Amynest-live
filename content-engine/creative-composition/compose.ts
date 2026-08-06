/**
 * Creative Composition — continuous Veo character performances (no still montages).
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GeminiVideoProvider } from "../asset-engine/providers/gemini-video/index.js";
import { resolveBrandAssetPath } from "../brand/assets-resolver.js";
import { isCharacterMemoryEnabled } from "../character-memory-engine/engine.js";
import {
  attachLastFrameMemory,
  seedForShot,
} from "../character-memory-engine/runtime.js";
import type { GenerationSeed } from "../character-memory-engine/seed.js";
import type { SceneCharacterMemory } from "../character-memory-engine/types.js";
import type { SceneStoryMemory } from "../story-memory-engine/types.js";
import type { ContentPackage } from "../types/content-package.js";
import {
  animatePremiumCta,
  writePremiumAdCtaPlate,
} from "./cta-premium.js";
import { writeIdentityKeyframe } from "./keyframes.js";
import { performancePrompt } from "./performances.js";
import { planCinematicShort } from "./plan.js";
import type {
  ComposedShotArtifact,
  CreativeCompositionPlan,
} from "./types.js";

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function writeCaptionPng(path: string, text: string): void {
  const script = `
from PIL import Image, ImageDraw, ImageFont
W,H=1000,210
img=Image.new("RGBA",(W,H),(0,0,0,0))
draw=ImageDraw.Draw(img)
try:
    font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 42)
except Exception:
    font=ImageFont.load_default()
words=${JSON.stringify(text)}.split()
lines=[]; cur=""
for w in words:
    t=(cur+" "+w).strip()
    bbox=draw.textbbox((0,0),t,font=font)
    if bbox[2]-bbox[0] > W-70 and cur:
        lines.append(cur); cur=w
    else:
        cur=t
if cur: lines.append(cur)
lines=lines[:3]
y=16
for line in lines:
    bbox=draw.textbbox((0,0),line,font=font)
    tw=bbox[2]-bbox[0]; th=bbox[3]-bbox[1]
    x=(W-tw)//2
    draw.rounded_rectangle((x-16,y-8,x+tw+16,y+th+12), radius=20, fill=(18,11,46,200))
    draw.text((x,y), line, fill="white", font=font)
    y += th + 18
img.save(${JSON.stringify(path)})
`;
  execFileSync("python3", ["-c", script], { stdio: ["ignore", "pipe", "pipe"] });
}

function burnCaption(options: {
  videoPath: string;
  captionPng: string;
  outputPath: string;
  seconds: number;
}): void {
  ffmpeg([
    "-i",
    options.videoPath,
    "-loop",
    "1",
    "-t",
    String(options.seconds),
    "-i",
    options.captionPng,
    "-filter_complex",
    `[0:v]trim=0:${options.seconds},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p[base];[1:v]format=rgba[cap];[base][cap]overlay=(W-w)/2:H-h-150:format=auto,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(options.seconds),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    options.outputPath,
  ]);
}

function burnCtaPerformance(options: {
  veoPath: string;
  ctaPlatePath: string;
  outputPath: string;
  workDir: string;
  seconds: number;
}): void {
  // 1.5s live Amy AI wave + solid premium end card.
  // Plate is self-contained (logo, Amy keyed, phone, badges) — never overlay
  // caption pills or aggressive Y-crop (those caused Shorts chrome collisions).
  const wave = join(options.workDir, "cta-wave.mp4");
  const card = join(options.workDir, "cta-card.mp4");
  const waveSec = Math.min(1.5, Math.max(0.8, options.seconds - 2.5));
  const cardSec = options.seconds - waveSec;
  ffmpeg([
    "-i",
    options.veoPath,
    "-filter_complex",
    `[0:v]trim=0:${waveSec},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(waveSec),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    wave,
  ]);
  animatePremiumCta({
    platePath: options.ctaPlatePath,
    outputPath: card,
    seconds: cardSec,
  });
  const list = join(options.workDir, "cta-concat.txt");
  writeFileSync(
    list,
    `file '${wave.replace(/'/g, "'\\''")}'\nfile '${card.replace(/'/g, "'\\''")}'\n`,
  );
  ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-t",
    String(options.seconds),
    options.outputPath,
  ]);
}

export interface ComposeCinematicInput {
  content: ContentPackage;
  workDir: string;
  outputDir: string;
  geminiApiKey: string;
  /** Veo model — keep google-veo provider; default daily Fast. */
  veoModel?: string;
  totalDurationSeconds?: number;
  resolution?: "720p" | "1080p";
  /** Optional pre-gated diversity plan (skips re-planning). */
  plan?: CreativeCompositionPlan;
}

export interface ComposeCinematicResult {
  plan: CreativeCompositionPlan;
  shots: ComposedShotArtifact[];
  clipPaths: string[];
  ctaPlatePath: string;
  detail: string;
  continuity: Array<{
    shotId: string;
    character: string;
    provider: string;
    model: string;
    imageToVideo: boolean;
    keyframePath?: string;
    memoryFramePath?: string;
    usedPreviousFrame?: boolean;
    videoPath: string;
  }>;
  /** Chained character memory after last-frame freeze (when enabled). */
  characterMemory?: SceneCharacterMemory[];
  /** Chained story memory across shots (when enabled). */
  storyMemory?: SceneStoryMemory[];
}

/**
 * Compose a full Short from continuous Veo character performances.
 */
export async function composeCinematicVisuals(
  input: ComposeCinematicInput,
): Promise<ComposeCinematicResult> {
  mkdirSync(input.workDir, { recursive: true });
  const keyDir = join(input.workDir, "keyframes");
  const veoDir = join(input.workDir, "veo");
  const memoryDir = join(input.workDir, "character-memory");
  mkdirSync(keyDir, { recursive: true });
  mkdirSync(veoDir, { recursive: true });
  mkdirSync(memoryDir, { recursive: true });
  const memoryEnabled = isCharacterMemoryEnabled();

  const plan =
    input.plan ??
    planCinematicShort(input.content, input.totalDurationSeconds ?? 21);

  const veoModel = input.veoModel ?? "veo-3.1-fast-generate-preview";
  const veo = new GeminiVideoProvider({
    apiKey: input.geminiApiKey,
    settings: {
      enabled: true,
      model: veoModel,
      outputDirectory: veoDir,
      durationSeconds: 6,
      resolution: input.resolution ?? "720p",
      personGeneration: "allow_all",
      // Flaky Google ops: allow longer poll window (env can override).
      timeoutMs: process.env.AMYNEST_VEO_TIMEOUT_MS
        ? Number(process.env.AMYNEST_VEO_TIMEOUT_MS)
        : 1_200_000,
      maxPollAttempts: process.env.AMYNEST_VEO_MAX_POLLS
        ? Number(process.env.AMYNEST_VEO_MAX_POLLS)
        : 300,
    },
  });

  const officialDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "brand",
    "assets",
    "official",
  );
  const playBadge = join(officialDir, "cta-google-play.png");
  const appBadge = join(officialDir, "cta-app-store.png");
  if (!existsSync(playBadge) || !existsSync(appBadge)) {
    throw new Error("Official CTA store badges missing under brand/assets/official/");
  }
  void playBadge;
  void appBadge;

  const shots: ComposedShotArtifact[] = [];
  const clipPaths: string[] = [];
  const continuity: ComposeCinematicResult["continuity"] = [];
  const characterMemoryChain: SceneCharacterMemory[] = [];
  const storyMemoryChain: SceneStoryMemory[] = [];
  let previousMemory: SceneCharacterMemory | null = null;
  let previousStory: SceneStoryMemory | null = null;
  let ctaPlatePath = "";

  for (const shot of plan.shots) {
    const captionPng = join(input.workDir, `${shot.id}-caption.png`);
    writeCaptionPng(captionPng, shot.caption);
    const keyframePath = join(keyDir, `${shot.id}-identity.png`);
    writeIdentityKeyframe({
      outputPath: keyframePath,
      character: shot.character,
      environment: shot.environment,
    });

    const prompted = performancePrompt(shot, previousMemory, previousStory);
    const { prompt, negativePrompt } = prompted;
    let sceneMemory = prompted.memory ?? null;
    if (prompted.story) {
      previousStory = prompted.story;
      storyMemoryChain.push(prompted.story);
    }

    const seed: GenerationSeed = memoryEnabled
      ? seedForShot({
          character: shot.character,
          identityKeyframePath: keyframePath,
          previousMemory,
          cast: sceneMemory?.characters ?? [shot.character],
        })
      : {
          imagePath: keyframePath,
          referenceImagePaths: [keyframePath],
          usedPreviousFrame: false,
          bibleAssetPaths: [],
          note: "Character Memory disabled",
        };

    if (sceneMemory) {
      sceneMemory = {
        ...sceneMemory,
        referenceImagePaths: seed.referenceImagePaths,
        bibleAssetPaths: seed.bibleAssetPaths.length
          ? seed.bibleAssetPaths
          : sceneMemory.bibleAssetPaths,
      };
    }

    const rawVeo = join(veoDir, `${shot.id}-raw.mp4`);
    const outClip = join(input.workDir, `${shot.id}.mp4`);

    let modelUsed = veoModel;
    let imageToVideo = true;
    if (existsSync(rawVeo) && process.env.AMYNEST_REUSE_VEO !== "0") {
      console.log(
        `[creative-composition] Reusing Veo clip ${shot.id} → ${rawVeo}`,
      );
    } else {
      console.log(
        `[creative-composition] Veo performance ${shot.id} (${shot.character}, ${shot.durationSeconds}s, ${veoModel})${
          seed.usedPreviousFrame ? " [memory→video]" : " [identity→video]"
        }`,
      );
      const generated = await veo.generateVideo({
        prompt,
        negativePrompt,
        assetId: shot.id,
        sceneId: shot.id,
        aspectRatio: "9:16",
        durationSeconds: shot.durationSeconds,
        resolution: input.resolution ?? "720p",
        outputPath: rawVeo,
        imagePath: seed.imagePath,
        referenceImagePaths: seed.referenceImagePaths,
      });
      modelUsed = generated.metadata.model;
      imageToVideo = Boolean(generated.metadata.imageToVideo);
    }

    if (shot.kind === "cta-overlay") {
      const plate = join(input.workDir, "cta-premium-plate.png");
      // Official premium plate (flood-key Amy, side-by-side badges, Shorts-safe).
      // Never use the old circular-medallion path (baked checkerboard leaked).
      writePremiumAdCtaPlate({ path: plate });
      ctaPlatePath = plate;
      burnCtaPerformance({
        veoPath: rawVeo,
        ctaPlatePath: plate,
        outputPath: outClip,
        workDir: input.workDir,
        seconds: shot.durationSeconds,
      });
      shots.push({
        plan: shot,
        videoPath: outClip,
        keyframePath,
        provider: "cta-overlay",
        model: modelUsed,
        detail: "Veo Amy AI wave + premium keyed end card (no caption overlay)",
        imageToVideo: true,
      });
    } else {
      burnCaption({
        videoPath: rawVeo,
        captionPng,
        outputPath: outClip,
        seconds: shot.durationSeconds,
      });
      shots.push({
        plan: shot,
        videoPath: outClip,
        keyframePath,
        provider: "google-veo",
        model: modelUsed,
        detail: `Veo continuous performance — ${shot.character}`,
        imageToVideo,
      });
    }

    // Freeze last frame → canonical memory for the next shot (no extra API cost).
    if (memoryEnabled && sceneMemory) {
      try {
        previousMemory = attachLastFrameMemory(sceneMemory, rawVeo, memoryDir);
        characterMemoryChain.push(previousMemory);
      } catch (err) {
        console.warn(
          `[character-memory] freeze failed for ${shot.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        previousMemory = sceneMemory;
        characterMemoryChain.push(sceneMemory);
      }
    }

    continuity.push({
      shotId: shot.id,
      character: shot.character,
      provider: "google-veo",
      model: modelUsed,
      imageToVideo,
      keyframePath,
      memoryFramePath: previousMemory?.lastFramePath,
      usedPreviousFrame: seed.usedPreviousFrame,
      videoPath: outClip,
    });
    clipPaths.push(outClip);
  }

  // Still plate for evidence end-card OCR if needed
  if (!ctaPlatePath) {
    ctaPlatePath = resolveBrandAssetPath("appIcon");
  }

  writeFileSync(
    join(input.workDir, "composition-plan.json"),
    JSON.stringify({ plan, continuity }, null, 2),
  );
  writeFileSync(
    join(input.workDir, "continuity.json"),
    JSON.stringify(continuity, null, 2),
  );
  if (characterMemoryChain.length) {
    writeFileSync(
      join(input.workDir, "character-memory.json"),
      JSON.stringify(characterMemoryChain, null, 2),
    );
  }
  if (storyMemoryChain.length) {
    writeFileSync(
      join(input.workDir, "story-memory.json"),
      JSON.stringify(storyMemoryChain, null, 2),
    );
  }

  return {
    plan,
    shots,
    clipPaths,
    ctaPlatePath,
    detail: `Composed ${shots.length} Veo character performances (${veoModel}); rules=${plan.rulesApplied.join(",")}${
      memoryEnabled ? "; character-memory=on" : ""
    }${storyMemoryChain.length ? "; story-memory=on" : ""}`,
    continuity,
    characterMemory: characterMemoryChain.length
      ? characterMemoryChain
      : undefined,
    storyMemory: storyMemoryChain.length ? storyMemoryChain : undefined,
  };
}
