import { useState } from "react";
import type { GrowthTimePreset } from "./types";
import type { CohortExplorerRow } from "./gos-types";
import { useGosSection } from "./use-gos-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COHORT_TYPES = [
  { id: "install", label: "Install Date" },
  { id: "signup", label: "Signup Date" },
  { id: "subscription", label: "Subscription Date" },
] as const;

export function CohortExplorerPanel({
  preset,
  customStart,
  customEnd,
}: {
  preset: GrowthTimePreset;
  customStart: string;
  customEnd: string;
}) {
  const [cohortType, setCohortType] = useState<"install" | "signup" | "subscription">("install");
  const { data, isLoading } = useGosSection<{ cohortType: string; rows: CohortExplorerRow[] }>(
    "cohorts",
    preset,
    customStart,
    customEnd,
    { cohortType },
  );

  const rows = data?.data.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap print:hidden">
        {COHORT_TYPES.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant="outline"
            className={cn("h-7 text-xs", cohortType === t.id && "border-primary/50 bg-primary/10")}
            onClick={() => setCohortType(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading cohorts…</p>}

      {rows.length === 0 && !isLoading ? (
        <p className="text-xs text-muted-foreground">No cohort data for this period.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground text-left">
                <th className="p-2">Cohort</th>
                <th className="p-2">Size</th>
                <th className="p-2">D1</th>
                <th className="p-2">D7</th>
                <th className="p-2">D30</th>
                <th className="p-2">Sub Rate</th>
                <th className="p-2">Revenue Users</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cohort} className="border-b border-white/5">
                  <td className="p-2 font-medium">{r.cohort}</td>
                  <td className="p-2">{r.cohortSize}</td>
                  <td className="p-2">{r.d1 != null ? `${r.d1}%` : "—"}</td>
                  <td className="p-2">{r.d7 != null ? `${r.d7}%` : "—"}</td>
                  <td className="p-2">{r.d30 != null ? `${r.d30}%` : "—"}</td>
                  <td className="p-2">{r.subscriptionRate != null ? `${r.subscriptionRate}%` : "—"}</td>
                  <td className="p-2">{r.revenueUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
