import { useEffect, useState } from "react";
import type { RealtimeConnectionState } from "../hooks/use-speech-coach-v2-realtime";

/** Responsive Speech Coach hero square size (px). */
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
        setSize(Math.max(360, Math.min(420, Math.round(w * 0.46))));
        return;
      }
      setSize(Math.max(300, Math.min(340, Math.round(w * 0.82))));
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
