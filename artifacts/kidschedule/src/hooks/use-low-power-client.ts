import { useEffect, useState } from "react";
import { isLowPowerClient } from "@/lib/game-perf";

/** Stable low-power heuristic for the session (Save-Data / RAM / cores). */
export function useLowPowerClient(): boolean {
  const [low, setLow] = useState(false);
  useEffect(() => {
    setLow(isLowPowerClient());
  }, []);
  return low;
}
