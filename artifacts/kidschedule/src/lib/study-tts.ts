// ElevenLabs-powered TTS for Smart Study Zone and Event Prep pages.
// Replaces the old browser speechSynthesis with Indian ElevenLabs voices.

import { firebaseAuth } from "./firebase";

// ─── ElevenLabs Indian Voice IDs ──────────────────────────────
// English Indian Female — Ananya K
const VOICE_EN_FEMALE = "QbQKfe9vgx5OsbZUvlFv";
// English Indian Male — Karthik
const VOICE_EN_MALE   = "oaz5NvoRIhcJystOASAA";
// Hindi Female — Anjura
const VOICE_HI_FEMALE = "TllHtNijgXBd45uTSCS7";
// Hindi Male — Rahul S
const VOICE_HI_MALE   = "2cdvnKJ5TZi631y5PN1s";

const MODEL_EN = "eleven_turbo_v2_5";
const MODEL_HI = "eleven_multilingual_v2";

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

  const isHindi = (opts?.lang ?? "").startsWith("hi") || /[\u0900-\u097F]/.test(trimmed);
  const isMale  = opts?.gender === "male";

  let voiceId: string;
  let modelId: string;

  if (isHindi) {
    voiceId = isMale ? VOICE_HI_MALE : VOICE_HI_FEMALE;
    modelId = MODEL_HI;
  } else {
    voiceId = isMale ? VOICE_EN_MALE : VOICE_EN_FEMALE;
    modelId = MODEL_EN;
  }

  try {
    const token = await firebaseAuth.currentUser?.getIdToken().catch(() => undefined);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const synthRes = await fetch("/api/tts/synthesize", {
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
