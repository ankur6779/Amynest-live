/**
 * KIE.ai Kling 3.0 image-to-video client (Market jobs API).
 * Bakeoff / optional path — does not replace KIE Veo production default.
 */

import { writeFileSync } from "node:fs";
import { kieCredits, kieUploadImage } from "../kie-video/client.js";

export type KieKlingMode = "std" | "pro" | "4K";

export interface KieKlingGenerateOptions {
  apiKey: string;
  prompt: string;
  imagePath: string;
  outputPath: string;
  /** std = 720p (9:16 → 720×1280). pro = 1080p. */
  mode?: KieKlingMode;
  durationSeconds?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  sound?: boolean;
  uploadPath?: string;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  signal?: AbortSignal;
}

export interface KieKlingGenerateResult {
  videoPath: string;
  taskId: string;
  rawUri: string;
  model: string;
  mode: KieKlingMode;
  pollAttempts: number;
  creditsBefore?: number;
  creditsAfter?: number;
  creditsConsumed?: number;
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
    "User-Agent": "AmyNestKieKling/1.0",
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

function clampDuration(seconds: number): string {
  const n = Math.max(3, Math.min(15, Math.round(seconds)));
  return String(n);
}

export async function kieGenerateKlingVideo(
  options: KieKlingGenerateOptions,
): Promise<KieKlingGenerateResult> {
  const mode = options.mode ?? "std";
  const aspectRatio = options.aspectRatio ?? "9:16";
  const duration = clampDuration(options.durationSeconds ?? 5);
  const sound = options.sound ?? false;
  const pollIntervalMs = options.pollIntervalMs ?? 8_000;
  const maxPollAttempts = options.maxPollAttempts ?? 120;
  const model = "kling-3.0/video";

  const creditsBefore = await kieCredits(options.apiKey, options.signal).catch(
    () => undefined,
  );

  const imageUrl = await kieUploadImage(
    options.apiKey,
    options.imagePath,
    `amynest-kling-${Date.now()}.png`,
    options.uploadPath ?? "amynest-kling-bakeoff",
    options.signal,
  );

  // Keep prompt within practical API limits.
  const prompt = options.prompt.trim().slice(0, 2500);

  const create = await httpJson("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    key: options.apiKey,
    signal: options.signal,
    body: {
      model,
      input: {
        prompt,
        image_urls: [imageUrl],
        sound,
        duration,
        aspect_ratio: aspectRatio,
        mode,
        multi_shots: false,
      },
    },
  });

  const taskId =
    (create.json?.data?.taskId as string | undefined) ||
    (create.json?.data?.task_id as string | undefined);
  if (!create.ok || !taskId) {
    throw new Error(
      `KIE Kling create failed (${create.status}): ${JSON.stringify(create.json).slice(0, 600)}`,
    );
  }

  let pollAttempts = 0;
  for (; pollAttempts < maxPollAttempts; pollAttempts++) {
    if (options.signal?.aborted) {
      throw new Error("KIE Kling generation cancelled");
    }
    await sleep(pollIntervalMs);
    const poll = await httpJson(
      `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { key: options.apiKey, signal: options.signal },
    );
    const state = String(poll.json?.data?.state || "").toLowerCase();
    if (state === "success") {
      let resultUrls: string[] = [];
      const raw = poll.json?.data?.resultJson;
      if (typeof raw === "string" && raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          resultUrls = parsed?.resultUrls || [];
        } catch {
          /* ignore */
        }
      } else if (Array.isArray(poll.json?.data?.resultUrls)) {
        resultUrls = poll.json.data.resultUrls;
      }
      if (!resultUrls[0]) {
        throw new Error(
          `KIE Kling success without result URL: ${JSON.stringify(poll.json).slice(0, 400)}`,
        );
      }
      const rawUri = resultUrls[0] as string;
      const res = await fetch(rawUri, {
        headers: { "User-Agent": "AmyNestKieKling/1.0" },
        signal: options.signal,
      });
      if (!res.ok) throw new Error(`KIE Kling download ${res.status}`);
      writeFileSync(options.outputPath, Buffer.from(await res.arrayBuffer()));
      const creditsAfter = await kieCredits(options.apiKey, options.signal).catch(
        () => undefined,
      );
      const creditsConsumed =
        typeof poll.json?.data?.creditsConsumed === "number"
          ? Number(poll.json.data.creditsConsumed)
          : creditsBefore != null && creditsAfter != null
            ? Math.max(0, creditsBefore - creditsAfter)
            : undefined;
      return {
        videoPath: options.outputPath,
        taskId,
        rawUri,
        model,
        mode,
        pollAttempts: pollAttempts + 1,
        creditsBefore,
        creditsAfter,
        creditsConsumed,
      };
    }
    if (state === "fail") {
      throw new Error(
        poll.json?.data?.failMsg ||
          poll.json?.msg ||
          "KIE Kling generation failed",
      );
    }
  }
  throw new Error(`KIE Kling timeout taskId=${taskId}`);
}

export { kieCredits };
