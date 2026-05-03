import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Calendar, Smile, Heart, Trophy, Flame, Sun, Moon, Sparkles, Calculator } from "lucide-react";

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
}

function ChangeChip({ pct, pts }: { pct?: number; pts?: number }) {
  const { t } = useTranslation();
  const val = pts ?? pct ?? 0;
  if (val > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">
      <TrendingUp className="h-3 w-3" />+{Math.abs(val).toFixed(0)}{pts !== undefined ? "pts" : "%"}
    </span>
  );
  if (val < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">
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

export default function InsightsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>("week");
  const authFetch = useAuthFetch();

  const { data, isLoading } = useQuery<InsightsResponse>({
    queryKey: ["insights", range],
    queryFn: async () => {
      const res = await authFetch(getApiUrl(`/api/dashboard/insights?range=${range}`));
      if (!res.ok) throw new Error("Failed to load insights");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  // Abacus weekly summary is independent of the week/month toggle — the
  // underlying schema only stores per-level best scores, so we can only
  // meaningfully aggregate over a fixed trailing 7-day window.
  const { data: abacus } = useQuery<AbacusWeeklySummary>({
    queryKey: ["abacus-weekly-summary"],
    queryFn: async () => {
      const res = await authFetch(getApiUrl(`/api/abacus/weekly-summary`));
      if (!res.ok) throw new Error("Failed to load abacus summary");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-quicksand font-extrabold text-foreground">{t("screens.insights.title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t("screens.insights.subtitle")}</p>
          </div>
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
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {!isLoading && data && !data.hasChildren && (
          <Card className="rounded-3xl">
            <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">👶</div>
              <h2 className="font-bold text-lg">{t("screens.insights.no_children_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("screens.insights.no_children_text")}</p>
              <Link href="/children/new">
                <button className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">{t("screens.insights.add_child")}</button>
              </Link>
            </CardContent>
          </Card>
        )}

        {!isLoading && data?.hasChildren && !data.hasActivity && (
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

        {!isLoading && data?.hasActivity && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="rounded-2xl">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{t("screens.insights.stat_routines")}</p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">{data.summary.routinesThisPeriod}</p>
                  <div className="mt-2">
                    <ChangeChip pct={data.summary.routinesChangePct} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{t(range === "week" ? "screens.insights.vs_last_week" : "screens.insights.vs_last_month", { value: data.summary.routinesPreviousPeriod })}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{t("screens.insights.stat_positive_rate")}</p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">{data.summary.positiveRateThisPeriod.toFixed(0)}%</p>
                  <div className="mt-2">
                    <ChangeChip pts={data.summary.positiveRateChangePts} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{t(range === "week" ? "screens.insights.vs_last_week" : "screens.insights.vs_last_month", { value: `${data.summary.positiveRatePreviousPeriod.toFixed(0)}%` })}</p>
                </CardContent>
              </Card>
            </div>

            {/* Per Child */}
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
                      {/* Completion bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{t("screens.insights.completion_rate")}</span>
                          <span className="font-bold text-foreground">{child.routineCompletionRate.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-card transition-all duration-500"
                            style={{ width: `${Math.min(100, child.routineCompletionRate)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Sibling Highlights */}
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

            {/* Ask Amy CTA */}
            <Link href="/assistant">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-primary-foreground shrink-0">
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

        {/* Abacus weekly progress (per-child) — rendered independently of
            the routines/behaviour activity gate above, so parents whose
            child is only active in the Abacus PRO Zone still see it. */}
        {!isLoading && data?.hasChildren && abacus && abacus.children.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-quicksand font-bold text-base text-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Abacus this week
            </h2>
            {abacus.children.map((c) => (
              <Card key={c.childId} className="rounded-2xl">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground">{c.childName}</p>
                    <span className="text-xs text-muted-foreground">
                      Level {c.currentLevel} · {c.currentLevelLabel}
                    </span>
                  </div>
                  {!c.hasProgress ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        No abacus sessions yet — open the Abacus PRO Zone in the Parent Hub to get started.
                      </p>
                      <div className="flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-primary uppercase tracking-wide">
                            Next up
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
                        <div className="bg-muted/50 rounded-lg px-3 py-2">
                          <p className="text-[11px] text-muted-foreground uppercase font-semibold">
                            {c.accuracyIsWeekly ? "Accuracy" : "Lifetime accuracy"}
                          </p>
                          <p className="text-lg font-extrabold text-foreground">{c.accuracyPct}%</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg px-3 py-2">
                          <p className="text-[11px] text-muted-foreground uppercase font-semibold">{t("screens.insights.stat_points")}</p>
                          <p className="text-lg font-extrabold text-foreground">{c.pointsThisWeek}</p>
                          <p className="text-[10px] text-muted-foreground">{t("screens.insights.stat_points_this_week")}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg px-3 py-2">
                          <p className="text-[11px] text-muted-foreground uppercase font-semibold">{t("screens.insights.stat_levels")}</p>
                          <p className="text-lg font-extrabold text-foreground">
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
                            Next up
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
