import type { AuthFetchFn } from "@/lib/poll-result";
import { getApiUrl } from "@/lib/api";
import { resolvePhonicsPlaybackText } from "@workspace/phonics-sounds";
import { getPhonicsAudioText } from "@workspace/phonics-sounds";

export type TtsPregenerateMode = "default" | "phonics";

export function normalizeTtsTextForPregenerate(text: string, mode: TtsPregenerateMode): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return "";
  return mode === "phonics" ? getPhonicsAudioText(trimmed) : trimmed;
}

/** Background batch warm — does not block UI. */
export function pregenerateTtsTexts(
  authFetch: AuthFetchFn,
  texts: string[],
  mode: TtsPregenerateMode = "default",
): void {
  const normalized = [
    ...new Set(
      texts
        .map((t) => normalizeTtsTextForPregenerate(t, mode))
        .filter((t) => t.length > 0),
    ),
  ];
  if (normalized.length === 0) return;

  void authFetch(getApiUrl("/api/tts/pregenerate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: normalized, mode }),
  }).catch((err) => {
    console.warn("[AmyVoice] pregenerate failed", err);
  });
}

export { resolvePhonicsPlaybackText };
