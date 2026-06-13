import { useEffect, useState } from "react";
import { AMY_MOUTH_FRAME_SRC } from "@/lib/amy-3d/amy-mouth-sprites";

// Probe once per session — same pattern as useBakedAmyAvailable.

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
  img.src = AMY_MOUTH_FRAME_SRC.AA;
}

/** True once the lip-sync mouth sprite frames are confirmed present. */
export function useAmyMouthSpritesAvailable(): boolean {
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
