import { useMemo, useState } from "react";
import type { TFunction } from "i18next";
import type { SchoolEvent, UpcomingEvent } from "@workspace/event-prep";
import {
  Bell, BellRing, CalendarPlus, Share2, ShoppingBag, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eventPrepPanelCard } from "@/lib/event-prep-zone-theme";
import {
  dismissPrepReminder,
  isCalendarSynced,
  isPrepReminderDismissed,
  loadReminderState,
  markCalendarSynced,
  saveReminderState,
} from "@/lib/event-prep-local";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useToast } from "@/hooks/use-toast";
import {
  hasPushRegistered,
  upsertFeatureNotificationSchedule,
} from "@/lib/feature-notification-schedule";
import { downloadEventCalendarIcs, googleCalendarUrl } from "@/lib/event-prep-calendar";
import { buildMaterialsList, shareTextList } from "@/lib/event-prep-share";
import { daysUntilEvent } from "@workspace/event-prep";

interface PrepReminderBannerProps {
  ev: SchoolEvent;
  childId: number;
  childName: string;
  nextDate: string;
  t: TFunction;
}

/** In-app smart reminder when a prep timeline step is due. */
export function EventPrepReminderBanner({
  ev,
  childId,
  childName,
  nextDate,
  t,
}: PrepReminderBannerProps) {
  const dueStep = useMemo(() => {
    const daysLeft = daysUntilEvent(ev);
    const applicable = ev.prepTimeline
      .filter(
        (step) =>
          step.daysBefore >= daysLeft &&
          !isPrepReminderDismissed(ev.id, childId, step.daysBefore),
      )
      .sort((a, b) => a.daysBefore - b.daysBefore);
    return applicable[0] ?? null;
  }, [ev, childId]);

  const [dismissed, setDismissed] = useState(false);
  if (!dueStep || dismissed) return null;

  return (
    <div
      className={cn(
        eventPrepPanelCard(),
        "flex items-start gap-3 border-amber-400/30 bg-amber-400/[0.08] p-4",
      )}
    >
      <BellRing className="h-5 w-5 shrink-0 text-amber-300 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          {t("screens.event_prep.reminder_banner_title", {
            name: childName,
            event: ev.name,
          })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{dueStep.label}</p>
      </div>
      <button
        type="button"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => {
          dismissPrepReminder(ev.id, childId, dueStep.daysBefore);
          setDismissed(true);
        }}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface SmartToolsProps {
  ev: SchoolEvent;
  upcoming?: UpcomingEvent | null;
  childId: number;
  childName: string;
  t: TFunction;
}

export function EventPrepSmartTools({ ev, upcoming, childId, childName, t }: SmartToolsProps) {
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const [calendarAdded, setCalendarAdded] = useState(() => isCalendarSynced(ev.id, childId));
  const [remindersOn, setRemindersOn] = useState(() => !!loadReminderState(ev.id, childId)?.enabled);
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied">("idle");

  const nextDate = upcoming?.nextDate ?? "";

  const onAddCalendar = () => {
    if (!nextDate) return;
    downloadEventCalendarIcs({
      eventId: ev.id,
      eventName: ev.name,
      nextDate,
      overview: ev.overview,
    });
    markCalendarSynced(ev.id, childId);
    setCalendarAdded(true);
  };

  const onToggleReminders = async () => {
    if (!remindersOn) {
      if (!hasPushRegistered()) {
        toast({
          title: t("screens.event_prep.reminder_enabled_title"),
          description: t("screens.event_prep.reminder_push_required", {
            defaultValue: "Enable push notifications in Settings to receive event prep reminders.",
          }),
          variant: "destructive",
        });
        return;
      }
      if (!nextDate) return;
      const ok = await upsertFeatureNotificationSchedule(authFetch, {
        scheduleType: "event_prep",
        entityId: ev.id,
        childId,
        enabled: true,
        config: {
          eventName: ev.name,
          eventDate: nextDate,
          deepLink: "/event-prep",
        },
      });
      if (!ok) {
        toast({
          title: t("screens.event_prep.reminder_enabled_title"),
          variant: "destructive",
        });
        return;
      }
      saveReminderState({
        enabled: true,
        eventId: ev.id,
        childId,
        scheduledAt: new Date().toISOString(),
      });
      setRemindersOn(true);
      toast({
        title: t("screens.event_prep.reminder_enabled_title"),
        description: t("screens.event_prep.reminder_enabled_body", { event: ev.name }),
      });
      return;
    }
    await upsertFeatureNotificationSchedule(authFetch, {
      scheduleType: "event_prep",
      entityId: ev.id,
      childId,
      enabled: false,
    });
    saveReminderState({
      enabled: false,
      eventId: ev.id,
      childId,
      scheduledAt: new Date().toISOString(),
    });
    setRemindersOn(false);
  };

  const onShareList = async () => {
    const { title, lines } = buildMaterialsList(ev.name, childName, ev.whatToPrepare);
    const result = await shareTextList({ title, lines });
    setShareStatus(result === "shared" ? "shared" : result === "copied" ? "copied" : "idle");
    window.setTimeout(() => setShareStatus("idle"), 2500);
  };

  return (
    <div className={cn(eventPrepPanelCard(), "p-4 space-y-3")}>
      <h3 className="font-quicksand font-bold text-sm text-foreground">
        {t("screens.event_prep.smart_tools_title")}
      </h3>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full border-white/15"
          onClick={onAddCalendar}
          disabled={!nextDate}
        >
          <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
          {calendarAdded
            ? t("screens.event_prep.calendar_added")
            : t("screens.event_prep.add_to_calendar")}
        </Button>
        {nextDate && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full text-xs"
            onClick={() => window.open(googleCalendarUrl({
              eventName: ev.name,
              nextDate,
              overview: ev.overview,
            }), "_blank", "noopener")}
          >
            Google
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full border-white/15"
          onClick={() => void onToggleReminders()}
        >
          {remindersOn ? <BellRing className="h-3.5 w-3.5 mr-1.5" /> : <Bell className="h-3.5 w-3.5 mr-1.5" />}
          {remindersOn
            ? t("screens.event_prep.reminders_on")
            : t("screens.event_prep.enable_reminders")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full border-white/15"
          onClick={() => void onShareList()}
        >
          <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
          {shareStatus === "copied"
            ? t("screens.event_prep.list_copied")
            : shareStatus === "shared"
              ? t("screens.event_prep.list_shared")
              : t("screens.event_prep.share_shopping_list")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full border-white/15"
          onClick={() => void shareTextList({
            title: `${ev.name} — Event Prep`,
            lines: [...ev.whatToPrepare, ...ev.checklist],
          })}
        >
          <Share2 className="h-3.5 w-3.5 mr-1.5" />
          {t("screens.event_prep.share_prep_plan")}
        </Button>
      </div>
    </div>
  );
}
