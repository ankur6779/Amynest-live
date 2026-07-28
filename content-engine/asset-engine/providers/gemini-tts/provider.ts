import { createHash } from "node:crypto";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { GeneratedAudioAsset } from "../../../types/gemini-media.js";

export interface GeminiTtsProviderOptions {
  apiKey?: string;
  apiKeyEnv?: string;
  model?: string;
  fallbackModel?: string;
  voiceName?: string;
  baseUrl?: string;
  outputDirectory?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  enabled?: boolean;
}

export interface GenerateNarrationOptions {
  script: string;
  assetId?: string;
  outputPath?: string;
  voiceName?: string;
  signal?: AbortSignal;
}

/**
 * Gemini TTS narration provider (not an AssetProvider — used by media stack / CLI).
 */
export class GeminiTtsProvider {
  readonly id = "gemini-tts" as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallbackModel: string;
  private readonly voiceName: string;
  private readonly baseUrl: string;
  private readonly outputDirectory: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly enabled: boolean;

  constructor(options: GeminiTtsProviderOptions = {}) {
    const envName = options.apiKeyEnv ?? "GEMINI_API_KEY";
    this.apiKey =
      options.apiKey !== undefined
        ? options.apiKey.trim()
        : process.env[envName]?.trim() ||
          process.env.GOOGLE_AI_API_KEY?.trim() ||
          "";
    this.model =
      options.model ??
      process.env.AMYNEST_GEMINI_TTS_MODEL ??
      "gemini-3.1-flash-tts-preview";
    this.fallbackModel =
      options.fallbackModel ??
      process.env.AMYNEST_GEMINI_TTS_FALLBACK_MODEL ??
      "gemini-2.5-flash-preview-tts";
    this.voiceName =
      options.voiceName ?? process.env.AMYNEST_GEMINI_TTS_VOICE ?? "Kore";
    this.baseUrl = (
      options.baseUrl ??
      process.env.AMYNEST_GEMINI_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    this.outputDirectory =
      options.outputDirectory ??
      process.env.AMYNEST_GEMINI_OUTPUT_DIR ??
      ".amynest-assets/gemini/tts";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.enabled = options.enabled ?? true;
  }

  async health(): Promise<{ ok: boolean; message: string }> {
    if (!this.enabled) return { ok: false, message: "GeminiTtsProvider disabled" };
    if (!this.apiKey) return { ok: false, message: "GEMINI_API_KEY missing" };
    return { ok: true, message: `GeminiTtsProvider ready (model=${this.model})` };
  }

  async generateNarration(
    options: GenerateNarrationOptions,
  ): Promise<GeneratedAudioAsset> {
    if (!this.enabled || !this.apiKey) {
      throw new Error("GeminiTtsProvider requires GEMINI_API_KEY");
    }
    const started = Date.now();
    const assetId = options.assetId ?? `tts-${Date.now()}`;
    const outputPath =
      options.outputPath ?? join(this.outputDirectory, `${assetId}.wav`);
    const voiceName = options.voiceName ?? this.voiceName;
    const models = [this.model, this.fallbackModel].filter(
      (m, i, arr) => m && arr.indexOf(m) === i,
    );

    let lastError: unknown;
    for (const model of models) {
      try {
        const bytes = await this.synthesize(model, options.script, voiceName, options.signal);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, bytes);
        const fileStat = await stat(outputPath);
        const checksum = createHash("sha256").update(bytes).digest("hex");
        const durationSeconds = estimateWavDurationSeconds(bytes) ?? estimateSpeechSeconds(options.script);
        return {
          audioPath: outputPath,
          provider: "gemini-tts",
          durationSeconds,
          checksum,
          generationTime: Date.now() - started,
          metadata: {
            model,
            promptOrScript: options.script,
            mimeType: "audio/wav",
            fileSizeBytes: fileStat.size,
            costEstimateUsd: 0.02,
            voiceName,
          },
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("TTS generation failed");
  }

  private async synthesize(
    model: string,
    script: string,
    voiceName: string,
    signal?: AbortSignal,
  ): Promise<Buffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
      const response = await this.fetchImpl(
        `${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: script }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          }),
          signal: controller.signal,
        },
      );
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`TTS ${model} failed (${response.status}): ${text.slice(0, 220)}`);
      }
      const json = JSON.parse(text) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }>;
          };
        }>;
      };
      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) {
        throw new Error("TTS returned no audio data");
      }
      const raw = Buffer.from(part.inlineData.data, "base64");
      // Gemini often returns PCM; wrap as WAV when no RIFF header.
      if (raw.length >= 4 && raw.toString("ascii", 0, 4) === "RIFF") {
        return raw;
      }
      return pcmToWav(raw, 24_000, 1);
    } finally {
      clearTimeout(timer);
    }
  }
}

function estimateSpeechSeconds(script: string): number {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.min(12, words / 2.4));
}

function estimateWavDurationSeconds(buf: Buffer): number | null {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF") return null;
  const sampleRate = buf.readUInt32LE(24);
  const byteRate = buf.readUInt32LE(28);
  if (!byteRate) return null;
  const dataSize = buf.length - 44;
  return dataSize / byteRate || dataSize / (sampleRate * 2);
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels: number): Buffer {
  const blockAlign = channels * 2;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
