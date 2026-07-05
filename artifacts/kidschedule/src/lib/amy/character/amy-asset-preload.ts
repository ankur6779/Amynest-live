import { AMY_STAGE_ASSETS } from "@/lib/amy/amy-stage-assets";

let mouthFramesPreloaded = false;
let celebrationPreloaded = false;

/** Eager-preload talk mouth frames to avoid first-speak flash. Idempotent. */
export function preloadAmyMouthFrames(): void {
  if (mouthFramesPreloaded || typeof Image === "undefined") return;
  mouthFramesPreloaded = true;
  for (const src of AMY_STAGE_ASSETS.talk) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

/** Lazy-preload celebration pose (optional, low priority). */
export function preloadAmyCelebrationAssets(): void {
  if (celebrationPreloaded || typeof Image === "undefined") return;
  celebrationPreloaded = true;
  const img = new Image();
  img.decoding = "async";
  img.src = AMY_STAGE_ASSETS.happy;
}

/** Schedule mouth-frame preload after startup (non-blocking). */
export function scheduleAmyAssetPreload(): void {
  if (typeof window === "undefined") return;
  const run = () => {
    preloadAmyMouthFrames();
    window.setTimeout(preloadAmyCelebrationAssets, 2000);
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    window.setTimeout(run, 800);
  }
}

export function isAmyMouthFramesPreloaded(): boolean {
  return mouthFramesPreloaded;
}
