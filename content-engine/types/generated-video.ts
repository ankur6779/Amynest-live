/**
 * Generated video asset produced by a real video-generation provider (e.g. Gemini/Veo).
 * Lives alongside ResolvedAsset — providers map this into the AssetPackage path.
 */
export interface GeneratedVideoAsset {
  videoPath: string;
  provider: "google-veo";
  duration: number;
  resolution: string;
  fps: number;
  checksum: string;
  metadata: GeneratedVideoMetadata;
  generationTime: number;
}

export interface GeneratedVideoMetadata {
  model: string;
  operationName: string;
  prompt: string;
  aspectRatio: string;
  requestedDurationSeconds: number;
  mimeType: string;
  fileSizeBytes: number;
  hasAudio: boolean;
  sceneId?: string;
  assetId?: string;
  costEstimateUsd: number;
  pollAttempts: number;
  downloadedAt: string;
  rawUri?: string;
}

export interface GeminiVideoProviderSettings {
  /** Env var holding the Google AI Studio / Gemini API key. Default: GEMINI_API_KEY */
  apiKeyEnv: string;
  /** Veo model id. Default: veo-3.1-generate-preview */
  model: string;
  /** API base URL. Default: https://generativelanguage.googleapis.com/v1beta */
  baseUrl: string;
  /** Output resolution hint: 720p | 1080p */
  resolution: "720p" | "1080p";
  /** Requested Veo duration (API allows 4 | 6 | 8). Default: 8 */
  durationSeconds: 4 | 6 | 8;
  /** Polling interval ms. Default: 5000 */
  pollingIntervalMs: number;
  /** Max poll attempts before timeout. Default: 120 */
  maxPollAttempts: number;
  /** HTTP/start retries. Default: 3 */
  retryCount: number;
  /** Overall generation timeout ms. Default: 600000 (10 min) */
  timeoutMs: number;
  /** Directory for downloaded clips (relative to cwd or absolute). */
  outputDirectory: string;
  /** personGeneration policy for text-to-video. */
  personGeneration: "allow_all" | "allow_adult" | "dont_allow";
  /** When false, provider returns null from resolve() even if keyed. */
  enabled: boolean;
}

export const DEFAULT_GEMINI_VIDEO_SETTINGS: GeminiVideoProviderSettings = {
  apiKeyEnv: "GEMINI_API_KEY",
  /** Daily default — use premium/budget via AMYNEST_VEO_TIER or AMYNEST_VEO_MODEL. */
  model: "veo-3.1-fast-generate-preview",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  resolution: "720p",
  durationSeconds: 8,
  pollingIntervalMs: 5_000,
  maxPollAttempts: 120,
  retryCount: 3,
  timeoutMs: 600_000,
  outputDirectory: ".amynest-assets/veo",
  personGeneration: "allow_all",
  /** Opt-in via AMYNEST_VEO_ENABLED / AMYNEST_GEMINI_ENABLED after live validation. */
  enabled: false,
};
