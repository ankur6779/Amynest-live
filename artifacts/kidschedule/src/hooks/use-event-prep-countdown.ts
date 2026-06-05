import { useEffect, useState } from "react";
import {
  getCountdownParts,
  type CountdownParts,
} from "@/lib/event-prep-countdown";

/** Ticks every second when the event is within 7 days. */
export function useEventPrepCountdown(nextDate: string | undefined): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(() =>
    nextDate ? getCountdownParts(nextDate) : null,
  );

  useEffect(() => {
    if (!nextDate) {
      setParts(null);
      return;
    }
    const tick = () => setParts(getCountdownParts(nextDate));
    tick();
    const initial = getCountdownParts(nextDate);
    if (!initial.isUrgent && !initial.isPast) return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextDate]);

  return parts;
}
