import { useTranslation } from "react-i18next";
import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Salad, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { HUB_EXPANDED_CONTENT_STACK, HUB_BODY } from "@/lib/parent-hub-premium";
import { isHealthZoneJourneyEligible } from "@/lib/hub-visibility";
import { roomsNutritionPreview } from "@/features/nutrition/lib/rooms-nutrition-preview";

type NutritionHubParentContentProps = {
  childAgeMonths: number;
  isFreeJourneyPeriod: boolean;
  isPremium: boolean;
  childName?: string;
  onOpenHub?: () => void;
};

export function NutritionHubParentContent({
  childAgeMonths,
  isFreeJourneyPeriod,
  isPremium,
  childName,
  onOpenHub,
}: NutritionHubParentContentProps) {
  const { t } = useTranslation();
  const tags = t("parent_hub.nutrition_tags", { returnObjects: true }) as string[];
  const preview = roomsNutritionPreview(childAgeMonths);

  return (
    <div
      className={HUB_EXPANDED_CONTENT_STACK}
      data-testid="nutrition-hub-parent-content"
      data-nutrition-band={preview.ageGroupId}
      data-age-months={String(childAgeMonths)}
      data-child-name={childName}
    >
      <p className={cn(HUB_BODY, "text-xs text-muted-foreground")}>
        {t("parent_hub.web_tiles.nutrition.intro")}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant="secondary"
          className="text-[10px]"
          data-testid="nutrition-age-band"
        >
          {preview.label}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {t("parent_hub.web_tiles.nutrition.ages_all")}
        </Badge>
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] border-emerald-500/25">
            {tag}
          </Badge>
        ))}
      </div>

      <div
        className="space-y-2 rounded-xl border border-white/[0.08] bg-card/40 p-3"
        data-testid="nutrition-age-preview"
        data-has-meal={preview.hasMeal ? "true" : "false"}
      >
        <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          {childName
            ? `Today for ${childName}`
            : t("parent_hub.web_tiles.nutrition.access_title")}
        </p>
        <p className="text-xs text-foreground/90">{preview.description}</p>
        {preview.focus ? (
          <p className="text-xs text-foreground/80">Focus: {preview.focus}</p>
        ) : null}
        {preview.hasMeal ? (
          <div data-testid="nutrition-today-meal" className="space-y-1">
            {preview.dayLabel ? (
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {preview.dayLabel}
              </p>
            ) : null}
            <p className="text-sm font-medium text-foreground">{preview.lunch}</p>
            {preview.snack ? (
              <p className="text-xs text-muted-foreground">Snack: {preview.snack}</p>
            ) : null}
          </div>
        ) : (
          <p data-testid="nutrition-preview-guidance" className="text-xs text-foreground/90">
            {preview.description}
          </p>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-white/[0.08] bg-card/40 p-3">
        <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          {t("parent_hub.web_tiles.nutrition.access_title")}
        </p>
        {isFreeJourneyPeriod && !isPremium && isHealthZoneJourneyEligible(childAgeMonths) ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {t("parent_hub.web_tiles.nutrition.journey_access")}
          </p>
        ) : null}
        <p className="text-xs text-foreground/90">{t("parent_hub.web_tiles.nutrition.free_access")}</p>
        <p className="text-xs text-foreground/90 flex items-start gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
          <span>{t("parent_hub.web_tiles.nutrition.premium_access")}</span>
        </p>
      </div>

      <AppLink href="/nutrition" onClick={onOpenHub}>
        <Button
          type="button"
          className="w-full rounded-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          data-testid="nutrition-hub-open-cta"
        >
          <Salad className="h-4 w-4" />
          {t("parent_hub.web_tiles.nutrition.cta")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </AppLink>

      <p className="text-[10px] text-muted-foreground text-center">
        {t("parent_hub.web_tiles.nutrition.age_hint", {
          months: childAgeMonths,
        })}
      </p>
    </div>
  );
}
