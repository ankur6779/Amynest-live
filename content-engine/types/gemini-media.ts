/**
 * Gemini AI Studio media-stack configuration.
 * One GEMINI_API_KEY drives text, image, video, TTS, and optional music.
 */
export interface GeminiMediaStackSettings {
  apiKeyEnv: string;
  baseUrl: string;
  enabled: boolean;
  /** Max concurrent Gemini media jobs (engine soft limit). */
  maxConcurrentJobs: number;
  pollingIntervalMs: number;
  timeoutMs: number;
  retryCount: number;
  outputDirectory: string;
  script: {
    model: string;
    fallbackModel: string;
    premiumModel: string;
  };
  image: {
    model: string;
    premiumModel: string;
    fallbackModel: string;
  };
  video: {
    /** daily | premium | budget */
    tier: "daily" | "premium" | "budget";
    dailyModel: string;
    premiumModel: string;
    budgetModel: string;
    durationSeconds: 4 | 6 | 8;
    resolution: "720p" | "1080p";
  };
  voice: {
    model: string;
    fallbackModel: string;
    voiceName: string;
  };
  music: {
    enabled: boolean;
    model: string;
  };
}

export const DEFAULT_GEMINI_MEDIA_SETTINGS: GeminiMediaStackSettings = {
  apiKeyEnv: "GEMINI_API_KEY",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  enabled: false,
  maxConcurrentJobs: 2,
  pollingIntervalMs: 5_000,
  timeoutMs: 600_000,
  retryCount: 3,
  outputDirectory: ".amynest-assets/gemini",
  script: {
    model: "gemini-3.6-flash",
    fallbackModel: "gemini-3.1-flash-lite",
    premiumModel: "gemini-3.1-pro-preview",
  },
  image: {
    model: "imagen-4.0-fast-generate-001",
    premiumModel: "imagen-4.0-ultra-generate-001",
    fallbackModel: "gemini-3.1-flash-image",
  },
  video: {
    tier: "daily",
    dailyModel: "veo-3.1-fast-generate-preview",
    premiumModel: "veo-3.1-generate-preview",
    budgetModel: "veo-3.1-lite-generate-preview",
    durationSeconds: 8,
    resolution: "720p",
  },
  voice: {
    model: "gemini-3.1-flash-tts-preview",
    fallbackModel: "gemini-2.5-flash-preview-tts",
    voiceName: "Kore",
  },
  music: {
    enabled: false,
    model: "lyria-3-clip-preview",
  },
};

export interface GeneratedImageAsset {
  imagePath: string;
  provider: "google-imagen";
  width: number;
  height: number;
  checksum: string;
  generationTime: number;
  metadata: {
    model: string;
    prompt: string;
    mimeType: string;
    fileSizeBytes: number;
    costEstimateUsd: number;
  };
}

export interface GeneratedAudioAsset {
  audioPath: string;
  provider: "gemini-tts" | "gemini-lyria";
  durationSeconds: number;
  checksum: string;
  generationTime: number;
  metadata: {
    model: string;
    promptOrScript: string;
    mimeType: string;
    fileSizeBytes: number;
    costEstimateUsd: number;
    voiceName?: string;
  };
}

export interface GeminiModelHealth {
  model: string;
  ok: boolean;
  message: string;
  latencyMs: number;
}

export function resolveVideoModelId(
  settings: GeminiMediaStackSettings["video"],
): string {
  switch (settings.tier) {
    case "premium":
      return settings.premiumModel;
    case "budget":
      return settings.budgetModel;
    default:
      return settings.dailyModel;
  }
}
