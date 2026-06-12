/**
 * In-app UI sounds — AmyNest ElevenLabs notification assets reused for
 * tab navigation and learning celebrations. Push notifications stay separate.
 */
import { audioManager } from "@/lib/audio-manager";
import { isTtsPlaybackAllowed } from "@/lib/tts-guard";

export const UI_SOUNDS_MUTE_KEY = "amynest:ui-sounds-muted";
const LEGACY_STUDY_MUTE_KEY = "amynest:study-fx-muted";

export type UiSoundCue =
  | "nav_tab"
  | "celebration"
  | "complete"
  | "unlock"
  | "study_correct";

const SOUND_FILES: Record<UiSoundCue, string> = {
  nav_tab: "amynest_learning_pop.mp3",
  celebration: "amynest_sparkle.mp3",
  complete: "amynest_nest_chime.mp3",
  unlock: "amynest_soft_bell.mp3",
  study_correct: "amynest_learning_pop.mp3",
};

const SOUND_VOLUME: Record<UiSoundCue, number> = {
  nav_tab: 0.28,
  celebration: 0.42,
  complete: 0.38,
  unlock: 0.36,
  study_correct: 0.34,
};

type MuteListener = (muted: boolean) => void;
const muteListeners = new Set<MuteListener>();

function soundBaseUrl(): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${base}/sounds/notifications`;
}

function resolveSoundUrl(cue: UiSoundCue): string {
  return `${soundBaseUrl()}/${SOUND_FILES[cue]}`;
}

export function isUiSoundsMuted(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(UI_SOUNDS_MUTE_KEY) === "1" ||
    window.localStorage.getItem(LEGACY_STUDY_MUTE_KEY) === "1"
  );
}

export function setUiSoundsMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UI_SOUNDS_MUTE_KEY, muted ? "1" : "0");
  if (!muted) {
    window.localStorage.removeItem(LEGACY_STUDY_MUTE_KEY);
  }
  for (const listener of muteListeners) {
    listener(muted);
  }
}

export function subscribeUiSoundsMuted(listener: MuteListener): () => void {
  muteListeners.add(listener);
  return () => muteListeners.delete(listener);
}

/** Fire-and-forget tab switch chime (bottom nav). */
export function playNavTabSound(): void {
  void playUiSound("nav_tab");
}

/**
 * Play a bundled UI sound. Returns false when muted, locked, or playback fails.
 */
export async function playUiSound(cue: UiSoundCue): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isUiSoundsMuted()) return false;
  if (!isTtsPlaybackAllowed()) return false;

  const url = resolveSoundUrl(cue);
  try {
    const audio = audioManager.create(url);
    audio.volume = SOUND_VOLUME[cue];
    return audioManager.play(
      audio,
      { source: `ui_sound:${cue}`, channel: "ui", proxyUrl: url, srcType: "unknown" },
      { channel: "ui", interrupt: true },
    );
  } catch {
    return false;
  }
}
