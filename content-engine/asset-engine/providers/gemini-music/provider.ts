import { createHash } from "node:crypto";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { GeneratedAudioAsset } from "../../../types/gemini-media.js";

export interface GeminiMusicProviderOptions {
  apiKey?: string;
  apiKeyEnv?: string;
  model?: string;
  baseUrl?: string;
  outputDirectory?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  enabled?: boolean;
}

export interface GenerateMusicOptions {
  prompt: string;
  assetId?: string;
  outputPath?: string;
  signal?: AbortSignal;
}

/**
 * Optional Lyria music provider. Disabled by default in config.
 */
export class GeminiMusicProvider {
  readonly id = "gemini-lyria" as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly outputDirectory: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly enabled: boolean;

  constructor(options: GeminiMusicProviderOptions = {}) {
    const envName = options.apiKeyEnv ?? "GEMINI_API_KEY";
    this.apiKey =
      options.apiKey !== undefined
        ? options.apiKey.trim()
        : process.env[envName]?.trim() ||
          process.env.GOOGLE_AI_API_KEY?.trim() ||
          "";
    this.model =
      options.model ??
      process.env.AMYNEST_GEMINI_MUSIC_MODEL ??
      "lyria-3-clip-preview";
    this.baseUrl = (
      options.baseUrl ??
      process.env.AMYNEST_GEMINI_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    this.outputDirectory =
      options.outputDirectory ??
      process.env.AMYNEST_GEMINI_OUTPUT_DIR ??
      ".amynest-assets/gemini/music";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.enabled =
      options.enabled ??
      process.env.AMYNEST_GEMINI_MUSIC_ENABLED === "true";
  }

  async health(): Promise<{ ok: boolean; message: string }> {
    if (!this.enabled) {
      return { ok: true, message: "GeminiMusicProvider optional (disabled)" };
    }
    if (!this.apiKey) return { ok: false, message: "GEMINI_API_KEY missing" };
    return { ok: true, message: `GeminiMusicProvider ready (model=${this.model})` };
  }

  async generateMusic(options: GenerateMusicOptions): Promise<GeneratedAudioAsset> {
    if (!this.enabled) {
      throw new Error("GeminiMusicProvider is disabled");
    }
    if (!this.apiKey) throw new Error("GEMINI_API_KEY required for Lyria");

    const started = Date.now();
    const assetId = options.assetId ?? `music-${Date.now()}`;
    const outputPath =
      options.outputPath ?? join(this.outputDirectory, `${assetId}.wav`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else {
        options.signal.addEventListener("abort", () => controller.abort(), {
          once: true,
        });
      }
    }

    try {
      const prompt = `${options.prompt}. Instrumental only, loopable background music, no vocals, warm family-safe tone.`;
      const response = await this.fetchImpl(
        `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
            },
          }),
          signal: controller.signal,
        },
      );
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Lyria failed (${response.status}): ${text.slice(0, 220)}`);
      }
      const json = JSON.parse(text) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ inlineData?: { data?: string } }>;
          };
        }>;
      };
      const data = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
        ?.inlineData?.data;
      if (!data) throw new Error("Lyria returned no audio");
      const bytes = Buffer.from(data, "base64");
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, bytes);
      const fileStat = await stat(outputPath);
      return {
        audioPath: outputPath,
        provider: "gemini-lyria",
        durationSeconds: 30,
        checksum: createHash("sha256").update(bytes).digest("hex"),
        generationTime: Date.now() - started,
        metadata: {
          model: this.model,
          promptOrScript: prompt,
          mimeType: "audio/wav",
          fileSizeBytes: fileStat.size,
          costEstimateUsd: 0.05,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
