import type { AuthFetchFn } from "@/lib/poll-result";
import { getApiUrl } from "@/lib/api";
import {
  getAllPhonicsAudioKeys,
  resolvePhonicsAudioKey,
} from "@workspace/phonics-sounds";
import { prefetchPhonicsAudioKeys } from "@/lib/phonics-static-audio";

export type TtsPregenerateMode = "default" | "phonics";

/** Phonics mode warms curated /phonics-audio/ clips — never OpenAI/ElevenLabs. */
export function pregenerateTtsTexts(
  authFetch: AuthFetchFn,
  texts: string[],
  mode: TtsPregenerateMode = "default",
): void {
  if (mode === "phonics") {
    const keys = new Set<string>(getAllPhonicsAudioKeys());
    for (const text of texts) {
      const key = resolvePhonicsAudioKey({ text, phoneme: text });
      if (key) keys.add(key);
    }
    prefetchPhonicsAudioKeys([...keys]);
    return;
  }

  const normalized = [...new Set(texts.map((t) => (t ?? "").trim()).filter(Boolean))];
  if (normalized.length === 0) return;

  void authFetch(getApiUrl("/api/tts/pregenerate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: normalized, mode }),
  }).catch((err) => {
    console.warn("[AmyVoice] pregenerate failed", err);
  });
}

export { resolvePhonicsPlaybackText } from "@workspace/phonics-sounds";
