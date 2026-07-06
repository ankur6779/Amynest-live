import { useEffect, useState } from "react";
import type { RealtimeConnectionState } from "../hooks/use-speech-coach-v2-realtime";

/** Responsive Speech Coach hero square size (px). */
export function useSpeechCoachHeroSize(): number {
  const [size, setSize] = useState(320);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1024) {
        setSize(520);
        return;
      }
      if (w >= 768) {
        setSize(Math.max(420, Math.min(500, Math.round(w * 0.52))));
        return;
      }
      setSize(Math.max(360, Math.min(420, Math.round(w * 0.92))));
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
