/**
 * Blocks TTS until the user has interacted with the page (tap / key).
 * Prevents mount-time useEffect speak() from firing during splash / boot.
 */
let userGestureSeen = false;

export function installTtsGestureListener(): void {
  if (typeof window === "undefined") return;
  const mark = () => {
    userGestureSeen = true;
  };
  window.addEventListener("pointerdown", mark, { once: true, passive: true });
  window.addEventListener("keydown", mark, { once: true, passive: true });
}

export function recordTtsUserGesture(): void {
  userGestureSeen = true;
}

export function isTtsPlaybackAllowed(): boolean {
  return userGestureSeen;
}
