import { parseApiJson } from "@/lib/safe-json-response";
import { useState } from "react";
import { Link } from "wouter";
import { AddChildLink } from "@/components/add-child-link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { getApiUrl } from "@/lib/api";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Smile,
  Heart,
  Trophy,
  Flame,
  Sun,
  Moon,
  Sparkles,
  Calculator,
  RefreshCw,
  Lock,
} from "lucide-react";

type Range = "week" | "month";

interface PerChildInsights {
  childId: number;
  childName: string;
  routinesCount: number;
  behaviorsCount: number;
  positiveCount: number;
  positiveRate: number;
  routineCompletionRate: number;
  topCategory: string | null;
  milestoneCount: number;
  activeDays: number;
  morningCount: number;
  eveningCount: number;
  categoryVariety: number;
}

interface SiblingHighlight {
  childId: number;
  childName: string;
  headline: string;
  detail: string;
  icon: string;
  accent: string;
}

interface AbacusWeeklyChild {
  childId: number;
  childName: string;
  childAge: number | null;
  hasProgress: boolean;
  currentLevel: number;
  currentLevelLabel: string;
  highestUnlocked: number;
  levelsCompletedTotal: number;
  levelsCompletedThisWeek: number;
  pointsThisWeek: number;
  accuracyPct: number;
  accuracyIsWeekly: boolean;
  totalCorrect: number;
  totalAttempts: number;
  totalPoints: number;
  lastActiveAt: string | null;
  nextRecommendedAction: string;
}

interface AbacusWeeklySummary {
  generatedAt: string;
  children: AbacusWeeklyChild[];
  eligibleWithoutProgress: Array<{ childId: number; childName: string; childAge: number | null }>;
}

interface InsightsResponse {
  range: Range;
  generatedAt: string;
  hasChildren: boolean;
  hasActivity: boolean;
  emptyReason: "no_children" | "no_activity" | null;
  summary: {
    routinesThisPeriod: number;
    routinesPreviousPeriod: number;
    routinesChangePct: number;
    behaviorsThisPeriod: number;
    behaviorsPreviousPeriod: number;
    positiveRateThisPeriod: number;
    positiveRatePreviousPeriod: number;
    positiveRateChangePts: number;
  };
  perChild: PerChildInsights[];
  siblingHighlights: SiblingHighlight[];
  fallback?: boolean;
}

function ChangeChip({ pct, pts }: { pct?: number; pts?: number }) {
  const { t } = useTranslation();
  const val = pts ?? pct ?? 0;
  if (val > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
      <TrendingUp className="h-3 w-3" />+{Math.abs(val).toFixed(0)}{pts !== undefined ? "pts" : "%"}
    </span>
  );
  if (val < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
      <TrendingDown className="h-3 w-3" />-{Math.abs(val).toFixed(0)}{pts !== undefined ? "pts" : "%"}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      <Minus className="h-3 w-3" />{t("screens.insights.no_change")}
    </span>
  );
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  calendar: Calendar, happy: Smile, heart: Heart, trophy: Trophy,
  flame: Flame, sunny: Sun, moon: Moon, sparkles: Sparkles,
  "color-palette": Sparkles,
};

function PremiumInsightCard({
  title,
  body,
  source,
  cta,
}: {
  title: string;
  body: string;
  source: string;
  cta: string;
}) {
  return (
    <Card className="rounded-2xl border-violet-500/25 bg-violet-500/5 relative overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-violet-500/10 to-transparent" />
        <div className="flex items-center gap-2 relative">
          <Lock className="h-4 w-4 text-violet-300" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
            What you unlock
          </p>
        </div>
        <div className="relative space-y-1 opacity-90 blur-[0.6px] select-none" aria-hidden>
          <p className="text-xs font-semibold text-foreground">★★★★★ Sleep quality</p>
          <p className="text-xs font-semibold text-foreground">★★★★☆ Language growth</p>
          <p className="text-xs font-semibold text-foreground">★★★★★ Emotional trends</p>
        </div>
        <h3 className="font-bold text-foreground relative">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed relative">{body}</p>
        <Button
          type="button"
          size="sm"
          className="rounded-full relative"
          onClick={() =>
            openSubscriptionGate({ reason: "premium_insight", source })
          }
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function InsightsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>("week");
  const authFetch = useAuthFetch();
  const { isPremium } = useSubscription();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<InsightsResponse>({
    queryKey: ["insights", range],
    queryFn: async () => {
      const res = await authFetch(getApiUrl(`/api/dashboard/insights?range=${range}`));
      if (!res.ok) throw new Error("Failed to load insights");
      return parseApiJson(res);
    },
    staleTime: 5 * 60_000,
  });

  const loadFailed = isError || data?.fallback === true;

  const { data: abacus } = useQuery<AbacusWeeklySummary>({
    queryKey: ["abacus-weekly-summary"],
    queryFn: async () => {
      const res = await authFetch(getApiUrl(`/api/abacus/weekly-summary`));
      if (!res.ok) throw new Error("Failed to load abacus summary");
      return parseApiJson(res);
    },
    staleTime: 5 * 60_000,
    enabled: isPremium,
  });

  const primaryChild = data?.perChild?.[0];
  const topWin = data?.siblingHighlights?.[0];
  const todayTip =
    primaryChild?.topCategory
      ? `Keep leaning into ${primaryChild.topCategory.toLowerCase()} — it's ${primaryChild.childName}'s strongest rhythm right now.`
      : "Complete today's routine and log one win — small consistency compounds fast.";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-quicksand font-extrabold text-foreground">{t("screens.insights.title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t("screens.insights.subtitle")}</p>
          </div>
          {isPremium ? (
            <div className="flex bg-muted rounded-xl p-1 gap-1">
              {(["week", "month"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    range === r
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "week" ? t("screens.insights.range_week") : t("screens.insights.range_month")}
                </button>
              ))}
            </div>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
              Today
            </span>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {!isLoading && loadFailed && (
          <Card className="rounded-3xl">
            <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">⚠️</div>
              <h2 className="font-bold text-lg">{t("screens.insights.load_error_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("screens.insights.load_error_text")}</p>
              <Button
                onClick={() => void refetch()}
                disabled={isFetching}
                className="rounded-full"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                {t("screens.insights.retry")}
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !loadFailed && data && !data.hasChildren && (
          <Card className="rounded-3xl">
            <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">👶</div>
              <h2 className="font-bold text-lg">{t("screens.insights.no_children_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("screens.insights.no_children_text")}</p>
              <AddChildLink source="insights-empty">
                <button className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">{t("screens.insights.add_child")}</button>
              </AddChildLink>
            </CardContent>
          </Card>
        )}

        {!isLoading && !loadFailed && data?.hasChildren && !data.hasActivity && (
          <Card className="rounded-3xl">
            <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">📊</div>
              <h2 className="font-bold text-lg">{range === "week" ? t("screens.insights.no_activity_week") : t("screens.insights.no_activity_month")}</h2>
              <p className="text-sm text-muted-foreground">{range === "week" ? t("screens.insights.no_activity_text_week") : t("screens.insights.no_activity_text_month")}</p>
              <Link href="/routines">
                <button className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">{t("screens.insights.go_to_routines")}</button>
              </Link>
            </CardContent>
          </Card>
        )}

        {!isLoading && !loadFailed && data?.hasActivity && !isPremium && (
          <>
            <Card className="rounded-2xl border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-500/5">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Today&apos;s Tip</p>
                <p className="text-sm font-semibold text-foreground leading-relaxed">{todayTip}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="rounded-2xl border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-orange-500/5">
                <CardContent className="p-4">
                  <p className="text-xs text-orange-300/90 font-semibold uppercase tracking-wide">Today&apos;s Progress</p>
                  <p className="text-3xl font-extrabold text-orange-300 mt-1">{data.summary.routinesThisPeriod}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Routines this period</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5">
                <CardContent className="p-4">
                  <p className="text-xs text-emerald-300/90 font-semibold uppercase tracking-wide">Current Streak</p>
                  <p className="text-3xl font-extrabold text-emerald-300 mt-1">{primaryChild?.activeDays ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Active days</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Wins</p>
                {topWin ? (
                  <>
                    <p className="font-bold text-sm text-foreground">{topWin.headline}</p>
                    <p className="text-xs text-muted-foreground">{topWin.detail}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Keep logging routines — your next win will show up here.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h2 className="font-quicksand font-bold text-base text-foreground">
                Unlock deeper insights
              </h2>
              <PremiumInsightCard
                title="Weekly Report"
                body="See patterns across the week — what improved, what needs attention, and one clear next step for your child."
                source="insights_weekly_report"
                cta="Unlock Weekly Reports"
              />
              <PremiumInsightCard
                title="Monthly Trends"
                body="Track long-term growth in routines, mood, and learning so you can celebrate progress that compounds."
                source="insights_monthly_trends"
                cta="Unlock Monthly Trends"
              />
              <PremiumInsightCard
                title="Development Summary"
                body="A parent-ready summary of milestones, strengths, and focus areas — perfect for check-ins and PTMs."
                source="insights_development_summary"
                cta="Unlock Development Summary"
              />
              <PremiumInsightCard
                title="Family Intelligence"
                body="Multi-child insights and family rhythm recommendations that help the whole household stay calmer."
                source="insights_family_intelligence"
                cta="Unlock Family Intelligence"
              />
              <PremiumInsightCard
                title="Growth Forecast"
                body="Forward-looking guidance based on recent activity so you know what to prioritize next."
                source="insights_growth_forecast"
                cta="Unlock Growth Forecast"
              />
            </div>

            <Link href="/assistant">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-pink-500/15 border border-violet-500/30 cursor-pointer transition-all hover:border-violet-500/50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{t("screens.insights.ask_amy_title")}</p>
                  <p className="text-xs text-muted-foreground">{t("screens.insights.ask_amy_sub")}</p>
                </div>
              </div>
            </Link>
          </>
        )}

        {!isLoading && !loadFailed && data?.hasActivity && isPremium && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="rounded-2xl border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-orange-500/5">
                <CardContent className="p-4">
                  <p className="text-xs text-orange-300/90 font-semibold uppercase tracking-wide">{t("screens.insights.stat_routines")}</p>
                  <p className="text-3xl font-extrabold text-orange-300 mt-1">{data.summary.routinesThisPeriod}</p>
                  <div className="mt-2">
                    <ChangeChip pct={data.summary.routinesChangePct} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{t(range === "week" ? "screens.insights.vs_last_week" : "screens.insights.vs_last_month", { value: data.summary.routinesPreviousPeriod })}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5">
                <CardContent className="p-4">
                  <p className="text-xs text-emerald-300/90 font-semibold uppercase tracking-wide">{t("screens.insights.stat_positive_rate")}</p>
                  <p className="text-3xl font-extrabold text-emerald-300 mt-1">{data.summary.positiveRateThisPeriod.toFixed(0)}%</p>
                  <div className="mt-2">
                    <ChangeChip pts={data.summary.positiveRateChangePts} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{t(range === "week" ? "screens.insights.vs_last_week" : "screens.insights.vs_last_month", { value: `${data.summary.positiveRatePreviousPeriod.toFixed(0)}%` })}</p>
                </CardContent>
              </Card>
            </div>

            {data.perChild.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-quicksand font-bold text-base text-foreground">{t("screens.insights.section_per_child")}</h2>
                {data.perChild.map((child) => (
                  <Card key={child.childId} className="rounded-2xl">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-foreground">{child.childName}</p>
                        <span className="text-xs text-muted-foreground">{t("screens.insights.active_days", { count: child.activeDays })}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          { label: t("screens.insights.stat_routines"), value: child.routinesCount },
                          { label: t("screens.insights.stat_behaviors"), value: child.behaviorsCount },
                          { label: t("screens.insights.stat_positive"), value: `${child.positiveRate.toFixed(0)}%` },
                          { label: t("screens.insights.stat_milestones"), value: child.milestoneCount },
                          { label: t("screens.insights.stat_morning"), value: child.morningCount },
                          { label: t("screens.insights.stat_evening"), value: child.eveningCount },
                        ].map((stat) => (
                          <div key={stat.label} className="flex justify-between bg-muted/50 rounded-lg px-3 py-1.5">
                            <span className="text-muted-foreground text-xs">{stat.label}</span>
                            <span className="font-bold text-foreground text-xs">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                      {child.topCategory && (
                        <p className="text-xs text-muted-foreground">{t("screens.insights.top_category")} <span className="font-semibold text-foreground">{child.topCategory}</span></p>
                      )}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{t("screens.insights.completion_rate")}</span>
                          <span className="font-bold text-foreground">{child.routineCompletionRate.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-green-400 transition-all duration-500"
                            style={{ width: `${Math.min(100, child.routineCompletionRate)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {data.siblingHighlights.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-quicksand font-bold text-base text-foreground">{t("screens.insights.section_highlights")}</h2>
                <div className="space-y-2">
                  {data.siblingHighlights.map((h, i) => {
                    const IconComp = ICON_MAP[h.icon] ?? Sparkles;
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: h.accent + "22" }}>
                          <IconComp className="h-5 w-5" style={{ color: h.accent } as React.CSSProperties} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{h.childName}</p>
                          <p className="font-bold text-sm text-foreground">{h.headline}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{h.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Link href="/assistant">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-pink-500/15 border border-violet-500/30 cursor-pointer transition-all hover:border-violet-500/50 hover:shadow-[0_4px_20px_rgba(168,85,247,0.25)]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-[0_2px_10px_rgba(168,85,247,0.45)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{t("screens.insights.ask_amy_title")}</p>
                  <p className="text-xs text-muted-foreground">{t("screens.insights.ask_amy_sub")}</p>
                </div>
              </div>
            </Link>
          </>
        )}

        {!isLoading && !loadFailed && data?.hasChildren && isPremium && abacus && (abacus.children ?? []).length > 0 && (
          <div className="space-y-3">
            <h2 className="font-quicksand font-bold text-base text-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              {t("screens.insights.abacus_section_title")}
            </h2>
            {(abacus.children ?? []).map((c) => (
              <Card key={c.childId} className="rounded-2xl">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground">{c.childName}</p>
                    <span className="text-xs text-muted-foreground">
                      {t("screens.insights.abacus_level", { level: c.currentLevel, label: c.currentLevelLabel })}
                    </span>
                  </div>
                  {!c.hasProgress ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {t("screens.insights.abacus_no_sessions")}
                      </p>
                      <div className="flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-primary uppercase tracking-wide">
                            {t("screens.insights.abacus_next_up")}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {c.nextRecommendedAction}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-gradient-to-br from-sky-500/15 to-sky-500/5 border border-sky-500/25 rounded-lg px-3 py-2">
                          <p className="text-[11px] text-sky-300/90 uppercase font-semibold">
                            {c.accuracyIsWeekly ? t("screens.insights.abacus_accuracy") : t("screens.insights.abacus_lifetime_accuracy")}
                          </p>
                          <p className="text-lg font-extrabold text-sky-300">{c.accuracyPct}%</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/25 rounded-lg px-3 py-2">
                          <p className="text-[11px] text-amber-300/90 uppercase font-semibold">{t("screens.insights.stat_points")}</p>
                          <p className="text-lg font-extrabold text-amber-300">{c.pointsThisWeek}</p>
                          <p className="text-[10px] text-muted-foreground">{t("screens.insights.stat_points_this_week")}</p>
                        </div>
                        <div className="bg-gradient-to-br from-violet-500/15 to-violet-500/5 border border-violet-500/25 rounded-lg px-3 py-2">
                          <p className="text-[11px] text-violet-300/90 uppercase font-semibold">{t("screens.insights.stat_levels")}</p>
                          <p className="text-lg font-extrabold text-violet-300">
                            {c.levelsCompletedTotal}/5
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.levelsCompletedThisWeek > 0
                              ? t("screens.insights.stat_levels_new_this_week", { count: c.levelsCompletedThisWeek })
                              : t("screens.insights.stat_levels_no_new_this_week")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-primary uppercase tracking-wide">
                            {t("screens.insights.abacus_next_up")}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {c.nextRecommendedAction}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
