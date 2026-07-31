import { useCallback, useEffect, useRef, useState } from "react";

export type PresenceMode = "settling" | "idle" | "exploring" | "rapid";

export type PresenceAmbience = {
  mode: PresenceMode;
  /** 0 quiet … 1 lively — ambience only */
  vitality: number;
  /** Call on any pointer/tap inside the world */
  noteActivity: () => void;
};

/**
 * Presence sensor — reacts to waiting vs rapid interaction.
 * Never manipulates learning; only ambience vitality.
 */
export function usePresenceAmbience(enabled = true): PresenceAmbience {
  const [mode, setMode] = useState<PresenceMode>("settling");
  const [vitality, setVitality] = useState(0.45);
  const stamps = useRef<number[]>([]);
  const lastRef = useRef(Date.now());

  const noteActivity = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    lastRef.current = now;
    stamps.current = [...stamps.current.filter((t) => now - t < 2500), now];
    const rate = stamps.current.length;
    if (rate >= 6) {
      setMode("rapid");
      setVitality(0.28); // world calms when child is busy
    } else if (rate >= 2) {
      setMode("exploring");
      setVitality(0.55);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const idleFor = Date.now() - lastRef.current;
      if (idleFor > 5000) {
        setMode("idle");
        // Waiting → world becomes more gently active
        setVitality((v) => Math.min(0.95, v + 0.04));
      } else if (idleFor > 2000 && stamps.current.length < 6) {
        setMode((m) => (m === "rapid" ? "exploring" : m));
        setVitality((v) => Math.min(0.7, Math.max(0.4, v)));
      }
    }, 900);
    const settle = window.setTimeout(() => setMode("idle"), 1800);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(settle);
    };
  }, [enabled]);

  return { mode, vitality, noteActivity };
}
