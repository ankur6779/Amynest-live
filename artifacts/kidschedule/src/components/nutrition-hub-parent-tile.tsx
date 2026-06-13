import { useTranslation } from "react-i18next";
import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Salad, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { HUB_EXPANDED_CONTENT_STACK, HUB_BODY } from "@/lib/parent-hub-premium";
import { isHealthZoneJourneyEligible } from "@/lib/hub-visibility";

type NutritionHubParentContentProps = {
  childAgeMonths: number;
  isFreeJourneyPeriod: boolean;
  isPremium: boolean;
  onOpenHub?: () => void;
};

export function NutritionHubParentContent({
  childAgeMonths,
  isFreeJourneyPeriod,
  isPremium,
  onOpenHub,
}: NutritionHubParentContentProps) {
  const { t } = useTranslation();
  const tags = t("parent_hub.nutrition_tags", { returnObjects: true }) as string[];

  return (
    <div className={HUB_EXPANDED_CONTENT_STACK}>
      <p className={cn(HUB_BODY, "text-xs text-muted-foreground")}>
        {t("parent_hub.web_tiles.nutrition.intro")}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-[10px]">
          {t("parent_hub.web_tiles.nutrition.ages_all")}
        </Badge>
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] border-emerald-500/25">
            {tag}
          </Badge>
        ))}
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
