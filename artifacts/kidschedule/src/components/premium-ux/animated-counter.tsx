import { useEffect, useRef, useState } from "react";
import { MOTION_MS } from "@/lib/experience-system";
import { useReducedMotion } from "framer-motion";

type Props = {
  value: number;
  durationMs?: number;
  className?: string;
};

/** Smooth count-up for stats — respects reduced motion. */
export function AnimatedCounter({
  value,
  durationMs = MOTION_MS.slow * 2,
  className,
}: Props) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const from = prevRef.current;
    const delta = value - from;
    if (delta === 0) return;

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + delta * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduced]);

  return <span className={className}>{display}</span>;
}
