import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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

export function useOlympiadDailyReminder(
  enabled: boolean,
  hour: number,
  dailyDoneToday: boolean,
) {
  const { toast } = useToast();
  const fired = useRef<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!enabled || dailyDoneToday) return;

    const check = () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      if (fired.current === today) return;
      if (now.getHours() >= hour) {
        fired.current = today;
        toast({
          title: t("components.olympiad_zone.reminder_title"),
          description: t("components.olympiad_zone.reminder_body"),
        });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(t("components.olympiad_zone.reminder_title"), {
              body: t("components.olympiad_zone.reminder_body"),
            });
          } catch {
            /* ignore */
          }
        }
      }
    };

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [enabled, hour, dailyDoneToday, toast, t]);
}
