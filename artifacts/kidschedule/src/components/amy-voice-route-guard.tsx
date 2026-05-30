import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { pauseAmyVoiceOnAmyCoachLeave } from "@/lib/amy-voice-route-guard";

/** Pauses Amy Coach win listen-aloud when route leaves `/amy-coach`. */
export function AmyVoiceRouteGuard() {
  const [location] = useLocation();
  const prevRef = useRef(location);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = location;
    if (prev !== location) {
      pauseAmyVoiceOnAmyCoachLeave(prev, location);
    }
  }, [location]);

  return null;
}
