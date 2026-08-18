/**
 * KIE.ai audio — Gemini TTS + Suno music via KIE credits.
 * Used when Google AI Studio prepaid TTS/music is unavailable.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { kieCredits } from "../kie-video/client.js";

function ensureWav(inputPath: string, outputPath: string): void {
  if (inputPath === outputPath && inputPath.toLowerCase().endsWith(".wav")) {
    return;
  }
  execFileSync(
    "ffmpeg",
    ["-y", "-i", inputPath, "-ac", "1", "-ar", "48000", outputPath],
    { stdio: "ignore" },
  );
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
    "User-Agent": "AmyNestKieAudio/1.0",
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

function extractResultUrls(data: any): string[] {
  const raw = data?.resultJson;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.resultUrls)) return parsed.resultUrls;
    } catch {
      /* ignore */
    }
  }
  if (Array.isArray(data?.resultUrls)) return data.resultUrls;
  return [];
}

async function downloadToFile(
  url: string,
  outputPath: string,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    headers: { "User-Agent": "AmyNestKieAudio/1.0" },
    signal,
  });
  if (!res.ok) throw new Error(`KIE audio download ${res.status}`);
  writeFileSync(outputPath, Buffer.from(await res.arrayBuffer()));
}

export interface KieTtsOptions {
  apiKey: string;
  script: string;
  outputPath: string;
  voiceName?: string;
  signal?: AbortSignal;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export interface KieTtsResult {
  audioPath: string;
  taskId: string;
  model: string;
  creditsConsumed?: number;
}

async function kieGenerateTtsSingleTurn(
  options: KieTtsOptions & { text: string; chunkOutputPath: string },
): Promise<KieTtsResult> {
  const voiceName = options.voiceName || process.env.AMYNEST_KIE_TTS_VOICE || "Kore";
  const model = "google/gemini-3-1-flash-tts";
  const create = await httpJson("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    key: options.apiKey,
    signal: options.signal,
    body: {
      model,
      input: {
        temperature: 0.85,
        scene:
          "Warm Indian family home at night — soft parenting short-film narration.",
        sample_context:
          "Gentle Indian English narrator, warm, hopeful, never salesy. Disney+ family short energy.",
        speakers: [
          {
            speaker_id: "Speaker 1",
            voice_name: voiceName,
            audio_profile: "Warm caring parent-facing narrator",
            accent: "Neutral",
            style: "Empathetic",
            pace: "Natural",
          },
        ],
        dialogue_turns: [
          {
            speaker_id: "Speaker 1",
            text: options.text.trim().slice(0, 2500),
          },
        ],
      },
    },
  });

  const taskId =
    (create.json?.data?.taskId as string | undefined) ||
    (create.json?.data?.task_id as string | undefined);
  if (!create.ok || !taskId) {
    throw new Error(
      `KIE TTS create failed (${create.status}): ${JSON.stringify(create.json).slice(0, 600)}`,
    );
  }

  const pollIntervalMs = options.pollIntervalMs ?? 3_000;
  const maxPollAttempts = options.maxPollAttempts ?? 60;
  for (let i = 0; i < maxPollAttempts; i++) {
    if (options.signal?.aborted) throw new Error("KIE TTS cancelled");
    await sleep(pollIntervalMs);
    const poll = await httpJson(
      `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { key: options.apiKey, signal: options.signal },
    );
    const state = String(poll.json?.data?.state || "").toLowerCase();
    if (state === "success") {
      const urls = extractResultUrls(poll.json?.data);
      if (!urls[0]) {
        throw new Error(
          `KIE TTS success without URL: ${JSON.stringify(poll.json).slice(0, 400)}`,
        );
      }
      const rawPath = `${options.chunkOutputPath}.raw-download`;
      await downloadToFile(urls[0], rawPath, options.signal);
      ensureWav(rawPath, options.chunkOutputPath);
      return {
        audioPath: options.chunkOutputPath,
        taskId,
        model,
        creditsConsumed: Number(poll.json?.data?.creditsConsumed ?? NaN) || undefined,
      };
    }
    if (state === "fail" || state === "failed") {
      throw new Error(
        `KIE TTS failed: ${JSON.stringify(poll.json).slice(0, 500)}`,
      );
    }
  }
  throw new Error(`KIE TTS timed out (taskId=${taskId})`);
}

function concatWavFiles(chunkPaths: string[], outputPath: string): void {
  if (chunkPaths.length === 1) {
    ensureWav(chunkPaths[0]!, outputPath);
    return;
  }
  const listPath = `${outputPath}.concat.txt`;
  writeFileSync(
    listPath,
    chunkPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
  );
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-ac",
      "1",
      "-ar",
      "48000",
      outputPath,
    ],
    { stdio: "ignore" },
  );
}

/**
 * Generate full narration. Long single-turn KIE TTS truncates (~11s).
 * Fix: exact sentence chunks as separate jobs, then lossless concat — wording unchanged.
 */
export async function kieGenerateTts(
  options: KieTtsOptions,
): Promise<KieTtsResult> {
  const model = "google/gemini-3-1-flash-tts";
  const full = options.script.trim().slice(0, 10000);
  const chunks = full
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const parts = chunks.length ? chunks : [full];

  const outDir = dirname(options.outputPath);
  const chunkPaths: string[] = [];
  let lastTaskId = "";
  let credits = 0;

  for (let i = 0; i < parts.length; i++) {
    const chunkPath = join(outDir, `narration-chunk-${String(i).padStart(2, "0")}.wav`);
    const part = await kieGenerateTtsSingleTurn({
      ...options,
      text: parts[i]!,
      chunkOutputPath: chunkPath,
    });
    chunkPaths.push(part.audioPath);
    lastTaskId = part.taskId;
    if (part.creditsConsumed) credits += part.creditsConsumed;
  }

  const rawMerged = options.outputPath.toLowerCase().endsWith(".wav")
    ? options.outputPath.replace(/\.wav$/i, ".raw-download")
    : `${options.outputPath}.raw-download`;
  concatWavFiles(chunkPaths, options.outputPath);
  // Keep a merged raw sibling for forensic duration checks
  try {
    ensureWav(options.outputPath, rawMerged);
  } catch {
    /* non-fatal */
  }

  return {
    audioPath: options.outputPath,
    taskId: lastTaskId,
    model,
    creditsConsumed: credits || undefined,
  };
}

export interface KieMusicOptions {
  apiKey: string;
  prompt: string;
  outputPath: string;
  title?: string;
  style?: string;
  signal?: AbortSignal;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export interface KieMusicResult {
  audioPath: string;
  taskId: string;
  model: string;
}

export async function kieGenerateMusic(
  options: KieMusicOptions,
): Promise<KieMusicResult> {
  const model = process.env.AMYNEST_KIE_SUNO_MODEL?.trim() || "V4";
  const create = await httpJson("https://api.kie.ai/api/v1/generate", {
    method: "POST",
    key: options.apiKey,
    signal: options.signal,
    body: {
      prompt: options.prompt.trim().slice(0, 500),
      customMode: true,
      instrumental: true,
      model,
      style: (
        options.style ||
        "Soft acoustic piano, warm hopeful parenting underscore, gentle short film"
      ).slice(0, 200),
      title: (options.title || "AmyNest Warm Underscore").slice(0, 80),
      // Required by Suno API; we poll record-info instead of relying on callback.
      callBackUrl:
        process.env.AMYNEST_KIE_SUNO_CALLBACK_URL?.trim() ||
        "https://example.com/amynest-suno-callback",
    },
  });

  const taskId = create.json?.data?.taskId as string | undefined;
  if (!create.ok || !taskId) {
    throw new Error(
      `KIE Suno create failed (${create.status}): ${JSON.stringify(create.json).slice(0, 600)}`,
    );
  }

  const pollIntervalMs = options.pollIntervalMs ?? 4_000;
  const maxPollAttempts = options.maxPollAttempts ?? 90;
  for (let i = 0; i < maxPollAttempts; i++) {
    if (options.signal?.aborted) throw new Error("KIE music cancelled");
    await sleep(pollIntervalMs);
    const poll = await httpJson(
      `https://api.kie.ai/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
      { key: options.apiKey, signal: options.signal },
    );
    const status = String(poll.json?.data?.status || "");
    if (status === "SUCCESS" || status === "FIRST_SUCCESS") {
      const tracks = poll.json?.data?.response?.sunoData;
      const audioUrl =
        (Array.isArray(tracks) && tracks[0]?.audioUrl) ||
        (Array.isArray(tracks) && tracks[0]?.streamAudioUrl);
      if (!audioUrl) {
        if (status === "FIRST_SUCCESS") continue;
        throw new Error(
          `KIE Suno success without audio URL: ${JSON.stringify(poll.json).slice(0, 500)}`,
        );
      }
      const rawPath = join(
        dirname(options.outputPath),
        `suno-raw-${Date.now()}.mp3`,
      );
      await downloadToFile(audioUrl, rawPath, options.signal);
      ensureWav(rawPath, options.outputPath);
      return { audioPath: options.outputPath, taskId, model: `kie-suno/${model}` };
    }
    if (
      status.includes("FAIL") ||
      status === "SENSITIVE_WORD_ERROR" ||
      status === "CREATE_TASK_FAILED" ||
      status === "GENERATE_AUDIO_FAILED"
    ) {
      throw new Error(
        `KIE Suno failed (${status}): ${JSON.stringify(poll.json).slice(0, 500)}`,
      );
    }
  }
  throw new Error(`KIE Suno timed out (taskId=${taskId})`);
}

export { kieCredits };
