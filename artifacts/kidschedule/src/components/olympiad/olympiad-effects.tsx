import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { OLYMPIAD_BADGES } from "@/lib/olympiad-local-stats";

export function useOlympiadBadgeCelebration(badges: string[]) {
  const { toast } = useToast();
  const prev = useRef<Set<string>>(new Set(badges));

  useEffect(() => {
    const next = new Set(badges);
    for (const id of next) {
      if (!prev.current.has(id)) {
        const def = OLYMPIAD_BADGES.find((b) => b.id === id);
        if (def) {
          toast({
            title: `${def.emoji} ${def.label}`,
            description: def.hint,
          });
        }
      }
    }
    prev.current = next;
  }, [badges, toast]);
}

/**
 * Daily olympiad reminders are delivered server-side (feature_notification_tick).
 * Stats.reminderEnabled + reminderHour sync via /api/olympiad/stats.
 */
export function useOlympiadDailyReminder(
  _enabled: boolean,
  _hour: number,
  _dailyDoneToday: boolean,
): void {
  /* no-op — server is the only notification authority */
}
