import type { AuthFetchFn } from "@/lib/poll-result";
import { prefetchLocalTts } from "@/lib/local-tts-cache";
import { normalizeAmyVoiceText, type AmyVoiceMode } from "@/lib/amy-voice-controller";

type PregenerateResponse = {
  ok?: boolean;
  cacheKey?: string;
  audioUrl?: string;
  success?: boolean;
};

/**
 * Fire-and-forget batch warm of server TTS cache (+ optional local prefetch per item).
 * Does not block UI — callers should not await unless debugging.
 */
export function pregenerateTtsTexts(
  authFetch: AuthFetchFn,
  texts: string[],
  mode: AmyVoiceMode = "default",
): void {
  const normalized = [
    ...new Set(
      texts
        .map((t) => normalizeAmyVoiceText(t, mode))
        .filter((t) => t.length > 0),
    ),
  ];
  if (normalized.length === 0) return;

  void (async () => {
    try {
      const res = await authFetch("/api/tts/pregenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: normalized, mode }),
      });
      if (!res.ok) {
        console.warn("[AmyVoice] pregenerate HTTP", res.status);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; succeeded?: number };
      if (__DEV__) {
        console.info("[AmyVoice] pregenerate done", data);
      }
    } catch (err) {
      console.warn("[AmyVoice] pregenerate failed", err);
    }
  })();
}

/** Warm local device cache for a known cacheKey + proxy URL (after synthesize). */
export function warmLocalTts(cacheKey: string, audioUrl: string): void {
  if (!cacheKey || !audioUrl) return;
  void prefetchLocalTts(cacheKey, audioUrl);
}

export type { PregenerateResponse };
