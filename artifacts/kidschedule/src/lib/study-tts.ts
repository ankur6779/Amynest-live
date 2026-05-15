// ElevenLabs-powered TTS for Smart Study Zone and Event Prep pages.
// Replaces the old browser speechSynthesis with Indian ElevenLabs voices.

import { getAuth } from "firebase/auth";
import { getApiUrl } from "@/lib/api";

// ─── ElevenLabs Indian Voice IDs ──────────────────────────────
// English Indian Female — Ananya K
const VOICE_EN_FEMALE = "QbQKfe9vgx5OsbZUvlFv";
// English Indian Male — Karthik
const VOICE_EN_MALE   = "oaz5NvoRIhcJystOASAA";

const MODEL_EN = "eleven_turbo_v2_5";

// ─── Audio singleton ─────────────────────────────────────────

let _audio: HTMLAudioElement | null = null;
let _objUrl: string | null = null;

export function stopSpeaking() {
  if (_audio) {
    _audio.pause();
    _audio.removeAttribute("src");
    _audio.load();
    _audio = null;
  }
  if (_objUrl) {
    URL.revokeObjectURL(_objUrl);
    _objUrl = null;
  }
}

export function ttsAvailable(): boolean {
  return true;
}

// ─── Speak via ElevenLabs ─────────────────────────────────────

export async function speak(
  text: string,
  opts?: { lang?: string; gender?: "female" | "male" },
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  stopSpeaking();

  const isMale  = opts?.gender === "male";
  const voiceId = isMale ? VOICE_EN_MALE : VOICE_EN_FEMALE;
  const modelId = MODEL_EN;

  try {
    const token = await getAuth().currentUser?.getIdToken().catch(() => undefined);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const synthRes = await fetch(getApiUrl("/api/tts/synthesize"), {
      method: "POST",
      headers,
      body: JSON.stringify({ text: trimmed, voiceId, modelId }),
    });
    if (!synthRes.ok) return;

    const data = (await synthRes.json()) as { audioUrl: string };

    const audioHeaders: Record<string, string> = {};
    if (token) audioHeaders["Authorization"] = `Bearer ${token}`;

    const audioRes = await fetch(data.audioUrl, { headers: audioHeaders });
    if (!audioRes.ok) return;

    const blob = await audioRes.blob();
    const url  = URL.createObjectURL(blob);
    _objUrl = url;

    const audio = new Audio(url);
    _audio = audio;
    audio.onended = stopSpeaking;
    audio.onerror = stopSpeaking;
    await audio.play();
  } catch {
    stopSpeaking();
  }
}
