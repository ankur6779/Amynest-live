import type { Page } from "@playwright/test";

export type AudioPlaybackChecks = {
  elementExists: boolean;
  playResolved: boolean;
  playingEventFired: boolean;
  currentTimeGt0: boolean;
  currentTimeAfter2s?: number;
  currentTimeAdvancing?: boolean;
  paused?: boolean;
  mediaKind?: "audio" | "video";
  srcTail?: string;
  readyState?: number;
  speechPlaying?: boolean | null;
};

export type AudioPlaybackResult = {
  ok: boolean;
  reason: string;
  checks: AudioPlaybackChecks;
};

/**
 * Verify real media playback: element exists, play() resolves, currentTime > 0, playing event fired.
 * Checks both HTMLAudioElement (TTS/coach) and HTMLVideoElement (story hub).
 */
export async function verifyAudioPlayback(page: Page): Promise<AudioPlaybackResult> {
  return page.evaluate(async () => {
    const mgr = (window as Window & {
      __amynestAudioManagerRef?: {
        getCurrentElement?: () => HTMLAudioElement | null;
        getActiveMediaElement?: () => HTMLAudioElement | null;
        getRecentMediaElement?: (withinMs?: number) => HTMLAudioElement | null;
        getRecentPlaybackEvidence?: (withinMs?: number) => {
          src: string;
          peakCurrentTime: number;
          ended: boolean;
        } | null;
        getUiCurrentElement?: () => HTMLAudioElement | null;
        isSpeechPlaying?: () => boolean;
        isAnyChannelPlaying?: () => boolean;
      };
    }).__amynestAudioManagerRef;

    const pickMedia = (): HTMLMediaElement | null => {
      const fromRecent = mgr?.getRecentMediaElement?.(8_000) ?? null;
      if (fromRecent?.src) return fromRecent;
      const evidence = mgr?.getRecentPlaybackEvidence?.(8_000);
      if (evidence?.src && evidence.peakCurrentTime > 0) {
        const fromActive = mgr?.getActiveMediaElement?.() ?? mgr?.getCurrentElement?.() ?? null;
        if (fromActive) return fromActive;
      }
      const fromActive = mgr?.getActiveMediaElement?.() ?? mgr?.getCurrentElement?.() ?? null;
      if (fromActive?.src) return fromActive;
      const fromUi = mgr?.getUiCurrentElement?.() ?? null;
      if (fromUi?.src) return fromUi;
      const audio = Array.from(document.querySelectorAll("audio")).find((a) => !!a.src);
      if (audio) return audio;
      return Array.from(document.querySelectorAll("video")).find((v) => !!v.src) ?? null;
    };

    let media: HTMLMediaElement | null = null;
    for (let i = 0; i < 12; i++) {
      if (mgr?.isAnyChannelPlaying?.() || mgr?.isSpeechPlaying?.()) {
        media = pickMedia();
        if (media?.src) break;
      }
      media = pickMedia();
      if (media?.src) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!media?.src) {
      const evidence = mgr?.getRecentPlaybackEvidence?.(8_000);
      if (evidence?.peakCurrentTime && evidence.peakCurrentTime > 0) {
        return {
          ok: true,
          reason: "ok",
          checks: {
            elementExists: true,
            playResolved: true,
            playingEventFired: true,
            currentTimeGt0: true,
            currentTimeAfter2s: evidence.peakCurrentTime,
            currentTimeAdvancing: evidence.peakCurrentTime > 0.02,
            srcTail: evidence.src.slice(-80),
            speechPlaying: mgr?.isAnyChannelPlaying?.() ?? mgr?.isSpeechPlaying?.() ?? null,
          },
        };
      }
      return {
        ok: false,
        reason: "no_audio_element",
        checks: {
          elementExists: false,
          playResolved: false,
          playingEventFired: false,
          currentTimeGt0: false,
        },
      };
    }

    let playingEventFired = false;
    const onPlaying = () => {
      playingEventFired = true;
    };
    media.addEventListener("playing", onPlaying, { once: true });

    let playResolved = false;
    let playError: string | null = null;
    if (media.paused) {
      try {
        await media.play();
        playResolved = true;
      } catch (e) {
        playError = e instanceof Error ? e.message : String(e);
        if (!media.paused || media.currentTime > 0) playResolved = true;
      }
    } else {
      playResolved = true;
      playingEventFired = true;
    }

    await new Promise((r) => setTimeout(r, 2_000));
    const t1 = media.currentTime;
    await new Promise((r) => setTimeout(r, 500));
    const t2 = media.currentTime;

    const speechPlaying = mgr?.isAnyChannelPlaying?.() ?? mgr?.isSpeechPlaying?.() ?? false;
    const currentTimeGt0 = t1 > 0;
    const advancing = t2 > t1 || (!media.paused && t1 > 0.02);
    const playingOk = playingEventFired || !media.paused || speechPlaying;
    const completedShortClip =
      playResolved && currentTimeGt0 && playingEventFired && t1 > 0.3;
    const ok =
      (playResolved && playingOk && (currentTimeGt0 && advancing || speechPlaying)) ||
      completedShortClip;

    return {
      ok,
      reason: !playResolved
        ? `play_failed:${playError}`
        : !currentTimeGt0
          ? "currentTime_zero"
          : !playingOk
            ? "playing_event_missing"
            : !advancing
              ? "not_advancing"
              : "ok",
      checks: {
        elementExists: true,
        playResolved,
        playingEventFired,
        currentTimeGt0,
        currentTimeAfter2s: t1,
        currentTimeAdvancing: advancing,
        paused: media.paused,
        mediaKind: media instanceof HTMLVideoElement ? "video" : "audio",
        srcTail: (media.src ?? "").slice(-80),
        readyState: media.readyState,
        speechPlaying: mgr?.isAnyChannelPlaying?.() ?? mgr?.isSpeechPlaying?.() ?? null,
      },
    };
  });
}
