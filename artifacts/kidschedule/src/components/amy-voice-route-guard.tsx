import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

function isAmyCoachWinsRoute(path: string): boolean {
  return path.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") === "/amy-coach";
}

/** Pauses Amy Coach win listen-aloud when route leaves `/amy-coach`. */
export function AmyVoiceRouteGuard() {
  const [location] = useLocation();
  const prevRef = useRef(location);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = location;
    if (prev !== location) {
      if (!isAmyCoachWinsRoute(prev)) return;
      void import("@/lib/amy-voice-route-guard").then((mod) => {
        mod.pauseAmyVoiceOnAmyCoachLeave(prev, location);
      });
    }
  }, [location]);

  return null;
}
