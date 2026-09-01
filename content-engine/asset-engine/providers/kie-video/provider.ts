/**
 * KIE.ai video provider — production primary for Veo image-to-video.
 * Compatible with GeminiVideoProvider.generateVideo() call shape used by compose.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import type { GeneratedVideoAsset } from "../../../types/generated-video.js";
import type { GenerateVideoOptions } from "../gemini-video/provider.js";
import { wardrobeFor } from "../../../character-memory-engine/wardrobe.js";
import {
  assertCanonicalIdentitiesForCast,
  characterFromBiblePath,
  isCanonicalBiblePath,
  isIdentityKeyframePath,
} from "../../../character-memory-engine/seed.js";
import {
  isGeneratedMemoryFramePath,
  kieCredits,
  kieGenerateVideo,
  type KieVeoModel,
} from "./client.js";
import type { BrandCharacterId } from "../../../brand/types.js";

export interface KieVideoProviderOptions {
  apiKey?: string;
  model?: KieVeoModel;
  resolution?: "720p" | "1080p";
  /** Approximate USD per credit (account rate). */
  creditUsd?: number;
  enabled?: boolean;
}

/** Measured bakeoff: Fast@1080p ≈65 credits/shot ≈ $0.325. */
const DEFAULT_CREDIT_USD = 0.005;
const EST_CREDITS_FAST_1080 = 65;

export class KieVideoProvider {
  readonly id = "kie-veo" as const;
  private readonly apiKey: string;
  private readonly model: KieVeoModel;
  private readonly resolution: "720p" | "1080p";
  private readonly creditUsd: number;
  private readonly enabled: boolean;

  constructor(options: KieVideoProviderOptions = {}) {
    this.apiKey =
      options.apiKey?.trim() ||
      process.env.KIE_API_KEY?.trim() ||
      "";
    this.model =
      options.model ??
      (process.env.AMYNEST_KIE_VEO_MODEL === "veo3" ? "veo3" : "veo3_fast");
    this.resolution =
      options.resolution ??
      (process.env.AMYNEST_KIE_VEO_RESOLUTION === "720p" ? "720p" : "1080p");
    this.creditUsd = options.creditUsd ?? DEFAULT_CREDIT_USD;
    this.enabled = options.enabled ?? process.env.AMYNEST_KIE_ENABLED !== "0";
  }

  async health(): Promise<{ ok: boolean; message: string; credits?: number }> {
    if (!this.enabled) {
      return { ok: false, message: "KieVideoProvider disabled" };
    }
    if (!this.apiKey) {
      return { ok: false, message: "KIE_API_KEY missing" };
    }
    try {
      const credits = await kieCredits(this.apiKey);
      if (!Number.isFinite(credits)) {
        return { ok: false, message: "KIE credits lookup failed" };
      }
      if (credits < 60) {
        return {
          ok: false,
          message: `KIE credits too low (${credits}) — need ≥60/shot`,
          credits,
        };
      }
      return { ok: true, message: `KIE ready — ${credits} credits`, credits };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async generateVideo(options: GenerateVideoOptions = {}): Promise<GeneratedVideoAsset> {
    if (!this.enabled) {
      throw new Error("KieVideoProvider is disabled");
    }
    if (!this.apiKey) {
      throw new Error("KIE_API_KEY is required for KIE Veo generation");
    }
    if (!options.imagePath || !existsSync(options.imagePath)) {
      throw new Error(
        `KIE image-to-video requires imagePath (missing: ${options.imagePath ?? "n/a"})`,
      );
    }
    if (!options.prompt?.trim()) {
      throw new Error("KIE generateVideo requires prompt");
    }
    if (!options.outputPath) {
      throw new Error("KIE generateVideo requires outputPath");
    }

    const durationSeconds = (options.durationSeconds ?? 4) as 4 | 6 | 8;
    const resolution = options.resolution ?? this.resolution;
    const aspectRatio = options.aspectRatio ?? "9:16";
    const assetId = options.assetId ?? `kie-${Date.now()}`;
    const started = Date.now();

    const incomingRefs = (options.referenceImagePaths ?? []).filter(
      (p) => p && existsSync(p),
    );
    const memoryRefsIncoming = incomingRefs.filter(isGeneratedMemoryFramePath);
    const primaryIsMemory = isGeneratedMemoryFramePath(options.imagePath!);

    const lead =
      options.character === "amy-ai" ||
      options.character === "amy-girl" ||
      options.character === "amy-boy"
        ? options.character
        : null;

    const cast: BrandCharacterId[] = (
      options.cast?.length
        ? options.cast
        : lead
          ? [lead]
          : []
    ).filter(
      (c): c is BrandCharacterId =>
        c === "amy-ai" || c === "amy-girl" || c === "amy-boy",
    );

    if (cast.length > 0) {
      assertCanonicalIdentitiesForCast(cast);
    }

    // Fail-safe: never use a generated memory freeze as the primary KIE seed.
    let safeImagePath = options.imagePath!;
    if (primaryIsMemory) {
      const fallbackBible =
        (lead ? wardrobeFor(lead).bibleAsset : undefined) ??
        incomingRefs.find((p) => isCanonicalBiblePath(p));
      if (!fallbackBible || !existsSync(fallbackBible)) {
        throw new Error(
          `KIE shot FAIL: imagePath is a generated memory frame (${options.imagePath}) and no canonical bible substitute is available — never upload memory freeze to KIE`,
        );
      }
      console.warn(
        `[kie-video] FAIL-SAFE: rejected generated memory frame as imagePath; using canonical bible instead`,
      );
      safeImagePath = fallbackBible;
    }

    // Primary must be lead bible when lead is known — never another character's keyframe.
    if (lead) {
      const leadBible = wardrobeFor(lead).bibleAsset;
      if (
        isIdentityKeyframePath(safeImagePath) &&
        !isCanonicalBiblePath(safeImagePath)
      ) {
        if (!existsSync(leadBible)) {
          throw new Error(
            `KIE shot FAIL: primary was identity keyframe and lead bible missing for ${lead}`,
          );
        }
        console.warn(
          `[kie-video] FAIL-SAFE: primary imagePath was identity keyframe — promoting ${lead} canonical bible`,
        );
        safeImagePath = leadBible;
      }
      const primaryOwner = characterFromBiblePath(safeImagePath);
      if (primaryOwner && primaryOwner !== lead) {
        throw new Error(
          `KIE shot FAIL: primary imagePath is ${primaryOwner} bible but lead is ${lead} — never cross-assign identity`,
        );
      }
    }

    const refPaths = incomingRefs.filter((p) => !isGeneratedMemoryFramePath(p));

    const requiredBible: string[] = [];
    for (const c of cast.length ? cast : lead ? [lead] : []) {
      const bible = wardrobeFor(c).bibleAsset;
      if (!bible || !existsSync(bible)) {
        throw new Error(
          `KIE shot FAIL: canonical ${c} bible missing on disk (${bible ?? "n/a"}) — no substitute character generation (never use memory freeze)`,
        );
      }
      if (!requiredBible.includes(bible)) requiredBible.push(bible);
    }
    if (requiredBible.length === 0) {
      for (const p of refPaths) {
        if (/amy-(ai|girl|boy)-bible/i.test(p)) requiredBible.push(p);
      }
    }

    if (requiredBible.length === 0 && refPaths.length === 0) {
      throw new Error(
        `KIE shot FAIL: no character referenceImagePaths (imagePath=${safeImagePath}). Canonical Amy/Amy Girl/Amy Boy refs required — no substitute.`,
      );
    }

    // Drop foreign identity keyframes that could redefine another cast member.
    const safeRefs = refPaths.filter((p) => {
      if (isGeneratedMemoryFramePath(p)) return false;
      if (isIdentityKeyframePath(p) && !isCanonicalBiblePath(p)) {
        // Allow only if single-cast env wash for the lead; strip in multi-cast.
        if (cast.length > 1) return false;
      }
      return true;
    });

    const mergedRefs = [
      ...requiredBible,
      ...safeRefs,
      ...(safeImagePath && existsSync(safeImagePath) ? [safeImagePath] : []),
    ].filter((p) => !isGeneratedMemoryFramePath(p));

    const generatedMemoryOnWire = mergedRefs.filter(isGeneratedMemoryFramePath)
      .length;
    const bibleOnWire = mergedRefs.filter(isCanonicalBiblePath);

    console.log(
      [
        `[kie-video] Character Memory: enabled (prompt/local freeze; KIE visual = canonical only)`,
        `[kie-video] Local memory freeze: ${
          primaryIsMemory || memoryRefsIncoming.length > 0 ? "present (stripped from KIE)" : "absent-or-not-in-refs"
        }`,
        `[kie-video] KIE canonical bible refs: ${bibleOnWire.length}`,
        `[kie-video] KIE generated memory refs: ${generatedMemoryOnWire}`,
        `[kie-video] cast=${cast.join(",") || "n/a"} primary=${lead ?? "n/a"}`,
      ].join("\n"),
    );

    if (generatedMemoryOnWire !== 0) {
      throw new Error(
        "KIE shot FAIL: generated memory frame still present in provider refs after fail-safe — abort",
      );
    }

    for (const c of cast) {
      const bible = wardrobeFor(c).bibleAsset;
      if (!mergedRefs.includes(bible) && safeImagePath !== bible) {
        throw new Error(
          `KIE shot FAIL: cast member ${c} missing canonical bible on wire — fail fast (no substitute)`,
        );
      }
    }

    const result = await kieGenerateVideo({
      apiKey: this.apiKey,
      prompt: options.prompt,
      imagePath: safeImagePath,
      referenceImagePaths: mergedRefs,
      requiredReferencePaths:
        requiredBible.length > 0 ? requiredBible : [mergedRefs[0]!],
      outputPath: options.outputPath,
      model: this.model,
      resolution,
      durationSeconds,
      aspectRatio,
      signal: options.signal,
      character: lead ?? options.sceneId,
    });

    if ((result.requestEvidence.imageUrlCount ?? 0) < 1) {
      throw new Error(
        "KIE shot FAIL: final HTTP payload had zero imageUrls — character reference did not reach provider",
      );
    }
    // Prove canonical bible hash is among uploaded refs
    if (requiredBible.length > 0) {
      const uploaded = new Set(result.requestEvidence.referenceAssetPaths);
      for (const bible of requiredBible) {
        if (!uploaded.has(bible)) {
          throw new Error(
            `KIE shot FAIL: canonical bible did not reach HTTP imageUrls (${bible})`,
          );
        }
      }
    }

    const fileStat = await stat(result.videoPath);
    if (fileStat.size < 1_024) {
      throw new Error(`KIE video too small (${fileStat.size} bytes)`);
    }
    const bytes = await readFile(result.videoPath);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const width = resolution === "1080p" ? 1080 : 720;
    const height = resolution === "1080p" ? 1920 : 1280;
    const creditsUsed =
      result.creditsBefore != null && result.creditsAfter != null
        ? Math.max(0, result.creditsBefore - result.creditsAfter)
        : EST_CREDITS_FAST_1080;

    return {
      videoPath: result.videoPath,
      provider: "kie-veo",
      duration: durationSeconds,
      resolution: `${width}x${height}`,
      fps: 24,
      checksum,
      generationTime: Date.now() - started,
      metadata: {
        model: result.model,
        operationName: result.taskId,
        prompt: options.prompt,
        aspectRatio,
        requestedDurationSeconds: durationSeconds,
        mimeType: "video/mp4",
        fileSizeBytes: fileStat.size,
        hasAudio: true,
        sceneId: options.sceneId,
        assetId,
        costEstimateUsd: creditsUsed * this.creditUsd,
        pollAttempts: result.pollAttempts,
        downloadedAt: new Date().toISOString(),
        rawUri: result.rawUri,
        imageToVideo: true,
        identityImagePath: safeImagePath,
        referenceImagePaths: options.referenceImagePaths ?? [],
        kieRequestEvidence: result.requestEvidence,
        kieImageUrlCount: result.requestEvidence.imageUrlCount,
        kieGenerationType: result.requestEvidence.generationType,
      },
    };
  }
}

export function resolveKieVideoProvider(
  env: NodeJS.ProcessEnv = process.env,
): KieVideoProvider | null {
  const key = env.KIE_API_KEY?.trim();
  if (!key) return null;
  if (env.AMYNEST_KIE_ENABLED === "0") return null;
  return new KieVideoProvider({ apiKey: key });
}
