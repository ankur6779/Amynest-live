import { useState } from "react";
import type { GrowthTimePreset } from "./types";
import type { JourneyStep } from "./gos-types";
import { useGosSection } from "./use-gos-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilterOptions = {
  countries: string[];
  platforms: string[];
  versions: string[];
  campaigns: string[];
};

export function JourneyExplorerPanel({
  preset,
  customStart,
  customEnd,
}: {
  preset: GrowthTimePreset;
  customStart: string;
  customEnd: string;
}) {
  const [filters, setFilters] = useState({
    country: "",
    platform: "",
    campaign: "",
    appVersion: "",
    feature: "",
  });
  const [applied, setApplied] = useState(filters);

  const { data, isLoading } = useGosSection<{
    steps: JourneyStep[];
    totalUsers: number;
    filterOptions: FilterOptions;
  }>("journey", preset, customStart, customEnd, applied);

  const steps = data?.data.steps ?? [];
  const options = data?.data.filterOptions;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 print:hidden">
        <Input placeholder="Country" value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })} className="h-8 text-xs" list="journey-countries" />
        <Input placeholder="Platform" value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value })} className="h-8 text-xs" list="journey-platforms" />
        <Input placeholder="Campaign" value={filters.campaign} onChange={(e) => setFilters({ ...filters, campaign: e.target.value })} className="h-8 text-xs" list="journey-campaigns" />
        <Input placeholder="App Version" value={filters.appVersion} onChange={(e) => setFilters({ ...filters, appVersion: e.target.value })} className="h-8 text-xs" list="journey-versions" />
        <Input placeholder="Feature" value={filters.feature} onChange={(e) => setFilters({ ...filters, feature: e.target.value })} className="h-8 text-xs" />
        <Button size="sm" className="h-8 text-xs sm:col-span-2 lg:col-span-1" onClick={() => setApplied(filters)}>
          Apply Filters
        </Button>
      </div>

      {options && (
        <>
          <datalist id="journey-countries">{options.countries?.map((c) => <option key={c} value={c} />)}</datalist>
          <datalist id="journey-platforms">{options.platforms?.map((p) => <option key={p} value={p} />)}</datalist>
          <datalist id="journey-campaigns">{options.campaigns?.map((c) => <option key={c} value={c} />)}</datalist>
          <datalist id="journey-versions">{options.versions?.map((v) => <option key={v} value={v} />)}</datalist>
        </>
      )}

      {isLoading && <p className="text-xs text-muted-foreground">Loading journey…</p>}

      {!isLoading && steps.length === 0 && (
        <p className="text-xs text-muted-foreground">No journey data for selected filters.</p>
      )}

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.step} className="flex items-center gap-3">
            <span className="w-28 text-[11px] font-medium shrink-0">{step.step}</span>
            <div className="flex-1 h-7 rounded bg-white/5 relative">
              <div
                className="absolute inset-y-0 left-0 bg-violet-500/30 rounded"
                style={{ width: `${step.pct ?? 0}%` }}
              />
              <span className="relative px-2 text-[11px] leading-7">
                {step.users.toLocaleString()} {step.pct != null ? `(${step.pct}%)` : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
