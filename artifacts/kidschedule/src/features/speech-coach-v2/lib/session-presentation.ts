import { useEffect, useState } from "react";
import type { RealtimeConnectionState } from "../hooks/use-speech-coach-v2-realtime";

/** Responsive Speech Coach hero square size (px). */
export function useSpeechCoachHeroSize(): number {
  const [size, setSize] = useState(300);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1024) {
        setSize(420);
        return;
      }
      if (w >= 768) {
        setSize(Math.max(340, Math.min(420, Math.round(w * 0.44))));
        return;
      }
      setSize(Math.max(280, Math.min(320, Math.round(w * 0.78))));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return size;
}

export function speechCoachConnectionLabel(
  state: RealtimeConnectionState,
  live: boolean,
): string {
  if (live) {
    switch (state) {
      case "connected":
        return "Listening";
      case "connecting":
        return "Connecting...";
      case "reconnecting":
        return "Reconnecting…";
      case "error":
      case "disconnected":
        return "Connection issue";
      default:
        return "Connecting...";
    }
  }

  if (state === "connecting") return "Connecting...";
  return "Tap to start speaking with Amy";
}
