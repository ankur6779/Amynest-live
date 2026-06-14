import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, AlertCircle, BookOpen, CheckCircle2, Globe, Leaf, Drumstick, Salad } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGE_GROUPS, type AgeGroupId, type Nutrient } from "@/lib/nutrition-data";
import type { RegionConfig, RegionalFoodSource } from "@/lib/nutrition-region";

export function NutrientDetailDialog({
  nutrient,
  ageGroupId,
  open,
  onClose,
  regionConfig,
  regionalSources,
  localizeNote,
}: {
  nutrient: Nutrient | null;
  ageGroupId: AgeGroupId;
  open: boolean;
  onClose: () => void;
  regionConfig: RegionConfig;
  regionalSources: RegionalFoodSource[] | null;
  localizeNote: (note?: string) => string | undefined;
}) {
  const { t } = useTranslation();
  if (!nutrient) return null;
  const need = nutrient.dailyNeeds[ageGroupId];
  const ageGroup = AGE_GROUPS.find((a) => a.id === ageGroupId)!;
  const displaySources = regionalSources ?? nutrient.sources;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">{nutrient.emoji}</span>
            {nutrient.name}
          </DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            "rounded-xl p-4 flex items-start gap-3 border",
            nutrient.colorClass,
            nutrient.borderClass,
          )}
        >
          <Activity className={cn("h-5 w-5 mt-0.5 shrink-0", nutrient.textClass)} />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              {t("nutrition_hub.dialog.daily_need", { age: ageGroup.label })}
            </p>
            <p className={cn("text-2xl font-bold", nutrient.textClass)}>
              {need.amount} <span className="text-base font-medium">{need.unit}</span>
            </p>
            {need.note && <p className="text-xs text-muted-foreground mt-1">{localizeNote(need.note)}</p>}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-foreground" />
            {t("nutrition_hub.dialog.benefits")}
          </h3>
          <ul className="space-y-1.5">
            {nutrient.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-foreground mt-0.5">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <Salad className="h-4 w-4 text-foreground" />
            {regionConfig.foodSourceTitle}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displaySources.map((src, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <span className="text-xl">{src.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{src.name}</span>
                    {src.type === "veg" ? (
                      <Leaf className="h-3 w-3 text-foreground shrink-0" />
                    ) : (
                      <Drumstick className="h-3 w-3 text-foreground shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {src.serving} → <strong>{src.amount}</strong>
                  </p>
                  {"trustTag" in src && (src as RegionalFoodSource).trustTag && (
                    <p className="text-xs text-primary font-medium mt-0.5">
                      {(src as RegionalFoodSource).trustTag}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <Globe className="h-3 w-3" />
            {regionConfig.flag} {regionConfig.trustLabel}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-foreground" />
            {t("nutrition_hub.dialog.deficiency_signs")}
          </h3>
          <div className="rounded-xl bg-muted border border-border p-3 space-y-1.5">
            {nutrient.deficiencySymptoms.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {regionConfig.sourceRef}
        </p>
      </DialogContent>
    </Dialog>
  );
}
