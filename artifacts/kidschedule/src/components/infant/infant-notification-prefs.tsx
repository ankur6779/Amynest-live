import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { FF_INFANT_NOTIFICATIONS } from "@/lib/infant-feature-flags";

const PREFS_KEY = "amynest:infant-notification-prefs";

type InfantNotifPrefs = {
  napReminders: boolean;
  feedReminders: boolean;
  vaccineReminders: boolean;
  milestoneTips: boolean;
  sleepDrift: boolean;
};

const DEFAULT_PREFS: InfantNotifPrefs = {
  napReminders: true,
  feedReminders: true,
  vaccineReminders: true,
  milestoneTips: true,
  sleepDrift: false,
};

function loadPrefs(): InfantNotifPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function InfantNotificationPrefs() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<InfantNotifPrefs>(loadPrefs);

  if (!FF_INFANT_NOTIFICATIONS) return null;

  function toggle(key: keyof InfantNotifPrefs) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
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
        {t("components.infant_notif.lead", "Control infant care notifications. Respects your global quiet hours.")}
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
    </div>
  );
}

export function getInfantNotificationPrefs(): InfantNotifPrefs {
  return loadPrefs();
}
