import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame, Clock, Baby } from "lucide-react";
import { getFeedingGuide, pickLang, type Lang } from "@workspace/infant-hub";

type FeedKind = "breast" | "bottle" | "solid";

type FeedEntry = {
  kind: FeedKind;
  at: number;
};

function storageKey(childId: number): string {
  return `amynest:feeding-log:${childId}`;
}

function loadLog(childId: number): FeedEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(childId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeedEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

function saveLog(childId: number, entries: FeedEntry[]) {
  try {
    localStorage.setItem(storageKey(childId), JSON.stringify(entries.slice(0, 20)));
  } catch {
    /* ignore quota */
  }
}

function formatRelative(ms: number, now: number): string {
  const diffMin = Math.max(0, Math.round((now - ms) / 60_000));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
}

/** Suggested interval between feeds (minutes) by age band. */
function suggestedIntervalMin(ageMonths: number): number {
  if (ageMonths < 3) return 150;
  if (ageMonths < 6) return 180;
  if (ageMonths < 12) return 210;
  return 240;
}

export function InfantFeedingTracker({
  childId,
  ageMonths,
  lang = "en",
}: {
  childId: number;
  ageMonths: number;
  lang?: Lang;
}) {
  const { t } = useTranslation();
  const guide = getFeedingGuide(ageMonths);
  const [entries, setEntries] = useState<FeedEntry[]>(() => loadLog(childId));
  const now = Date.now();

  const logFeed = useCallback(
    (kind: FeedKind) => {
      setEntries(prev => {
        const next = [{ kind, at: Date.now() }, ...prev].slice(0, 20);
        saveLog(childId, next);
        return next;
      });
    },
    [childId],
  );

  const last = entries[0] ?? null;
  const interval = suggestedIntervalMin(ageMonths);
  const nextDue = last ? last.at + interval * 60_000 : null;
  const overdue = nextDue != null && now > nextDue;

  const kindLabel = useMemo(
    () => ({
      breast: t("components.infant_hub.feed_kind_breast"),
      bottle: t("components.infant_hub.feed_kind_bottle"),
      solid: t("components.infant_hub.feed_kind_solid"),
    }),
    [t],
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted dark:bg-card border border-border dark:border-border p-3">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-primary dark:text-foreground">
            {t("components.infant_hub.feeding_guide")}
          </p>
        </div>
        <p className="text-xs font-semibold text-primary dark:text-foreground">
          {pickLang(guide.type, lang)}
        </p>
        <p className="text-xs text-primary dark:text-muted-foreground mt-0.5">
          {pickLang(guide.freq, lang)}
        </p>
        <p className="text-[11px] text-primary dark:text-muted-foreground mt-1.5 leading-snug">
          {pickLang(guide.tip, lang)}
        </p>
      </div>

      <div className="rounded-xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-muted-foreground">
          {t("components.infant_hub.log_feed")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(["breast", "bottle", "solid"] as const).map(kind => (
            <button
              key={kind}
              type="button"
              onClick={() => logFeed(kind)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
              data-testid={`log-feed-${kind}`}
            >
              <Baby className="h-3 w-3 text-primary" />
              {kindLabel[kind]}
            </button>
          ))}
        </div>
      </div>

      {last ? (
        <div
          className={[
            "rounded-xl border p-3 flex items-start gap-2",
            overdue
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-muted dark:bg-card border-border dark:border-border",
          ].join(" ")}
        >
          <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-foreground">
              {t("components.infant_hub.last_feed", {
                kind: kindLabel[last.kind],
                when: formatRelative(last.at, now),
              })}
            </p>
            {nextDue && (
              <p className={`text-[11px] mt-0.5 ${overdue ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-muted-foreground"}`}>
                {overdue
                  ? t("components.infant_hub.feed_due_now")
                  : t("components.infant_hub.next_feed_around", {
                      time: new Date(nextDue).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      }),
                    })}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic px-1">
          {t("components.infant_hub.no_feed_logged")}
        </p>
      )}
    </div>
  );
}
