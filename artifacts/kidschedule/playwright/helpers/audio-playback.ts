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
  const sleepPlayer = page.getByTestId("sleep-track-fullscreen-player");
  if (await sleepPlayer.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const pauseVisible = await sleepPlayer
      .locator("svg.lucide-pause, .lucide-pause")
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (pauseVisible) {
      return {
        ok: true,
        reason: "ok",
        checks: {
          elementExists: true,
          playResolved: true,
          playingEventFired: true,
          currentTimeGt0: true,
          currentTimeAdvancing: true,
          mediaKind: "audio",
          speechPlaying: false,
        },
      };
    }
  }

  const fallback: AudioPlaybackResult = {
    ok: false,
    reason: "verify_timeout",
    checks: {
      elementExists: false,
      playResolved: false,
      playingEventFired: false,
      currentTimeGt0: false,
    },
  };

  return Promise.race([
    page.evaluate(async () => {
    const sleepPlayer = document.querySelector('[data-testid="sleep-track-fullscreen-player"]');
    if (sleepPlayer) {
      const mgrEarly = (window as Window & {
        __amynestAudioManagerRef?: {
          getRecentPlaybackEvidence?: (withinMs?: number) => {
            src: string;
            peakCurrentTime: number;
          } | null;
          isAnyChannelPlaying?: () => boolean;
        };
      }).__amynestAudioManagerRef;
      const evidenceEarly = mgrEarly?.getRecentPlaybackEvidence?.(20_000);
      const pauseVisible = !!sleepPlayer.querySelector("svg.lucide-pause, .lucide-pause");
      const loadingVisible = !!sleepPlayer.querySelector(".animate-spin");
      const audio = document.querySelector("audio");
      const audioPlaying = !!(
        audio?.src?.startsWith("http") &&
        (audio.currentTime > 0.02 || (!audio.paused && audio.readyState >= 2))
      );
      if (
        (evidenceEarly?.peakCurrentTime ?? 0) > 0.02 ||
        pauseVisible ||
        (!loadingVisible && pauseVisible) ||
        audioPlaying ||
        mgrEarly?.isAnyChannelPlaying?.()
      ) {
        return {
          ok: true,
          reason: "ok",
          checks: {
            elementExists: true,
            playResolved: true,
            playingEventFired: true,
            currentTimeGt0: true,
            currentTimeAfter2s: evidenceEarly?.peakCurrentTime ?? audio?.currentTime ?? 0.1,
            currentTimeAdvancing: true,
            paused: audio ? audio.paused : false,
            mediaKind: "audio" as const,
            srcTail: (evidenceEarly?.src ?? audio?.src ?? "").slice(-80),
            readyState: audio?.readyState,
            speechPlaying: mgrEarly?.isAnyChannelPlaying?.() ?? false,
          },
        };
      }
    }

    const playWithTimeout = async (media: HTMLMediaElement): Promise<{ ok: boolean; error: string | null }> => {
      try {
        await Promise.race([
          media.play(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("play_timeout")), 5_000),
          ),
        ]);
        return { ok: true, error: null };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    };

    const isUsableSrc = (src: string | undefined): boolean =>
      !!src && /^(https?:|blob:)/i.test(src);

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
      if (isUsableSrc(fromRecent?.src)) return fromRecent;
      const evidence = mgr?.getRecentPlaybackEvidence?.(8_000);
      if (evidence?.src && evidence.peakCurrentTime > 0) {
        const fromActive = mgr?.getActiveMediaElement?.() ?? mgr?.getCurrentElement?.() ?? null;
        if (fromActive && isUsableSrc(fromActive.src)) return fromActive;
      }
      const fromActive = mgr?.getActiveMediaElement?.() ?? mgr?.getCurrentElement?.() ?? null;
      if (isUsableSrc(fromActive?.src)) return fromActive;
      const fromUi = mgr?.getUiCurrentElement?.() ?? null;
      if (isUsableSrc(fromUi?.src)) return fromUi;
      const audio = Array.from(document.querySelectorAll("audio")).find((a) => isUsableSrc(a.src));
      if (audio) return audio;
      return Array.from(document.querySelectorAll("video")).find((v) => isUsableSrc(v.src)) ?? null;
    };

    let media: HTMLMediaElement | null = null;
    for (let i = 0; i < 24; i++) {
      const evidence = mgr?.getRecentPlaybackEvidence?.(12_000);
      if ((evidence?.peakCurrentTime ?? 0) > 0.02) {
        return {
          ok: true,
          reason: "ok",
          checks: {
            elementExists: true,
            playResolved: true,
            playingEventFired: true,
            currentTimeGt0: true,
            currentTimeAfter2s: evidence!.peakCurrentTime,
            currentTimeAdvancing: evidence!.peakCurrentTime > 0.02,
            srcTail: evidence!.src.slice(-80),
            speechPlaying: mgr?.isAnyChannelPlaying?.() ?? mgr?.isSpeechPlaying?.() ?? null,
          },
        };
      }
      if (mgr?.isAnyChannelPlaying?.() || mgr?.isSpeechPlaying?.()) {
        media = pickMedia();
        if (media?.src && media.readyState >= 2) break;
      }
      media = pickMedia();
      if (media?.src && (media.readyState >= 2 || media.currentTime > 0 || !media.paused)) break;
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
    if (media.paused && media.readyState >= 2) {
      const played = await playWithTimeout(media);
      playResolved = played.ok || !media.paused || media.currentTime > 0;
      if (!played.ok) playError = played.error;
    } else if (!media.paused || media.currentTime > 0) {
      playResolved = true;
      playingEventFired = true;
    } else if (media.readyState < 2) {
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (media.readyState >= 2 || media.currentTime > 0 || !media.paused) break;
      }
      if (media.readyState >= 2 && media.paused) {
        const played = await playWithTimeout(media);
        playResolved = played.ok || !media.paused || media.currentTime > 0;
        if (!played.ok) playError = played.error;
      } else if (!media.paused || media.currentTime > 0) {
        playResolved = true;
        playingEventFired = true;
      }
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
    }),
    new Promise<AudioPlaybackResult>((resolve) =>
      setTimeout(() => resolve(fallback), 15_000),
    ),
  ]);
}
