/**
 * Server-pushed infant sleep reminders — no browser Notification API.
 */
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, CloudMoon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  hasPushRegistered,
  updateInfantNotificationPrefs,
  upsertFeatureNotificationSchedule,
} from "@/lib/feature-notification-schedule";

const MAX_REMINDER_MS = 4 * 60 * 60 * 1000;

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function SleepNapReminders({
  childId,
  childName,
  windowStart,
  shouldWindDown,
}: {
  childId: number;
  childName: string;
  windowStart: string;
  shouldWindDown: boolean;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const [napScheduled, setNapScheduled] = useState(false);
  const [windDownScheduled, setWindDownScheduled] = useState(false);

  const requirePush = useCallback((): boolean => {
    if (!hasPushRegistered()) {
      toast({
        title: t("components.sleep_predict.notifications_blocked"),
        variant: "destructive",
      });
      return false;
    }
    return true;
  }, [t, toast]);

  const scheduleNapReminder = useCallback(async () => {
    const delay = new Date(windowStart).getTime() - Date.now();
    if (delay <= 0) {
      toast({ title: t("components.sleep_predict.reminder_past"), variant: "destructive" });
      return;
    }
    if (delay > MAX_REMINDER_MS) {
      toast({ title: t("components.sleep_predict.reminder_too_far") });
      return;
    }
    if (!requirePush()) return;

    const ok = await updateInfantNotificationPrefs(authFetch, childId, { napReminders: true });
    if (!ok) {
      toast({ title: t("components.sleep_predict.notifications_blocked"), variant: "destructive" });
      return;
    }
    setNapScheduled(true);
    toast({
      title: t("components.sleep_predict.reminder_set_title"),
      description: t("components.sleep_predict.reminder_set_body", {
        time: formatTime(windowStart),
      }),
    });
  }, [authFetch, childId, requirePush, t, toast, windowStart]);

  const scheduleWindDownReminder = useCallback(async () => {
    if (!requirePush()) return;
    const remindAt = new Date(Date.now() + 15 * 60_000).toISOString();
    const ok = await upsertFeatureNotificationSchedule(authFetch, {
      scheduleType: "sleep_winddown",
      entityId: "15min",
      childId,
      enabled: true,
      config: {
        remindAt,
        title: t("components.sleep_predict.winddown_reminder_title", { name: childName }),
        body: t("components.sleep_predict.winddown_reminder_body"),
        deepLink: "/parenting-hub#infant-sleep",
      },
    });
    if (!ok) {
      toast({ title: t("components.sleep_predict.notifications_blocked"), variant: "destructive" });
      return;
    }
    setWindDownScheduled(true);
    toast({
      title: t("components.sleep_predict.reminder_set_title"),
      description: t("components.sleep_predict.reminder_set_body", {
        time: formatTime(remindAt),
      }),
    });
  }, [authFetch, childId, childName, requirePush, t, toast]);

  const napDelay = new Date(windowStart).getTime() - Date.now();
  const canNapRemind = napDelay > 0 && napDelay <= MAX_REMINDER_MS;
  if (!canNapRemind && !shouldWindDown) return null;

  return (
    <div
      className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3 flex flex-wrap gap-2"
      data-testid="sleep-reminders"
    >
      {canNapRemind && (
        <button
          type="button"
          onClick={() => void scheduleNapReminder()}
          disabled={napScheduled}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-60"
          data-testid="set-nap-reminder-btn"
        >
          <Bell className="h-3 w-3 text-primary" />
          {napScheduled
            ? t("components.sleep_predict.nap_reminder_scheduled")
            : t("components.sleep_predict.set_nap_reminder")}
        </button>
      )}
      {shouldWindDown && (
        <button
          type="button"
          onClick={() => void scheduleWindDownReminder()}
          disabled={windDownScheduled}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-[11px] font-bold text-violet-800 dark:text-violet-200 hover:bg-violet-500/15 transition-colors disabled:opacity-60"
          data-testid="set-winddown-reminder-btn"
        >
          <CloudMoon className="h-3 w-3" />
          {windDownScheduled
            ? t("components.sleep_predict.winddown_reminder_scheduled")
            : t("components.sleep_predict.set_winddown_reminder")}
        </button>
      )}
    </div>
  );
}
