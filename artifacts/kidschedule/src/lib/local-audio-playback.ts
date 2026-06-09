/**
 * Direct local HTMLAudio playback — stops global speech channel first.
 */

import { audioManager } from "@/lib/audio-manager";

let active: HTMLAudioElement | null = null;
let generation = 0;

export function stopLocalAudio(): void {
  generation += 1;
  if (!active) return;
  try {
    active.pause();
    active.removeAttribute("src");
    active.load();
  } catch {
    /* ignore */
  }
  active = null;
}

export function isLocalAudioPlaying(): boolean {
  return active != null && !active.paused && !active.ended;
}

export type LocalPlayResult = { ok: true } | { ok: false; error: string };

/**
 * Play one bundled URL. Stops any prior clip first (one playback at a time).
 */
export function playLocalAudio(
  src: string,
  opts?: { playbackRate?: number },
): Promise<LocalPlayResult> {
  const url = (src ?? "").trim();
  if (!url) return Promise.resolve({ ok: false, error: "local_empty_url" });

  stopLocalAudio();
  audioManager.stopAll();
  const gen = ++generation;

  const el = new Audio(url);
  el.preload = "auto";
  if (opts?.playbackRate && opts.playbackRate > 0) {
    el.playbackRate = opts.playbackRate;
  }
  active = el;

  return new Promise((resolve) => {
    const finish = (result: LocalPlayResult) => {
      if (gen !== generation) return;
      if (active === el) active = null;
      resolve(result);
    };

    const onEnded = () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
      finish({ ok: true });
    };
    const onError = () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
      finish({ ok: false, error: "local_play_error" });
    };

    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);

    void el.play().then(
      () => undefined,
      (err: unknown) => {
        el.removeEventListener("ended", onEnded);
        el.removeEventListener("error", onError);
        const msg = err instanceof Error ? err.message : String(err);
        finish({ ok: false, error: msg || "local_play_rejected" });
      },
    );
  });
}
