/**
 * Provider capability detection — Scene Composer adapts clip splits automatically.
 * Adding a new provider = register capabilities. No architecture change.
 */

import type { VideoClipProviderId, VideoProviderCapabilities } from "./types.js";

const CAPABILITIES: Record<VideoClipProviderId, VideoProviderCapabilities> = {
  "google-veo": {
    providerId: "google-veo",
    maxClipSeconds: 8,
    allowedClipSeconds: [4, 6, 8],
    minClipSeconds: 4,
    supportsAudio: true,
    supportsVertical: true,
    label: "Google Veo",
  },
  "gemini-video": {
    providerId: "gemini-video",
    maxClipSeconds: 8,
    allowedClipSeconds: [4, 6, 8],
    minClipSeconds: 4,
    supportsAudio: true,
    supportsVertical: true,
    label: "Gemini Video",
  },
  "openai-video": {
    providerId: "openai-video",
    maxClipSeconds: 10,
    allowedClipSeconds: [4, 8, 10],
    minClipSeconds: 4,
    supportsAudio: true,
    supportsVertical: true,
    label: "OpenAI Video (future)",
  },
  runway: {
    providerId: "runway",
    maxClipSeconds: 10,
    allowedClipSeconds: [5, 10],
    minClipSeconds: 5,
    supportsAudio: false,
    supportsVertical: true,
    label: "Runway (future)",
  },
  pika: {
    providerId: "pika",
    maxClipSeconds: 5,
    allowedClipSeconds: [3, 5],
    minClipSeconds: 3,
    supportsAudio: false,
    supportsVertical: true,
    label: "Pika (future)",
  },
  luma: {
    providerId: "luma",
    maxClipSeconds: 5,
    allowedClipSeconds: [5],
    minClipSeconds: 5,
    supportsAudio: false,
    supportsVertical: true,
    label: "Luma (future)",
  },
  mock: {
    providerId: "mock",
    maxClipSeconds: 30,
    allowedClipSeconds: [15, 20, 30],
    minClipSeconds: 2,
    supportsAudio: true,
    supportsVertical: true,
    label: "Mock (planning / tests)",
  },
  future: {
    providerId: "future",
    maxClipSeconds: 30,
    minClipSeconds: 2,
    supportsAudio: true,
    supportsVertical: true,
    label: "Future provider placeholder",
  },
};

export function getVideoProviderCapabilities(
  providerId: VideoClipProviderId | string,
): VideoProviderCapabilities {
  if (providerId in CAPABILITIES) {
    return CAPABILITIES[providerId as VideoClipProviderId];
  }
  // Unknown future provider: assume conservative 8s clips until registered.
  return {
    providerId: "future",
    maxClipSeconds: 8,
    minClipSeconds: 2,
    supportsAudio: true,
    supportsVertical: true,
    label: `Unregistered provider (${providerId})`,
  };
}

/** Resolve active provider from env / config without changing architecture. */
export function detectActiveVideoProvider(input?: {
  providerId?: string;
  env?: NodeJS.ProcessEnv;
}): VideoProviderCapabilities {
  const env = input?.env ?? process.env;
  const fromInput = input?.providerId?.trim();
  if (fromInput) return getVideoProviderCapabilities(fromInput);

  const fromEnv =
    env.AMYNEST_VIDEO_PROVIDER?.trim() ||
    (env.AMYNEST_VEO_ENABLED === "true" || env.AMYNEST_GEMINI_ENABLED === "true"
      ? "google-veo"
      : undefined);

  if (fromEnv) return getVideoProviderCapabilities(fromEnv);
  return getVideoProviderCapabilities("mock");
}

/**
 * Snap a desired duration to the nearest allowed provider clip length,
 * never exceeding maxClipSeconds.
 */
export function snapClipDuration(
  desiredSeconds: number,
  capabilities: VideoProviderCapabilities,
): number {
  const max = capabilities.maxClipSeconds;
  const min = capabilities.minClipSeconds;
  const clamped = Math.min(max, Math.max(min, desiredSeconds));
  const allowed = capabilities.allowedClipSeconds;
  if (!allowed || allowed.length === 0) {
    return round1(clamped);
  }
  let best = allowed[0]!;
  let bestDelta = Math.abs(clamped - best);
  for (const candidate of allowed) {
    if (candidate > max) continue;
    const delta = Math.abs(clamped - candidate);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function listRegisteredVideoProviders(): VideoProviderCapabilities[] {
  return Object.values(CAPABILITIES);
}
