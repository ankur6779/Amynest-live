import { useEffect, useState } from "react";
import type { AuthFetchFn } from "@/lib/poll-result";
import { fetchSpeechCoachV2Usage } from "../lib/api";
import { formatSpeechCoachDailyAllowanceLabel } from "../lib/usage-display";

export function useSpeechCoachV2DailyAllowance(
  authFetch: AuthFetchFn,
  childId: number | undefined,
  enabled = true,
): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !childId) {
      setLabel(null);
      return;
    }
    let cancelled = false;
    void fetchSpeechCoachV2Usage(authFetch, childId)
      .then((usage) => {
        if (cancelled) return;
        setLabel(formatSpeechCoachDailyAllowanceLabel(usage.dailyLimitSeconds, usage.isTrial));
      })
      .catch(() => {
        if (!cancelled) setLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, childId, enabled]);

  return label;
}
