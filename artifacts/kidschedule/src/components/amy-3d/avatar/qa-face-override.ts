// DEV-only visual override for amy-avatar-qa screenshots.
// Does not alter blink/lip-sync scheduling — only re-applies FaceDriver values
// after the normal animation frame so mid-blink / mid-talk frames can be captured.
//
// Prefer URL params (`?faceHold=blink|talk`) so HMR cannot split module state.

export type QaFaceOverride = {
  blink?: number;
  mouthOpen?: number;
};

let override: QaFaceOverride | null = null;

export function setQaFaceOverride(next: QaFaceOverride | null): void {
  if (!import.meta.env.DEV) return;
  override = next;
}

export function getQaFaceOverride(): QaFaceOverride | null {
  if (!import.meta.env.DEV) return null;
  if (typeof window === "undefined") return override;
  try {
    const path = window.location.pathname;
    if (!path.includes("amy-avatar-qa")) return override;
    const hold = new URLSearchParams(window.location.search).get("faceHold");
    if (hold === "blink") return { blink: 0.9, mouthOpen: 0 };
    if (hold === "talk") return { blink: 0, mouthOpen: 0.65 };
  } catch {
    /* ignore */
  }
  return override;
}
