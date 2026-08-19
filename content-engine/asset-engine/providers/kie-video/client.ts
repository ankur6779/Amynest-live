/**
 * KIE.ai Veo HTTP client — image-to-video via credit-based API.
 * Permanent production video source (cheaper than Google AI Studio Veo).
 *
 * P0: character bible / referenceImagePaths must appear in the real HTTP body.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export type KieVeoModel = "veo3" | "veo3_fast";

export type KieGenerationType =
  | "TEXT_2_VIDEO"
  | "FIRST_AND_LAST_FRAMES_2_VIDEO"
  | "REFERENCE_2_VIDEO";

export interface KieGenerateOptions {
  apiKey: string;
  prompt: string;
  imagePath: string;
  /** Official bible + scene-memory refs — must reach HTTP imageUrls (max 3). */
  referenceImagePaths?: string[];
  /** Fail if these paths cannot be uploaded into the provider request. */
  requiredReferencePaths?: string[];
  outputPath: string;
  model?: KieVeoModel;
  resolution?: "720p" | "1080p";
  durationSeconds?: number;
  aspectRatio?: "9:16" | "16:9";
  uploadPath?: string;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  signal?: AbortSignal;
  /** Optional character id for integrity logs. */
  character?: string;
}

export interface KieGenerateResult {
  videoPath: string;
  taskId: string;
  rawUri: string;
  model: KieVeoModel;
  pollAttempts: number;
  creditsBefore?: number;
  creditsAfter?: number;
  /** Redacted evidence of what actually hit the wire. */
  requestEvidence: {
    generationType: KieGenerationType;
    imageUrlCount: number;
    referenceAssetPaths: string[];
    referenceAssetHashes: string[];
    referenceUrlsRedacted: string[];
    character?: string;
    durationSeconds: number;
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function httpJson(
  url: string,
  options: { method?: string; key: string; body?: unknown; signal?: AbortSignal },
): Promise<{ ok: boolean; status: number; json: any }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.key}`,
    Accept: "application/json",
    "User-Agent": "AmyNestKieVideo/1.0",
  };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body,
    signal: options.signal,
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

export async function kieCredits(
  apiKey: string,
  signal?: AbortSignal,
): Promise<number> {
  const r = await httpJson("https://api.kie.ai/api/v1/chat/credit", {
    key: apiKey,
    signal,
  });
  return Number(r.json?.data ?? NaN);
}

export async function kieUploadImage(
  apiKey: string,
  filePath: string,
  fileName: string,
  uploadPath = "amynest-production",
  signal?: AbortSignal,
): Promise<string> {
  const b64 = readFileSync(filePath).toString("base64");
  const r = await httpJson("https://kieai.redpandaai.co/api/file-base64-upload", {
    method: "POST",
    key: apiKey,
    signal,
    body: {
      base64Data: `data:image/png;base64,${b64}`,
      uploadPath,
      fileName,
    },
  });
  const url = r.json?.data?.downloadUrl || r.json?.data?.fileUrl;
  if (!url) {
    throw new Error(`KIE upload failed: ${JSON.stringify(r.json).slice(0, 400)}`);
  }
  return url as string;
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 48 ? `${u.pathname.slice(0, 24)}…${u.pathname.slice(-16)}` : u.pathname;
    return `${u.protocol}//${u.host}${path}`;
  } catch {
    return "[redacted-url]";
  }
}

/**
 * Build ordered local paths for KIE imageUrls (max 3).
 * Prefer: required bibles → primary imagePath → remaining refs (scene memory).
 */
export function resolveKieReferencePaths(options: {
  imagePath: string;
  referenceImagePaths?: string[];
  requiredReferencePaths?: string[];
}): string[] {
  const required = (options.requiredReferencePaths ?? []).filter(
    (p) => p && existsSync(p),
  );
  const missingRequired = (options.requiredReferencePaths ?? []).filter(
    (p) => p && !existsSync(p),
  );
  if (missingRequired.length) {
    throw new Error(
      `KIE character reference missing on disk — FAIL shot: ${missingRequired.join(", ")}`,
    );
  }
  if ((options.requiredReferencePaths?.length ?? 0) > 0 && required.length === 0) {
    throw new Error(
      "KIE character reference required but none resolvable — FAIL shot (no substitute generation)",
    );
  }

  const ordered: string[] = [];
  const push = (p: string | undefined) => {
    if (!p || !existsSync(p)) return;
    if (ordered.includes(p)) return;
    if (ordered.length >= 3) return;
    ordered.push(p);
  };

  for (const p of required) push(p);
  push(options.imagePath);
  for (const p of options.referenceImagePaths ?? []) push(p);

  if (ordered.length === 0) {
    throw new Error(
      `KIE image-to-video requires at least one image (missing: ${options.imagePath})`,
    );
  }
  return ordered;
}

export async function kieGenerateVideo(
  options: KieGenerateOptions,
): Promise<KieGenerateResult> {
  const model = options.model ?? "veo3_fast";
  const resolution = options.resolution ?? "1080p";
  const requestedDuration = options.durationSeconds ?? 4;
  const aspectRatio = options.aspectRatio ?? "9:16";
  const pollIntervalMs = options.pollIntervalMs ?? 8_000;
  const maxPollAttempts = options.maxPollAttempts ?? 120;

  const localPaths = resolveKieReferencePaths({
    imagePath: options.imagePath,
    referenceImagePaths: options.referenceImagePaths,
    requiredReferencePaths: options.requiredReferencePaths,
  });

  // Multi-ref identity lock uses REFERENCE_2_VIDEO (1–3 images). API requires 8s for that mode.
  const useReferenceMode = localPaths.length >= 2 || (options.requiredReferencePaths?.length ?? 0) > 0;
  const generationType: KieGenerationType = useReferenceMode
    ? "REFERENCE_2_VIDEO"
    : "FIRST_AND_LAST_FRAMES_2_VIDEO";
  const durationSeconds =
    generationType === "REFERENCE_2_VIDEO" ? 8 : requestedDuration;
  const effectiveModel: KieVeoModel =
    generationType === "REFERENCE_2_VIDEO" ? "veo3_fast" : model;

  const creditsBefore = await kieCredits(options.apiKey, options.signal).catch(
    () => undefined,
  );

  const imageUrls: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < localPaths.length; i++) {
    const path = localPaths[i]!;
    hashes.push(sha256File(path));
    const url = await kieUploadImage(
      options.apiKey,
      path,
      `amynest-ref-${Date.now()}-${i}.png`,
      options.uploadPath,
      options.signal,
    );
    imageUrls.push(url);
  }

  if (imageUrls.length < 1) {
    throw new Error(
      "KIE character reference could not be uploaded — FAIL shot (no substitute)",
    );
  }

  const requestBody = {
    prompt: options.prompt,
    imageUrls,
    model: effectiveModel,
    generationType,
    aspect_ratio: aspectRatio,
    resolution,
    duration: durationSeconds,
    enableTranslation: false,
  };

  const requestEvidence = {
    generationType,
    imageUrlCount: imageUrls.length,
    referenceAssetPaths: localPaths,
    referenceAssetHashes: hashes,
    referenceUrlsRedacted: imageUrls.map(redactUrl),
    character: options.character,
    durationSeconds,
  };

  console.log(
    `[kie-video] FINAL HTTP payload (redacted): character=${options.character ?? "n/a"} refs=${imageUrls.length} type=${generationType} model=${effectiveModel} duration=${durationSeconds} hashes=${hashes.map((h) => h.slice(0, 12)).join(",")}`,
  );
  for (let i = 0; i < localPaths.length; i++) {
    console.log(
      `[kie-video] ref[${i}] path=${localPaths[i]} hash=${hashes[i]} url=${requestEvidence.referenceUrlsRedacted[i]}`,
    );
  }

  const create = await httpJson("https://api.kie.ai/api/v1/veo/generate", {
    method: "POST",
    key: options.apiKey,
    signal: options.signal,
    body: requestBody,
  });
  const taskId = create.json?.data?.taskId as string | undefined;
  if (!create.ok || !taskId) {
    throw new Error(
      `KIE create failed (${create.status}): ${JSON.stringify(create.json).slice(0, 500)}`,
    );
  }

  const pollResult = await pollKieTask({
    apiKey: options.apiKey,
    taskId,
    outputPath: options.outputPath,
    pollIntervalMs,
    maxPollAttempts,
    signal: options.signal,
  });

  // Veo sometimes fails audio branch on child/dialogue prompts; visual still needed.
  // Retry 1: same REFERENCE refs + silence lock.
  // Retry 2: FIRST_AND_LAST with canonical bible only (still fails closed if bible missing).
  if (
    pollResult.error &&
    /unable to generate audio|audio for this request/i.test(pollResult.error)
  ) {
    console.warn(
      `[kie-video] audio-branch fail — retrying same refs with silence lock: ${pollResult.error}`,
    );
    const silentPrompt = `${options.prompt}\n\nSILENT VIDEO ONLY. No speech, no dialogue, no singing. Ambient silence. Visual performance only.`;
    const silentBody = {
      ...requestBody,
      prompt: silentPrompt,
    };
    const retry = await httpJson("https://api.kie.ai/api/v1/veo/generate", {
      method: "POST",
      key: options.apiKey,
      signal: options.signal,
      body: silentBody,
    });
    const retryId = retry.json?.data?.taskId as string | undefined;
    if (!retry.ok || !retryId) {
      throw new Error(
        `KIE retry create failed (${retry.status}): ${JSON.stringify(retry.json).slice(0, 500)}`,
      );
    }
    const retryPoll = await pollKieTask({
      apiKey: options.apiKey,
      taskId: retryId,
      outputPath: options.outputPath,
      pollIntervalMs,
      maxPollAttempts,
      signal: options.signal,
    });
    if (!retryPoll.error) {
      const creditsAfter = await kieCredits(options.apiKey, options.signal).catch(
        () => undefined,
      );
      return {
        videoPath: options.outputPath,
        taskId: retryId,
        rawUri: retryPoll.rawUri!,
        model: effectiveModel,
        pollAttempts: retryPoll.pollAttempts,
        creditsBefore,
        creditsAfter,
        requestEvidence,
      };
    }

    console.warn(
      `[kie-video] silence retry failed — falling back to FIRST_AND_LAST with canonical bible: ${retryPoll.error}`,
    );
    // Prefer bible URL (index 0 when required refs ordered first).
    const bibleOnlyUrls = [imageUrls[0]!];
    const fallbackBody = {
      prompt: silentPrompt,
      imageUrls: bibleOnlyUrls,
      model: effectiveModel,
      generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO" as KieGenerationType,
      aspect_ratio: aspectRatio,
      resolution,
      duration: requestedDuration,
      enableTranslation: false,
    };
    console.log(
      `[kie-video] FINAL HTTP payload (redacted fallback): character=${options.character ?? "n/a"} refs=1 type=FIRST_AND_LAST_FRAMES_2_VIDEO model=${effectiveModel} duration=${requestedDuration} hash=${hashes[0]?.slice(0, 12)}`,
    );
    const fb = await httpJson("https://api.kie.ai/api/v1/veo/generate", {
      method: "POST",
      key: options.apiKey,
      signal: options.signal,
      body: fallbackBody,
    });
    const fbId = fb.json?.data?.taskId as string | undefined;
    if (!fb.ok || !fbId) {
      throw new Error(
        `KIE bible fallback create failed (${fb.status}): ${JSON.stringify(fb.json).slice(0, 500)}`,
      );
    }
    const fbPoll = await pollKieTask({
      apiKey: options.apiKey,
      taskId: fbId,
      outputPath: options.outputPath,
      pollIntervalMs,
      maxPollAttempts,
      signal: options.signal,
    });
    if (fbPoll.error) throw new Error(fbPoll.error);
    const creditsAfter = await kieCredits(options.apiKey, options.signal).catch(
      () => undefined,
    );
    return {
      videoPath: options.outputPath,
      taskId: fbId,
      rawUri: fbPoll.rawUri!,
      model: effectiveModel,
      pollAttempts: fbPoll.pollAttempts,
      creditsBefore,
      creditsAfter,
      requestEvidence: {
        ...requestEvidence,
        generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO",
        imageUrlCount: 1,
        durationSeconds: requestedDuration,
      },
    };
  }

  if (pollResult.error) throw new Error(pollResult.error);

  const creditsAfter = await kieCredits(options.apiKey, options.signal).catch(
    () => undefined,
  );
  return {
    videoPath: options.outputPath,
    taskId,
    rawUri: pollResult.rawUri!,
    model: effectiveModel,
    pollAttempts: pollResult.pollAttempts,
    creditsBefore,
    creditsAfter,
    requestEvidence,
  };
}

async function pollKieTask(options: {
  apiKey: string;
  taskId: string;
  outputPath: string;
  pollIntervalMs: number;
  maxPollAttempts: number;
  signal?: AbortSignal;
}): Promise<{ rawUri?: string; pollAttempts: number; error?: string }> {
  let pollAttempts = 0;
  for (; pollAttempts < options.maxPollAttempts; pollAttempts++) {
    if (options.signal?.aborted) {
      return { pollAttempts, error: "KIE generation cancelled" };
    }
    await sleep(options.pollIntervalMs);
    const poll = await httpJson(
      `https://api.kie.ai/api/v1/veo/record-info?taskId=${encodeURIComponent(options.taskId)}`,
      { key: options.apiKey, signal: options.signal },
    );
    const flag = poll.json?.data?.successFlag;
    if (flag === 1) {
      const urls = poll.json?.data?.response?.resultUrls || [];
      if (!urls[0]) {
        return { pollAttempts: pollAttempts + 1, error: "KIE success without result URL" };
      }
      const rawUri = urls[0] as string;
      const res = await fetch(rawUri, {
        headers: { "User-Agent": "AmyNestKieVideo/1.0" },
        signal: options.signal,
      });
      if (!res.ok) {
        return { pollAttempts: pollAttempts + 1, error: `KIE download ${res.status}` };
      }
      writeFileSync(options.outputPath, Buffer.from(await res.arrayBuffer()));
      return { rawUri, pollAttempts: pollAttempts + 1 };
    }
    if (flag === 2 || flag === 3) {
      return {
        pollAttempts: pollAttempts + 1,
        error: poll.json?.data?.errorMessage || "KIE generation failed",
      };
    }
  }
  return { pollAttempts, error: `KIE timeout taskId=${options.taskId}` };
}
