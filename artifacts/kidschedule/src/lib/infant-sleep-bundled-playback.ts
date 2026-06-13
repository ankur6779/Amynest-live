/**
 * Bundled /infant-sleep-audio/ MP3 playback — same contract as useMp3LoopEngine
 * (UI channel, no TTS/static-audio pipeline). Used by lullabies, poems, and stories.
 */
import { audioManager } from "@/lib/audio-manager";
import {
  configureMobileAudioElement,
  isAudioUnlocked,
  recordTtsUserGesture,
} from "@/lib/tts-guard";
import { prepareIosAudioSessionForPlayback } from "@/lib/mic-permission-capacitor";

const BUNDLED_FADE_SECONDS = 0.6;

export type InfantSleepBundledPlayOpts = {
  loop?: boolean;
  volume?: number;
};

/**
 * Play a bundled infant-sleep MP3 through the UI audio channel.
 * Mirrors useMp3LoopEngine — avoids speech/TTS channel and static GCS probes.
 */
export async function playInfantSleepBundledMp3(
  url: string,
  audio: HTMLAudioElement,
  opts: InfantSleepBundledPlayOpts = {},
): Promise<boolean> {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return false;

  recordTtsUserGesture();
  await prepareIosAudioSessionForPlayback();
  if (!isAudioUnlocked()) return false;

  audio.loop = opts.loop ?? false;
  audio.volume = 0;
  configureMobileAudioElement(audio);

  const played = await audioManager.play(
    audio,
    {
      proxyUrl: trimmed,
      source: "infant_sleep_mp3",
      channel: "ui",
      interrupt: true,
    },
    { channel: "ui", interrupt: true },
  );

  if (!played) return false;

  const target = Math.max(0, Math.min(1, opts.volume ?? 0.85));
  audio.volume = target;

  const fadeStart = performance.now();
  const fade = () => {
    const el = audio;
    if (!el || el.paused) return;
    const t = Math.min(1, (performance.now() - fadeStart) / (BUNDLED_FADE_SECONDS * 1000));
    el.volume = target * t;
    if (t < 1) requestAnimationFrame(fade);
  };
  requestAnimationFrame(fade);

  return true;
}
