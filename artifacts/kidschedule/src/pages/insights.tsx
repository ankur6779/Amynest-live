import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Calendar, Smile, Heart, Trophy, Flame, Sun, Moon, Sparkles } from "lucide-react";

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
  const val = pts ?? pct ?? 0;
  if (val > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-400 px-2 py-0.5 rounded-full">
      <TrendingUp className="h-3 w-3" />+{Math.abs(val).toFixed(0)}{pts !== undefined ? "pts" : "%"}
    </span>
  );
  if (val < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/15 dark:text-rose-400 px-2 py-0.5 rounded-full">
      <TrendingDown className="h-3 w-3" />-{Math.abs(val).toFixed(0)}{pts !== undefined ? "pts" : "%"}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      <Minus className="h-3 w-3" />No change
    </span>
  );
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar: Calendar, happy: Smile, heart: Heart, trophy: Trophy,
  flame: Flame, sunny: Sun, moon: Moon, sparkles: Sparkles,
  "color-palette": Sparkles,
};

export default function InsightsPage() {
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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-quicksand font-extrabold text-foreground">Insights</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Activity trends & highlights</p>
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
                {r === "week" ? "This Week" : "This Month"}
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
              <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-3xl">👶</div>
              <h2 className="font-bold text-lg">Add a child to see insights</h2>
              <p className="text-sm text-muted-foreground">Insights are personalised per child once you add their profile.</p>
              <Link href="/children/new">
                <button className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">Add Child</button>
              </Link>
            </CardContent>
          </Card>
        )}

        {!isLoading && data?.hasChildren && !data.hasActivity && (
          <Card className="rounded-3xl">
            <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-3xl">📊</div>
              <h2 className="font-bold text-lg">No activity yet this {range}</h2>
              <p className="text-sm text-muted-foreground">Complete routines or log behaviors to unlock your {range}ly insights.</p>
              <Link href="/routines">
                <button className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">Go to Routines</button>
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
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Routines</p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">{data.summary.routinesThisPeriod}</p>
                  <div className="mt-2">
                    <ChangeChip pct={data.summary.routinesChangePct} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">vs {data.summary.routinesPreviousPeriod} last {range}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Positive Rate</p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">{data.summary.positiveRateThisPeriod.toFixed(0)}%</p>
                  <div className="mt-2">
                    <ChangeChip pts={data.summary.positiveRateChangePts} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">vs {data.summary.positiveRatePreviousPeriod.toFixed(0)}% last {range}</p>
                </CardContent>
              </Card>
            </div>

            {/* Per Child */}
            {data.perChild.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-quicksand font-bold text-base text-foreground">Per Child</h2>
                {data.perChild.map((child) => (
                  <Card key={child.childId} className="rounded-2xl">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-foreground">{child.childName}</p>
                        <span className="text-xs text-muted-foreground">{child.activeDays} active day{child.activeDays !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          { label: "Routines", value: child.routinesCount },
                          { label: "Behaviors", value: child.behaviorsCount },
                          { label: "Positive", value: `${child.positiveRate.toFixed(0)}%` },
                          { label: "Milestones", value: child.milestoneCount },
                          { label: "Morning", value: child.morningCount },
                          { label: "Evening", value: child.eveningCount },
                        ].map((stat) => (
                          <div key={stat.label} className="flex justify-between bg-muted/50 rounded-lg px-3 py-1.5">
                            <span className="text-muted-foreground text-xs">{stat.label}</span>
                            <span className="font-bold text-foreground text-xs">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                      {child.topCategory && (
                        <p className="text-xs text-muted-foreground">Top category: <span className="font-semibold text-foreground">{child.topCategory}</span></p>
                      )}
                      {/* Completion bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Completion rate</span>
                          <span className="font-bold text-foreground">{child.routineCompletionRate.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500"
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
                <h2 className="font-quicksand font-bold text-base text-foreground">Highlights</h2>
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
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-200 dark:border-violet-500/30 cursor-pointer hover:from-violet-500/15 hover:to-pink-500/15 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Ask Amy about these insights</p>
                  <p className="text-xs text-muted-foreground">Get personalised parenting advice based on your data</p>
                </div>
              </div>
            </Link>
          </>
        )}
      </div>
    </Layout>
  );
}
