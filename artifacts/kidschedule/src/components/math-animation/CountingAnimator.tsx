import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

interface CountingAnimatorProps {
  value: number | null;
  color?: string;
  reduced: boolean;
  /** Pulse emphatically (e.g. on the celebration step). */
  emphasize?: boolean;
}

/**
 * A large, friendly running total that *counts up* to its target value rather
 * than snapping — so children watch the number grow. Pulses softly whenever it
 * lands on a new value.
 */
export function CountingAnimator({ value, color, reduced, emphasize }: CountingAnimatorProps) {
  const [display, setDisplay] = useState(value ?? 0);
  const [pulse, setPulse] = useState(0);
  const prev = useRef(value ?? 0);

  useEffect(() => {
    if (value == null) return;
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    setPulse((p) => p + 1);

    if (reduced || Math.abs(value - from) > 40) {
      setDisplay(value);
      return;
    }
    const controls = animate(from, value, {
      duration: Math.min(0.12 * Math.abs(value - from) + 0.2, 1.1),
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduced]);

  if (value == null) return null;

  return (
    <div
      key={pulse}
      className="font-black tabular-nums"
      style={{
        fontSize: emphasize ? 52 : 40,
        lineHeight: 1,
        color: color ?? "hsl(var(--brand-amber-300))",
        textShadow: emphasize ? `0 0 24px ${color ?? "rgba(245,158,11,0.7)"}` : "0 2px 8px rgba(0,0,0,0.4)",
        animation: reduced
          ? undefined
          : emphasize
            ? "mt-pop 600ms cubic-bezier(0.34,1.56,0.64,1) both"
            : "mt-count-pulse 560ms cubic-bezier(0.22,1,0.36,1) both",
      }}
      aria-live="polite"
    >
      {display}
    </div>
  );
}
