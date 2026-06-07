import { useEffect, useState } from "react";

// Baked 3D Amy render used by the small "icon" tier (headers, lists, chat
// bubbles). It is a static image rendered from the same 3D head via
// scripts/render-amy-baked.mjs — so small spots look 3D without ever mounting a
// live WebGL canvas. Until the PNG exists we transparently fall back to the 2D
// SVG, so behaviour is unchanged on a fresh checkout.

export const BAKED_AMY_SRC = "/amy-3d/amy-idle.png";

// Module-level cache so we probe the asset exactly once per session (no 404
// spam across the ~30 places AmyIcon is used).
let cached: boolean | null = null;
const subscribers = new Set<(v: boolean) => void>();

function probe() {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    cached = false;
    return;
  }
  const img = new Image();
  img.onload = () => {
    cached = img.naturalWidth > 0;
    subscribers.forEach((fn) => fn(cached!));
  };
  img.onerror = () => {
    cached = false;
    subscribers.forEach((fn) => fn(false));
  };
  img.src = BAKED_AMY_SRC;
}

/** True once a baked 3D image is confirmed available. Cached + shared. */
export function useBakedAmyAvailable(): boolean {
  const [available, setAvailable] = useState<boolean>(cached ?? false);

  useEffect(() => {
    if (cached !== null) {
      setAvailable(cached);
      return;
    }
    const fn = (v: boolean) => setAvailable(v);
    subscribers.add(fn);
    if (subscribers.size === 1) probe();
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  return available;
}
