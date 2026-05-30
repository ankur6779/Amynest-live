import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  AlertTriangle,
  Baby,
  BarChart3,
  Bell,
  ChevronLeft,
  Lock,
  RefreshCw,
  Share2,
  TrendingDown,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DashboardAlert = {
  code: string;
  severity: "warning" | "critical";
  message: string;
  current: number;
  previous: number;
  changePct: number;
};

type InfantDashboardData = {
  windowDays: number;
  generatedAt: string;
  acquisition: {
    infantHubOpens: number;
    newInfantProfiles: number;
    activationStarts: number;
    activationCompletionRate: number;
  };
  engagement: {
    babyTodayViews: number;
    cryInsightUsage: number;
    avgFeedLogsPerUser: number;
    avgSleepLogsPerUser: number;
    avgGrowthEntriesPerUser: number;
  };
  retention: { d1: number; d7: number; d30: number; cohortSize: number };
  notifications: Record<
    string,
    { sent: number; opened: number; dismissed: number; openRate: number }
  >;
  sharing: {
    weeklyCardsGenerated: number;
    weeklyCardsShared: number;
    milestoneCardsShared: number;
    byMethod: Record<string, number>;
  };
  coParent: { inviteStarted: number; inviteSent: number; inviteAccepted: number };
  funnel: Array<{
    key: string;
    label: string;
    count: number;
    dropOffPct: number | null;
    conversionFromStartPct: number;
  }>;
  featureRanking: Array<{
    feature: string;
    label: string;
    dau: number;
    wau: number;
    retentionImpactScore: number;
  }>;
  ageBandActivity: Array<{ band: string; activeUsers: number; events: number }>;
  alerts: DashboardAlert[];
};

const WINDOW_OPTIONS = [7, 14, 30, 90];

const NOTIF_LABELS: Record<string, string> = {
  nap_window: "Nap",
  feed_reminder: "Feed",
  vaccine_due: "Vaccine",
  milestone_tip: "Milestone",
  sleep_drift: "Sleep Drift",
};

const SHARE_METHOD_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  system_share: "System Share",
  image: "Image Save",
  pdf: "PDF",
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 flex-1 min-w-[130px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{label}</p>
      <p className="text-2xl font-bold text-foreground font-quicksand mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <h2 className="font-semibold font-quicksand">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function AdminInfantParentingPage() {
  const authFetch = useAuthFetch();
  const [days, setDays] = useState(30);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-infant-parenting", days],
    queryFn: async (): Promise<InfantDashboardData> => {
      const res = await authFetch(`/api/admin/infant-parenting-analytics?days=${days}`);
      if (res.status === 403) throw new Error("not_admin");
      if (!res.ok) throw new Error(`http_${res.status}`);
      const json = (await res.json()) as InfantDashboardData & { ok?: boolean };
      return json;
    },
    refetchInterval: 30_000,
  });

  if (error instanceof Error && error.message === "not_admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">Admin access required</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to app</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />
                Ops
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-amber-400" />
              <h1 className="font-quicksand font-bold text-lg">Infant Parenting Analytics</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-white/10 overflow-hidden">
              {WINDOW_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold transition-colors",
                    days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5",
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-12">Loading infant analytics…</p>
        )}

        {data && (
          <>
            {data.alerts.length > 0 && (
              <Section title="Alerts">
                <div className="space-y-2">
                  {data.alerts.map((alert) => (
                    <div
                      key={alert.code}
                      className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
                    >
                      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.current}% vs {alert.previous}% prior period ({alert.changePct}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Acquisition">
              <div className="flex flex-wrap gap-3">
                <StatCard label="Hub Opens" value={data.acquisition.infantHubOpens} sub="Unique users" />
                <StatCard label="New Infant Profiles" value={data.acquisition.newInfantProfiles} />
                <StatCard label="Activation Starts" value={data.acquisition.activationStarts} />
                <StatCard
                  label="Activation Complete"
                  value={`${data.acquisition.activationCompletionRate}%`}
                  sub="Started → completed"
                />
              </div>
            </Section>

            <Section title="Engagement">
              <div className="flex flex-wrap gap-3">
                <StatCard label="Baby Today Views" value={data.engagement.babyTodayViews} sub="Unique users" />
                <StatCard label="Cry Insight Usage" value={data.engagement.cryInsightUsage} sub="Events + sessions" />
                <StatCard label="Feeds / User" value={data.engagement.avgFeedLogsPerUser} />
                <StatCard label="Sleep Logs / User" value={data.engagement.avgSleepLogsPerUser} />
                <StatCard label="Growth Entries / User" value={data.engagement.avgGrowthEntriesPerUser} />
              </div>
            </Section>

            <Section title="Retention (Infant Cohort)">
              <div className="flex flex-wrap gap-3">
                <StatCard label="D1" value={`${data.retention.d1}%`} sub={`n=${data.retention.cohortSize}`} />
                <StatCard label="D7" value={`${data.retention.d7}%`} />
                <StatCard label="D30" value={`${data.retention.d30}%`} />
              </div>
            </Section>

            <Section title="Onboarding Funnel">
              <div className="space-y-2">
                {data.funnel.map((step, i) => (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className="w-8 text-xs font-bold text-muted-foreground text-right">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{step.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {step.count} users
                          {step.dropOffPct != null && step.dropOffPct > 0 && (
                            <span className="text-rose-400 ml-2 inline-flex items-center gap-0.5">
                              <TrendingDown className="h-3 w-3" />
                              {step.dropOffPct}% drop
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                          style={{ width: `${Math.max(step.conversionFromStartPct, 2)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {step.conversionFromStartPct}% of hub opens
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <div className="grid lg:grid-cols-2 gap-6">
              <Section title="Notification Performance">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/10">
                        <th className="pb-2 pr-2">Type</th>
                        <th className="pb-2 pr-2">Sent</th>
                        <th className="pb-2 pr-2">Opened</th>
                        <th className="pb-2 pr-2">Dismissed</th>
                        <th className="pb-2">Open %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.notifications)
                        .filter(([k]) => k !== "other")
                        .map(([kind, row]) => (
                          <tr key={kind} className="border-b border-white/5">
                            <td className="py-2 pr-2 font-medium">
                              {NOTIF_LABELS[kind] ?? kind}
                            </td>
                            <td className="py-2 pr-2 tabular-nums">{row.sent}</td>
                            <td className="py-2 pr-2 tabular-nums">{row.opened}</td>
                            <td className="py-2 pr-2 tabular-nums">{row.dismissed}</td>
                            <td className="py-2 tabular-nums">{row.openRate}%</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Sharing">
                <div className="flex flex-wrap gap-3 mb-4">
                  <StatCard label="Weekly Generated" value={data.sharing.weeklyCardsGenerated} />
                  <StatCard label="Weekly Shared" value={data.sharing.weeklyCardsShared} />
                  <StatCard label="Milestone Shared" value={data.sharing.milestoneCardsShared} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">By method</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.sharing.byMethod).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No shares yet in this window</p>
                  ) : (
                    Object.entries(data.sharing.byMethod).map(([method, count]) => (
                      <Badge key={method} variant="secondary" className="gap-1">
                        <Share2 className="h-3 w-3" />
                        {SHARE_METHOD_LABELS[method] ?? method}: {count}
                      </Badge>
                    ))
                  )}
                </div>
              </Section>
            </div>

            <Section title="Co-Parent">
              <div className="flex flex-wrap gap-3">
                <StatCard label="Invite Started" value={data.coParent.inviteStarted} />
                <StatCard label="Invite Sent" value={data.coParent.inviteSent} />
                <StatCard label="Invite Accepted" value={data.coParent.inviteAccepted} />
              </div>
            </Section>

            <Section title="Feature Ranking">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/10">
                      <th className="pb-2 pr-3">Feature</th>
                      <th className="pb-2 pr-3">DAU</th>
                      <th className="pb-2 pr-3">WAU</th>
                      <th className="pb-2">Retention Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.featureRanking.map((row) => (
                      <tr key={row.feature} className="border-b border-white/5">
                        <td className="py-2.5 pr-3 font-medium">{row.label}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{row.dau}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{row.wau}</td>
                        <td className="py-2.5 tabular-nums">{row.retentionImpactScore}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Age Band Activity">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.ageBandActivity.map((row) => (
                  <div
                    key={row.band}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {row.band} months
                    </p>
                    <p className="text-xl font-bold font-quicksand mt-1">{row.activeUsers}</p>
                    <p className="text-[11px] text-muted-foreground">{row.events} events</p>
                  </div>
                ))}
                {data.ageBandActivity.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full">No age band data in window</p>
                )}
              </div>
            </Section>

            <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Generated {new Date(data.generatedAt).toLocaleString()} · {data.windowDays}-day window
            </p>
          </>
        )}
      </main>
    </div>
  );
}
