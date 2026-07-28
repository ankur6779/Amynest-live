import { createHash } from "node:crypto";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  AssetCostEstimate,
  AssetProviderHealth,
  AssetRequest,
  AssetResolveContext,
  ResolvedAsset,
} from "../../../types/asset-package.js";
import type { GeneratedImageAsset } from "../../../types/gemini-media.js";
import { BaseAssetProvider } from "../base.js";

export interface GeminiImageProviderOptions {
  apiKey?: string;
  apiKeyEnv?: string;
  model?: string;
  premiumModel?: string;
  fallbackModel?: string;
  baseUrl?: string;
  outputDirectory?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  enabled?: boolean;
}

export interface GenerateImageOptions {
  prompt: string;
  assetId?: string;
  outputPath?: string;
  premium?: boolean;
  signal?: AbortSignal;
}

/**
 * Google Imagen / Gemini image provider (asset id: google-imagen).
 */
export class GeminiImageProvider extends BaseAssetProvider {
  readonly id = "google-imagen" as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly premiumModel: string;
  private readonly fallbackModel: string;
  private readonly baseUrl: string;
  private readonly outputDirectory: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly enabled: boolean;

  constructor(options: GeminiImageProviderOptions = {}) {
    super();
    const envName = options.apiKeyEnv ?? "GEMINI_API_KEY";
    this.apiKey =
      options.apiKey !== undefined
        ? options.apiKey.trim()
        : process.env[envName]?.trim() ||
          process.env.GOOGLE_AI_API_KEY?.trim() ||
          "";
    this.model =
      options.model ??
      process.env.AMYNEST_GEMINI_IMAGE_MODEL ??
      "imagen-4.0-fast-generate-001";
    this.premiumModel =
      options.premiumModel ??
      process.env.AMYNEST_GEMINI_IMAGE_PREMIUM_MODEL ??
      "imagen-4.0-ultra-generate-001";
    this.fallbackModel =
      options.fallbackModel ??
      process.env.AMYNEST_GEMINI_IMAGE_FALLBACK_MODEL ??
      "gemini-3.1-flash-image";
    this.baseUrl = (
      options.baseUrl ??
      process.env.AMYNEST_GEMINI_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    this.outputDirectory =
      options.outputDirectory ??
      process.env.AMYNEST_GEMINI_OUTPUT_DIR ??
      ".amynest-assets/gemini/images";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 90_000;
    this.enabled = options.enabled ?? true;
  }

  supportsImages(): boolean {
    return true;
  }
  supportsVideo(): boolean {
    return false;
  }

  override estimateCost(_request: AssetRequest): AssetCostEstimate {
    return { currency: "USD", amount: 0.04, unit: "asset" };
  }

  override async health(): Promise<AssetProviderHealth> {
    const checkedAt = new Date().toISOString();
    if (!this.enabled) {
      return { ok: false, message: "GeminiImageProvider disabled", checkedAt };
    }
    if (!this.apiKey) {
      return { ok: false, message: "GEMINI_API_KEY missing", checkedAt };
    }
    return {
      ok: true,
      message: `GeminiImageProvider ready (model=${this.model})`,
      checkedAt,
    };
  }

  async generateImage(options: GenerateImageOptions): Promise<GeneratedImageAsset> {
    if (!this.enabled || !this.apiKey) {
      throw new Error("GeminiImageProvider requires GEMINI_API_KEY");
    }
    const started = Date.now();
    const assetId = options.assetId ?? `img-${Date.now()}`;
    const outputPath =
      options.outputPath ?? join(this.outputDirectory, `${assetId}.png`);
    const models = [
      options.premium ? this.premiumModel : this.model,
      this.fallbackModel,
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let lastError: unknown;
    for (const model of models) {
      try {
        const bytes = model.startsWith("imagen-")
          ? await this.predictImagen(model, options.prompt, options.signal)
          : await this.generateGeminiImage(model, options.prompt, options.signal);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, bytes);
        const fileStat = await stat(outputPath);
        const checksum = createHash("sha256").update(bytes).digest("hex");
        return {
          imagePath: outputPath,
          provider: "google-imagen",
          width: 1080,
          height: 1920,
          checksum,
          generationTime: Date.now() - started,
          metadata: {
            model,
            prompt: options.prompt,
            mimeType: "image/png",
            fileSizeBytes: fileStat.size,
            costEstimateUsd: model.includes("ultra") ? 0.08 : 0.04,
          },
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Image generation failed");
  }

  async resolve(
    request: AssetRequest,
    context: AssetResolveContext,
  ): Promise<ResolvedAsset | null> {
    if (!this.enabled || !this.apiKey || !context.allowGenerationPlanning) {
      return null;
    }
    const imageTypes = new Set([
      "AI Image",
      "Promo Image",
      "Illustration",
      "Icon Animation",
    ]);
    if (!imageTypes.has(request.assetType)) return null;

    try {
      const generated = await this.generateImage({
        prompt: request.prompt,
        assetId: request.assetId,
      });
      return this.buildResolved(request, context, {
        path: generated.imagePath,
        status: "resolved",
        license: "Google Imagen / Gemini Generated — AmyNest production use",
        costEstimateUsd: generated.metadata.costEstimateUsd,
        metadata: {
          source: this.id,
          mode: "generated",
          model: generated.metadata.model,
          checksum: generated.checksum,
          fileSizeBytes: generated.metadata.fileSizeBytes,
          generationTimeMs: generated.generationTime,
        },
      });
    } catch {
      return null;
    }
  }

  private async predictImagen(
    model: string,
    prompt: string,
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
        `${this.baseUrl}/models/${encodeURIComponent(model)}:predict`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "9:16",
            },
          }),
          signal: controller.signal,
        },
      );
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Imagen ${model} failed (${response.status}): ${text.slice(0, 200)}`);
      }
      const json = JSON.parse(text) as {
        predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
      };
      const b64 = json.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) throw new Error("Imagen returned no image bytes");
      return Buffer.from(b64, "base64");
    } finally {
      clearTimeout(timer);
    }
  }

  private async generateGeminiImage(
    model: string,
    prompt: string,
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
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
          signal: controller.signal,
        },
      );
      const text = await response.text();
      if (!response.ok) {
        throw new Error(
          `Gemini image ${model} failed (${response.status}): ${text.slice(0, 200)}`,
        );
      }
      const json = JSON.parse(text) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }>;
          };
        }>;
      };
      const data = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
        ?.inlineData?.data;
      if (!data) throw new Error("Gemini image returned no inline data");
      return Buffer.from(data, "base64");
    } finally {
      clearTimeout(timer);
    }
  }
}
