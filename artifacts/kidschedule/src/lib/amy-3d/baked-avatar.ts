import { useEffect, useState } from "react";
import {
  AMY_ICON_SRC,
  AMY_STAGE_ASSETS,
} from "@/lib/amy/amy-stage-assets";

export const BAKED_AMY_SRC = AMY_ICON_SRC;
export const AMY_PORTRAIT_SRC = AMY_STAGE_ASSETS.idle;
export const AMY_TALK_FRAMES = AMY_STAGE_ASSETS.talk;

// Rigged 3D model. When this file is dropped in, the hero upgrades to a live
// 3D Amy with viseme lip-sync + eye-tracking. See public/amy-3d/README.md.
export const AMY_MODEL_SRC = "/amy-3d/amy.glb";

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

// ── Rigged 3D model availability probe ────────────────────────────────────────
let modelCached: boolean | null = null;
const modelSubs = new Set<(v: boolean) => void>();

function probeModel() {
  if (typeof fetch === "undefined") {
    modelCached = false;
    return;
  }
  fetch(AMY_MODEL_SRC, { method: "HEAD" })
    .then((res) => {
      modelCached = res.ok;
      modelSubs.forEach((fn) => fn(modelCached!));
    })
    .catch(() => {
      modelCached = false;
      modelSubs.forEach((fn) => fn(false));
    });
}

/**
 * True once a rigged amy.glb is confirmed present. Until then the hero uses the
 * animated image portrait. Drop public/amy-3d/amy.glb in and it auto-upgrades.
 */
export function useAmyModelAvailable(): boolean {
  const [available, setAvailable] = useState<boolean>(modelCached ?? false);

  useEffect(() => {
    if (modelCached !== null) {
      setAvailable(modelCached);
      return;
    }
    const fn = (v: boolean) => setAvailable(v);
    modelSubs.add(fn);
    if (modelSubs.size === 1) probeModel();
    return () => {
      modelSubs.delete(fn);
    };
  }, []);

  return available;
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
