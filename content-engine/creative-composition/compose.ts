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
import { KieKlingVideoProvider } from "../asset-engine/providers/kie-kling/index.js";
import { KieVideoProvider } from "../asset-engine/providers/kie-video/index.js";
import { resolveBrandAssetPath } from "../brand/assets-resolver.js";
import { isCharacterMemoryEnabled } from "../character-memory-engine/engine.js";
import {
  attachLastFrameMemory,
  seedForShot,
} from "../character-memory-engine/runtime.js";
import type { GenerationSeed } from "../character-memory-engine/seed.js";
import type { SceneCharacterMemory } from "../character-memory-engine/types.js";
import { wardrobeFor } from "../character-memory-engine/wardrobe.js";
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
  // Production Lock V4 cinematic ending:
  // live Amy wave HOLD → premium endcard (logo / Download / badges / website) → HOLD → fade black.
  // Plate is self-contained — never overlay caption pills or aggressive Y-crop.
  const wave = join(options.workDir, "cta-wave.mp4");
  const card = join(options.workDir, "cta-card.mp4");
  // Prefer ~2s Amy wave hold when CTA is 6s; keep ≥3.5s for complete endcard + fade.
  const waveSec = Math.min(
    2.2,
    Math.max(1.2, options.seconds - 3.8),
  );
  const cardSec = Math.max(3.5, options.seconds - waveSec);
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

export type VideoGenerationProviderId = "kie" | "google" | "kie-kling";

/** Permanent default: KIE Veo. Google = fallback. kie-kling = bakeoff only. */
export function resolveVideoGenerationProvider(
  env: NodeJS.ProcessEnv = process.env,
): VideoGenerationProviderId {
  const raw = (env.AMYNEST_VIDEO_PROVIDER || "kie").trim().toLowerCase();
  if (raw === "google" || raw === "google-veo" || raw === "veo") return "google";
  if (raw === "kie-kling" || raw === "kling" || raw === "kling-3.0") {
    return "kie-kling";
  }
  return "kie";
}

export interface ComposeCinematicInput {
  content: ContentPackage;
  workDir: string;
  outputDir: string;
  geminiApiKey: string;
  /** Optional KIE key — defaults to process.env.KIE_API_KEY. */
  kieApiKey?: string;
  /** Primary video provider. Default from AMYNEST_VIDEO_PROVIDER (kie). */
  videoProvider?: VideoGenerationProviderId;
  /** Google Veo model when provider=google or fallback. */
  veoModel?: string;
  /** KIE model when provider=kie. */
  kieModel?: "veo3" | "veo3_fast";
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

  const primaryProvider = input.videoProvider ?? resolveVideoGenerationProvider();
  const veoModel = input.veoModel ?? "veo-3.1-fast-generate-preview";
  const kieModel =
    input.kieModel ??
    (process.env.AMYNEST_KIE_VEO_MODEL === "veo3" ? "veo3" : "veo3_fast");
  const kieKey = input.kieApiKey?.trim() || process.env.KIE_API_KEY?.trim() || "";
  const resolution =
    input.resolution ??
    (primaryProvider === "kie"
      ? "1080p"
      : primaryProvider === "kie-kling"
        ? "720p"
        : "720p");

  const kie =
    kieKey.length > 0 && primaryProvider === "kie"
      ? new KieVideoProvider({
          apiKey: kieKey,
          model: kieModel,
          resolution,
          enabled: true,
        })
      : null;
  const kling =
    kieKey.length > 0 && primaryProvider === "kie-kling"
      ? new KieKlingVideoProvider({
          apiKey: kieKey,
          mode:
            process.env.AMYNEST_KIE_KLING_MODE === "pro"
              ? "pro"
              : process.env.AMYNEST_KIE_KLING_MODE === "4K"
                ? "4K"
                : "std",
          enabled: true,
        })
      : null;
  const googleVeo = new GeminiVideoProvider({
    apiKey: input.geminiApiKey,
    settings: {
      enabled: true,
      model: veoModel,
      outputDirectory: veoDir,
      durationSeconds: 6,
      resolution,
      personGeneration: "allow_all",
      timeoutMs: process.env.AMYNEST_VEO_TIMEOUT_MS
        ? Number(process.env.AMYNEST_VEO_TIMEOUT_MS)
        : 1_200_000,
      maxPollAttempts: process.env.AMYNEST_VEO_MAX_POLLS
        ? Number(process.env.AMYNEST_VEO_MAX_POLLS)
        : 300,
    },
  });

  if (primaryProvider === "kie" && !kie) {
    throw new Error(
      "AMYNEST_VIDEO_PROVIDER=kie but KIE_API_KEY is missing — set KIE_API_KEY or switch to google",
    );
  }
  if (primaryProvider === "kie-kling" && !kling) {
    throw new Error(
      "AMYNEST_VIDEO_PROVIDER=kie-kling but KIE_API_KEY is missing",
    );
  }
  const activeLabel =
    primaryProvider === "kie"
      ? `kie/${kieModel}`
      : primaryProvider === "kie-kling"
        ? `kie-kling/${process.env.AMYNEST_KIE_KLING_MODE || "std"}`
        : `google/${veoModel}`;

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
          referenceImagePaths: [
            wardrobeFor(shot.character).bibleAsset,
            keyframePath,
          ].filter((p) => p && existsSync(p)),
          usedPreviousFrame: false,
          bibleAssetPaths: [wardrobeFor(shot.character).bibleAsset],
          note: "Character Memory disabled — bible still attached for KIE identity HTTP",
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

    let modelUsed =
      primaryProvider === "kie"
        ? kieModel
        : primaryProvider === "kie-kling"
          ? "kling-3.0/video"
          : veoModel;
    let imageToVideo = true;
    let shotProvider: "google-veo" | "kie-veo" | "kie-kling" =
      primaryProvider === "kie"
        ? "kie-veo"
        : primaryProvider === "kie-kling"
          ? "kie-kling"
          : "google-veo";
    if (existsSync(rawVeo) && process.env.AMYNEST_REUSE_VEO !== "0") {
      console.log(
        `[creative-composition] Reusing video clip ${shot.id} → ${rawVeo}`,
      );
    } else {
      const genArgs = {
        prompt,
        negativePrompt,
        assetId: shot.id,
        sceneId: shot.id,
        character: shot.character,
        aspectRatio: "9:16" as const,
        durationSeconds: shot.durationSeconds,
        resolution,
        outputPath: rawVeo,
        imagePath: seed.imagePath,
        referenceImagePaths: seed.referenceImagePaths,
      };
      console.log(
        `[creative-composition] ${activeLabel} performance ${shot.id} (${shot.character}, ${shot.durationSeconds}s)${
          seed.usedPreviousFrame ? " [memory→video]" : " [identity→video]"
        }`,
      );
      try {
        if (primaryProvider === "kie" && kie) {
          const generated = await kie.generateVideo(genArgs);
          modelUsed = generated.metadata.model;
          imageToVideo = Boolean(generated.metadata.imageToVideo);
          shotProvider = "kie-veo";
        } else if (primaryProvider === "kie-kling" && kling) {
          const generated = await kling.generateVideo(genArgs);
          modelUsed = generated.metadata.model;
          imageToVideo = Boolean(generated.metadata.imageToVideo);
          shotProvider = "kie-kling";
        } else {
          const generated = await googleVeo.generateVideo(genArgs);
          modelUsed = generated.metadata.model;
          imageToVideo = Boolean(generated.metadata.imageToVideo);
          shotProvider = "google-veo";
        }
      } catch (primaryErr) {
        // Cost/reliability fallback: if KIE Veo fails and Google key exists, try Google once.
        // Kling bakeoff does not fall back (keep cost comparison clean).
        const canFallbackGoogle =
          primaryProvider === "kie" &&
          Boolean(input.geminiApiKey) &&
          process.env.AMYNEST_VIDEO_FALLBACK_GOOGLE !== "0";
        if (!canFallbackGoogle) throw primaryErr;
        console.warn(
          `[creative-composition] KIE failed for ${shot.id} — falling back to Google Veo: ${
            primaryErr instanceof Error ? primaryErr.message : String(primaryErr)
          }`,
        );
        const generated = await googleVeo.generateVideo(genArgs);
        modelUsed = generated.metadata.model;
        imageToVideo = Boolean(generated.metadata.imageToVideo);
        shotProvider = "google-veo";
      }
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
        provider: shotProvider,
        model: modelUsed,
        detail: `${shotProvider} continuous performance — ${shot.character}`,
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
      provider: shotProvider,
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
    detail: `Composed ${shots.length} character performances via ${activeLabel}; rules=${plan.rulesApplied.join(",")}${
      memoryEnabled ? "; character-memory=on" : ""
    }${storyMemoryChain.length ? "; story-memory=on" : ""}`,
    continuity,
    characterMemory: characterMemoryChain.length
      ? characterMemoryChain
      : undefined,
    storyMemory: storyMemoryChain.length ? storyMemoryChain : undefined,
  };
}
