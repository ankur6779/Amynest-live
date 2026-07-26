/**
 * Debug-only kill switches — active ONLY when mazeDebug=1 is also set.
 * URL: ?mazeDebug=1&mazeSkipLayoutEffect=1
 * localStorage mirrors URL for Playwright reload flows.
 */

import { isMazeRuntimeDebugEnabled } from "@/lib/maze-runtime-debug";

export type MazeDebugKillSwitch =
  | "mazeSkipLayoutEffect"
  | "mazeSkipCelebration"
  | "mazeSkipAnimations"
  | "mazeSkipAudio"
  | "mazeSkipToneSweep";

const SWITCHES: MazeDebugKillSwitch[] = [
  "mazeSkipLayoutEffect",
  "mazeSkipCelebration",
  "mazeSkipAnimations",
  "mazeSkipAudio",
  "mazeSkipToneSweep",
];

export function isMazeDebugKillSwitchEnabled(flag: MazeDebugKillSwitch): boolean {
  if (!isMazeRuntimeDebugEnabled()) return false;
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage?.getItem(flag) === "1") return true;
  } catch {
    /* ignore */
  }
  return new URLSearchParams(window.location.search).get(flag) === "1";
}

export function syncMazeDebugKillSwitchesFromUrl(): void {
  if (!isMazeRuntimeDebugEnabled() || typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  for (const flag of SWITCHES) {
    if (params.get(flag) === "1") {
      try {
        window.localStorage.setItem(flag, "1");
      } catch {
        /* ignore */
      }
    }
  }
}

export function clearMazeDebugKillSwitches(): void {
  if (typeof window === "undefined") return;
  for (const flag of SWITCHES) {
    try {
      window.localStorage.removeItem(flag);
    } catch {
      /* ignore */
    }
  }
}

export function buildMazeDebugCertUrl(extra?: Partial<Record<MazeDebugKillSwitch, boolean>>): string {
  const params = new URLSearchParams({ mode: "maze-easy", mazeDebug: "1" });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, "1");
    }
  }
  return `/playwright-gaming-hub-certification.html?${params.toString()}`;
}
