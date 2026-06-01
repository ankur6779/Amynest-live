import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Plus } from "lucide-react";
import { fetchGrowthHistory, logGrowth } from "@/lib/infant-care-api";
import type { InfantActivationStatus } from "@/lib/infant-activation-api";
import { infantActivationQueryKey } from "@/lib/infant-activation-api";
import { trackGrowthMeasurementAdded, trackGrowthChartViewed } from "@/lib/infant-hub-analytics";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type GrowthTrackerProps = {
  childId: number;
  ageMonths: number;
  activation?: InfantActivationStatus;
};

export function GrowthTracker({ childId, ageMonths, activation }: GrowthTrackerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [head, setHead] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["infant-growth", childId],
    queryFn: () => fetchGrowthHistory(childId),
  });

  const measurements = (data?.measurements ?? []) as Array<{
    weightKg?: number | null;
    heightCm?: number | null;
    headCm?: number | null;
    measuredAt: string;
    reassurance?: Record<string, string>;
  }>;

  const latest = measurements[0];

  useEffect(() => {
    if (measurements.length > 0) {
      trackGrowthChartViewed(childId, ageMonths);
    }
  }, [childId, ageMonths, measurements.length]);

  async function handleSave() {
    setSaving(true);
    try {
      await logGrowth(childId, {
        weightKg: weight ? parseFloat(weight) : undefined,
        heightCm: height ? parseFloat(height) : undefined,
        headCm: head ? parseFloat(head) : undefined,
      });
      const types: Array<"weight" | "height" | "head_circumference"> = [];
      if (weight) types.push("weight");
      if (height) types.push("height");
      if (head) types.push("head_circumference");
      trackGrowthMeasurementAdded(childId, ageMonths, types);
      await queryClient.invalidateQueries({ queryKey: ["infant-growth", childId] });
      await queryClient.invalidateQueries({ queryKey: infantActivationQueryKey(childId) });
      setWeight("");
      setHeight("");
      setHead("");
      toast({ description: t("components.growth_tracker.saved", "Growth logged") });
    } catch {
      toast({ description: t("components.growth_tracker.error", "Could not save"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="growth-tracker">
      {!latest && (
        <div className="rounded-xl border border-dashed border-emerald-400/30 bg-emerald-500/5 p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground/90">
            {t("components.growth_tracker.preview_title", "Growth Chart Preview")}
          </p>
          <p className="text-[12px] text-muted-foreground leading-snug">
            {t(
              "components.growth_tracker.preview_body",
              activation?.steps.weight
                ? "Add another measurement to see trends."
                : "Add first weight measurement to unlock growth tracking.",
            )}
          </p>
        </div>
      )}
      {latest && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold">{t("components.growth_tracker.latest", "Latest measurement")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            {latest.weightKg != null && (
              <div>
                <p className="font-bold text-foreground">{latest.weightKg} kg</p>
                <p className="text-muted-foreground">Weight</p>
              </div>
            )}
            {latest.heightCm != null && (
              <div>
                <p className="font-bold text-foreground">{latest.heightCm} cm</p>
                <p className="text-muted-foreground">Height</p>
              </div>
            )}
            {latest.headCm != null && (
              <div>
                <p className="font-bold text-foreground">{latest.headCm} cm</p>
                <p className="text-muted-foreground">Head</p>
              </div>
            )}
          </div>
          {latest.reassurance?.weight && (
            <p className="text-[11px] text-muted-foreground leading-snug">{latest.reassurance.weight}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          step="0.01"
          placeholder="kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="rounded-xl border border-border bg-card px-2 py-2 text-sm"
          aria-label="Weight kg"
        />
        <input
          type="number"
          step="0.1"
          placeholder="cm height"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="rounded-xl border border-border bg-card px-2 py-2 text-sm"
          aria-label="Height cm"
        />
        <input
          type="number"
          step="0.1"
          placeholder="cm head"
          value={head}
          onChange={(e) => setHead(e.target.value)}
          className="rounded-xl border border-border bg-card px-2 py-2 text-sm"
          aria-label="Head cm"
        />
      </div>
      <Button
        type="button"
        disabled={saving || (!weight && !height && !head)}
        onClick={handleSave}
        className="w-full rounded-xl gap-2"
      >
        <Plus className="h-4 w-4" />
        {t("components.growth_tracker.add", "Log measurement")}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        {t("components.growth_tracker.disclaimer", "WHO-style bands for reassurance only — not a diagnosis.")}
      </p>
    </div>
  );
}
