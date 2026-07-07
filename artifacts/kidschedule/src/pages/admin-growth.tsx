import { parseApiJson } from "@/lib/safe-json-response";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Activity, ChevronLeft, Lock, RefreshCw, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/admin/growth/export-menu";
import { TimeFilter } from "@/components/admin/growth/time-filter";
import { ViewModeToggle } from "@/components/admin/growth/view-mode-toggle";
import { GosNav, parseGosSection } from "@/components/admin/growth/gos-nav";
import { GosSectionContent } from "@/components/admin/growth/gos-section-content";
import { AdminGrowthOverview } from "@/components/admin/growth/admin-growth-overview";
import { buildDashboardQuery } from "@/components/admin/growth/gos-types";
import type { DashboardViewMode, GrowthDashboardData, GrowthTimePreset } from "@/components/admin/growth/types";

export default function AdminGrowthPage() {
  const authFetch = useAuthFetch();
  const [location] = useLocation();
  const section = parseGosSection(location);
  const [preset, setPreset] = useState<GrowthTimePreset>("last_7_days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [viewMode, setViewMode] = useState<DashboardViewMode>("full");

  const queryUrl = useMemo(
    () => buildDashboardQuery(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-growth", preset, customStart, customEnd],
    queryFn: async (): Promise<GrowthDashboardData> => {
      const res = await authFetch(queryUrl);
      if (res.status === 403) throw new Error("not_admin");
      if (!res.ok) throw new Error(`http_${res.status}`);
      const json = await parseApiJson<GrowthDashboardData & { ok?: boolean }>(res);
      return json;
    },
    refetchInterval: 60_000,
  });

  const applyFilter = () => {
    void refetch();
  };

  if (error instanceof Error && error.message === "not_admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-background">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">Admin access required</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your Firebase UID must be listed in <code>ADMIN_USER_IDS</code>.
        </p>
        <Link href="/dashboard">
          <Button variant="outline">Back to app</Button>
        </Link>
      </div>
    );
  }

  const sectionTitle =
    section === "overview"
      ? "Growth Intelligence"
      : section.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 print:bg-white print:text-black">
      <div className="pointer-events-none fixed inset-0 overflow-hidden print:hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/90 backdrop-blur-md print:static print:bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="gap-1.5 print:hidden">
                <ChevronLeft className="h-4 w-4" />
                Ops
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <div>
                <h1 className="font-quicksand font-bold text-lg">{sectionTitle}</h1>
                <p className="text-[11px] text-muted-foreground">Growth Operating System</p>
                {data?.timeRange.label && (
                  <p className="text-[10px] text-muted-foreground">{data.timeRange.label}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {section === "overview" && <ViewModeToggle mode={viewMode} onChange={setViewMode} />}
            {data && section === "overview" && <ExportMenu data={data} />}
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
        <div className="max-w-7xl mx-auto px-4 pb-3 space-y-2 print:hidden">
          <GosNav active={section} />
          <TimeFilter
            preset={preset}
            customStart={customStart}
            customEnd={customEnd}
            onPresetChange={setPreset}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
            onApply={applyFilter}
          />
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading && section === "overview" && (
          <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
            <Activity className="h-5 w-5 animate-pulse" />
            <span>Loading growth intelligence…</span>
          </div>
        )}

        {error && !(error instanceof Error && error.message === "not_admin") && section === "overview" && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm">
            Failed to load dashboard. Check API connectivity and admin permissions.
          </div>
        )}

        {data && section === "overview" && (
          <AdminGrowthOverview data={data} viewMode={viewMode} />
        )}

        {section !== "overview" && (
          <GosSectionContent
            section={section}
            preset={preset}
            customStart={customStart}
            customEnd={customEnd}
          />
        )}

        {data && (
          <p className="text-[10px] text-muted-foreground text-center print:text-black">
            Generated {new Date(data.generatedAt).toLocaleString()} · Internal use only
          </p>
        )}
      </main>
    </div>
  );
}
