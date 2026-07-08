import { useEffect, useState } from "react";
import type { RealtimeConnectionState } from "../hooks/use-speech-coach-v2-realtime";

/** Responsive Speech Coach hero square size (px). Target: phone 320, tablet 400, desktop 460. */
export function useSpeechCoachHeroSize(): number {
  const [size, setSize] = useState(320);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1024) {
        setSize(460);
        return;
      }
      if (w >= 768) {
        setSize(Math.max(360, Math.min(400, Math.round(w * 0.46))));
        return;
      }
      setSize(Math.max(280, Math.min(320, Math.round(w * 0.82))));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return size;
}

export interface SpeechCoachConnectionLabelOptions {
  /** Amy's output audio is currently playing. */
  amySpeaking?: boolean;
  /** Session bootstrap still in flight (pre-session). */
  loading?: boolean;
}

/**
 * Child-facing status line under the Amy hero.
 *
 * "Connection issue" is reserved for REAL failures — the realtime session
 * failed after the retry limit ("error") or the connection dropped mid-session
 * ("disconnected" while live). Normal startup (idle/connecting/reconnecting)
 * always reads as "Preparing Amy...", never as an error.
 */
export function speechCoachConnectionLabel(
  state: RealtimeConnectionState,
  live: boolean,
  options: SpeechCoachConnectionLabelOptions = {},
): string {
  if (live) {
    switch (state) {
      case "connected":
        return options.amySpeaking ? "Amy is speaking" : "Listening...";
      case "error":
      case "disconnected":
        return "Connection issue";
      case "idle":
      case "connecting":
      case "reconnecting":
      default:
        return "Preparing Amy...";
    }
  }

  if (options.loading || state === "connecting") return "Preparing Amy...";
  return "Ready to talk";
}
