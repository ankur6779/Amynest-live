import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Moon } from "lucide-react";
import { updateInfantUserProperties } from "@/lib/infant-hub-analytics";
import {
  fetchInfantNotificationPrefs,
  snoozeInfantNotification,
  syncInfantNotificationPrefs,
  type InfantNotifKind,
  type InfantNotifPrefs,
} from "@/lib/infant-notification-api";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Button } from "@/components/ui/button";

const PREFS_KEY = "amynest:infant-notification-prefs";

const DEFAULT_PREFS: InfantNotifPrefs = {
  napReminders: true,
  feedReminders: true,
  vaccineReminders: true,
  milestoneTips: true,
  sleepDrift: false,
};

function loadLocalPrefs(): InfantNotifPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

const SNOOZE_KINDS: { kind: InfantNotifKind; label: string }[] = [
  { kind: "nap_window", label: "Nap reminders" },
  { kind: "feed_reminder", label: "Feed reminders" },
  { kind: "vaccine_due", label: "Vaccine alerts" },
  { kind: "milestone_tip", label: "Activity tips" },
  { kind: "sleep_drift", label: "Sleep pattern alerts" },
];

export function InfantNotificationPrefs({
  childId,
  ageMonths,
}: {
  childId?: number;
  ageMonths?: number;
}) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const [prefs, setPrefs] = useState<InfantNotifPrefs>(loadLocalPrefs);
  const [maxPerDay, setMaxPerDay] = useState(2);
  const [snoozeBusy, setSnoozeBusy] = useState<string | null>(null);

  useEffect(() => {
    if (childId == null) return;
    void fetchInfantNotificationPrefs(childId, authFetch)
      .then((server) => {
        setPrefs({
          napReminders: server.napReminders,
          feedReminders: server.feedReminders,
          vaccineReminders: server.vaccineReminders,
          milestoneTips: server.milestoneTips,
          sleepDrift: server.sleepDrift,
        });
        setMaxPerDay(server.maxPerDay);
        localStorage.setItem(PREFS_KEY, JSON.stringify(server));
      })
      .catch(() => {
        /* keep local prefs */
      });
  }, [authFetch, childId]);

  function persist(next: InfantNotifPrefs) {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      if (childId != null && ageMonths != null) {
        updateInfantUserProperties(childId, ageMonths, {
          notificationsEnabled: Object.values(next).some(Boolean),
        });
        void syncInfantNotificationPrefs(childId, next, authFetch).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }

  function toggle(key: keyof InfantNotifPrefs) {
    persist({ ...prefs, [key]: !prefs[key] });
  }

  async function handleSnooze(kind: InfantNotifKind) {
    if (childId == null) return;
    setSnoozeBusy(kind);
    try {
      await snoozeInfantNotification(childId, kind, 4, authFetch);
    } finally {
      setSnoozeBusy(null);
    }
  }

  const rows: { key: keyof InfantNotifPrefs; label: string }[] = [
    { key: "napReminders", label: t("components.infant_notif.nap", "Nap window reminders") },
    { key: "feedReminders", label: t("components.infant_notif.feed", "Feed reminders") },
    { key: "vaccineReminders", label: t("components.infant_notif.vaccine", "Vaccine due alerts") },
    { key: "milestoneTips", label: t("components.infant_notif.milestone", "Milestone activity tips") },
    { key: "sleepDrift", label: t("components.infant_notif.drift", "Sleep schedule drift") },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-white/[0.03] p-4 space-y-3" data-testid="infant-notification-prefs">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">{t("components.infant_notif.title", "Smart reminders")}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {t(
          "components.infant_notif.lead",
          "Timely nap, feed, and vaccine reminders. Respects quiet hours and limits to {{max}} infant alerts per day.",
          { max: maxPerDay },
        )}
      </p>
      <div className="space-y-2">
        {rows.map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between gap-3 text-sm cursor-pointer">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={() => toggle(key)}
              className="h-4 w-4 rounded border-border"
            />
          </label>
        ))}
      </div>

      {childId != null && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Moon className="h-3 w-3" />
            {t("components.infant_notif.snooze", "Snooze for 4 hours")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SNOOZE_KINDS.map(({ kind, label }) => (
              <Button
                key={kind}
                type="button"
                variant="outline"
                size="sm"
                disabled={snoozeBusy === kind}
                onClick={() => void handleSnooze(kind)}
                className="rounded-full text-[10px] h-7 px-2.5"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function getInfantNotificationPrefs(): InfantNotifPrefs {
  return loadLocalPrefs();
}
