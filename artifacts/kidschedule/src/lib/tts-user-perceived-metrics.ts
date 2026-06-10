import type { AuthFetchFn } from "@/lib/poll-result";
import { getApiUrl } from "@/lib/api";

export type UserTtsTimingSample = {
  feature?: string;
  route: string;
  requestStartMs: number;
  firstNetworkByteMs: number | null;
  firstPlayableByteMs: number | null;
  downloadCompleteMs: number | null;
  userPlaybackStartMs: number | null;
  userFirstAudioHeardMs: number | null;
  playbackStartedBeforeDownloadComplete: boolean;
  streamingUsed: boolean;
  cacheKey?: string;
};

const pending: UserTtsTimingSample[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function recordUserTtsTiming(sample: UserTtsTimingSample): void {
  pending.push(sample);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushUserTtsTimings();
  }, 2_000);
}

export async function flushUserTtsTimings(authFetch?: AuthFetchFn): Promise<void> {
  if (pending.length === 0 || !authFetch) return;
  const batch = pending.splice(0, 20);
  try {
    await authFetch(getApiUrl("/api/tts/client-metrics"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples: batch }),
    });
  } catch {
    pending.unshift(...batch);
  }
}

export function buildUserTtsTiming(
  startedAt: number,
  partial: Partial<UserTtsTimingSample> & Pick<UserTtsTimingSample, "route">,
): UserTtsTimingSample {
  const elapsed = Date.now() - startedAt;
  const downloadCompleteMs = partial.downloadCompleteMs ?? null;
  const userPlaybackStartMs = partial.userPlaybackStartMs ?? null;
  return {
    route: partial.route,
    feature: partial.feature,
    requestStartMs: elapsed,
    firstNetworkByteMs: partial.firstNetworkByteMs ?? null,
    firstPlayableByteMs: partial.firstPlayableByteMs ?? null,
    downloadCompleteMs,
    userPlaybackStartMs,
    userFirstAudioHeardMs: partial.userFirstAudioHeardMs ?? userPlaybackStartMs,
    playbackStartedBeforeDownloadComplete:
      userPlaybackStartMs != null &&
      downloadCompleteMs != null &&
      userPlaybackStartMs < downloadCompleteMs,
    streamingUsed: partial.streamingUsed ?? false,
    cacheKey: partial.cacheKey,
  };
}
