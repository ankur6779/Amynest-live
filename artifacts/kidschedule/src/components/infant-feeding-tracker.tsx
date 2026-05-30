import { useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Clock, Baby } from "lucide-react";
import { getFeedingGuide, pickLang, type Lang } from "@workspace/infant-hub";
import { fetchInfantCareSummary, logInfantCare, type InfantCareLogType } from "@/lib/infant-care-api";
import { infantActivationQueryKey } from "@/lib/infant-activation-api";
import { trackFeedLogged, trackFeedingHistoryViewed } from "@/lib/infant-hub-analytics";
import { suggestedFeedIntervalMin } from "@workspace/infant-hub";

type FeedKind = "breast" | "bottle" | "solid";

const KIND_TO_LOG: Record<FeedKind, InfantCareLogType> = {
  breast: "feed_breast",
  bottle: "feed_bottle",
  solid: "feed_solid",
};

function formatRelative(iso: string, now: number): string {
  const ms = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.round((now - ms) / 60_000));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
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
  const queryClient = useQueryClient();
  const guide = getFeedingGuide(ageMonths);
  const now = Date.now();

  const { data: summary } = useQuery({
    queryKey: ["infant-care-summary", childId],
    queryFn: () => fetchInfantCareSummary(childId),
    staleTime: 30_000,
  });

  const last = summary?.lastFeed ?? null;
  const interval = suggestedFeedIntervalMin(ageMonths);
  const lastMs = last ? new Date(last.loggedAt).getTime() : null;
  const nextDue = lastMs != null ? lastMs + interval * 60_000 : null;
  const overdue = nextDue != null && now > nextDue;

  const logFeed = useCallback(
    async (kind: FeedKind) => {
      await logInfantCare(childId, KIND_TO_LOG[kind]);
      const feedType = kind === "solid" ? "solids" : kind;
      trackFeedLogged(childId, ageMonths, feedType);
      await queryClient.invalidateQueries({ queryKey: ["infant-care-summary", childId] });
      await queryClient.invalidateQueries({ queryKey: ["infant-today", childId] });
      await queryClient.invalidateQueries({ queryKey: infantActivationQueryKey(childId) });
    },
    [childId, ageMonths, queryClient],
  );

  useEffect(() => {
    trackFeedingHistoryViewed(childId, ageMonths);
  }, [childId, ageMonths]);

  const kindLabel = useMemo(
    () => ({
      breast: t("components.infant_hub.feed_kind_breast"),
      bottle: t("components.infant_hub.feed_kind_bottle"),
      solid: t("components.infant_hub.feed_kind_solid"),
    }),
    [t],
  );

  const lastKind = last?.logType.replace("feed_", "") as FeedKind | undefined;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted dark:bg-card border border-border dark:border-border p-3">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-primary dark:text-foreground">
            {t("components.infant_hub.feeding_guide")}
          </p>
        </div>
        <p className="text-xs font-semibold text-primary dark:text-foreground">{pickLang(guide.type, lang)}</p>
        <p className="text-xs text-primary dark:text-muted-foreground mt-0.5">{pickLang(guide.freq, lang)}</p>
        <p className="text-[11px] text-primary dark:text-muted-foreground mt-1.5 leading-snug">{pickLang(guide.tip, lang)}</p>
      </div>

      <div className="rounded-xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-muted-foreground">
          {t("components.infant_hub.log_feed")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(["breast", "bottle", "solid"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => void logFeed(kind)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
              data-testid={`log-feed-${kind}`}
            >
              <Baby className="h-3 w-3 text-primary" />
              {kindLabel[kind]}
            </button>
          ))}
        </div>
      </div>

      {last && lastKind ? (
        <div
          className={[
            "rounded-xl border p-3 flex items-start gap-2",
            overdue ? "bg-amber-500/10 border-amber-500/30" : "bg-muted dark:bg-card border-border dark:border-border",
          ].join(" ")}
        >
          <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-foreground">
              {t("components.infant_hub.last_feed", {
                kind: kindLabel[lastKind] ?? lastKind,
                when: formatRelative(last.loggedAt, now),
              })}
            </p>
            {nextDue && (
              <p className={`text-[11px] mt-0.5 ${overdue ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-muted-foreground"}`}>
                {overdue
                  ? t("components.infant_hub.feed_due_now")
                  : t("components.infant_hub.next_feed_around", {
                      time: new Date(nextDue).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
                    })}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic px-1">{t("components.infant_hub.no_feed_logged")}</p>
      )}
    </div>
  );
}
