/**
 * Amy Sound World GPU safety.
 *
 * Android WebView / Chrome frequently paint `backdrop-filter` as near-black when the
 * same element (or stacking context) is also promoted with transform / will-change /
 * Framer Motion tap/idle animations. That reads as a stuck dark overlay and can
 * exhaust the GPU until the WebView hangs.
 *
 * Sound World surfaces must use opaque fills instead of glass blur on those clients.
 */

import { isAndroidUa, isIosUa } from "@/lib/device-lite";
import { performanceTier, type PerformanceTier } from "@/lib/performance-tier";

export type SoundWorldGpuProfile = {
  tier: PerformanceTier;
  /** Prefer solid fills — no backdrop-filter on animated surfaces */
  preferOpaqueSurfaces: boolean;
  /** Continuous idle float / drift animations */
  allowIdleMotion: boolean;
  /** 3D pointer tilt */
  allowTilt: boolean;
  /** Living-environment atmosphere sprites */
  allowAtmosphere: boolean;
  /** AnimatePresence mode="wait" exit (can deadlock with infinite child motion) */
  allowExitWait: boolean;
};

let cached: SoundWorldGpuProfile | null = null;

function detect(): SoundWorldGpuProfile {
  const tier = performanceTier();
  const android = typeof window !== "undefined" && isAndroidUa();
  const ios = typeof window !== "undefined" && isIosUa();
  const coarse =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(pointer: coarse)")?.matches;
  const mobileShell = android || ios || coarse;

  // Opaque surfaces on every mobile/coarse client — backdrop-filter + motion is the
  // production freeze vector. Desktop high-tier may keep light glass on static chrome only.
  const preferOpaqueSurfaces = mobileShell || tier !== "high";

  return {
    tier,
    preferOpaqueSurfaces,
    allowIdleMotion: !preferOpaqueSurfaces && tier === "high",
    allowTilt: !preferOpaqueSurfaces && tier === "high",
    allowAtmosphere: !android && tier !== "low",
    allowExitWait: !preferOpaqueSurfaces,
  };
}

export function soundWorldGpuProfile(): SoundWorldGpuProfile {
  if (cached) return cached;
  cached = detect();
  return cached;
}

/** Test helper — clears session cache. */
export function resetSoundWorldGpuProfileForTests(): void {
  cached = null;
}

/** Opaque card fill used when glass blur is unsafe. */
export const SOUND_WORLD_OPAQUE_SURFACE =
  "bg-[rgb(18,28,60)] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.28)]";

/** Slightly translucent fill only when GPU-safe (desktop high). */
export const SOUND_WORLD_GLASS_SURFACE =
  "bg-[rgba(18,28,60,0.92)] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.28)]";

export function soundWorldCardSurfaceClass(extra?: string): string {
  const { preferOpaqueSurfaces } = soundWorldGpuProfile();
  const base = preferOpaqueSurfaces ? SOUND_WORLD_OPAQUE_SURFACE : SOUND_WORLD_GLASS_SURFACE;
  return extra ? `${base} ${extra}` : base;
}
