import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HUB_BODY,
  NUTRITION_HUB_ACCENT,
  hubSectionCardClasses,
} from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

export function NutritionGrowthLink() {
  const { t } = useTranslation();

  return (
    <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "overflow-hidden")}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 min-w-0">
        <div className="flex items-center gap-3">
          <div className={cn(NUTRITION_HUB_ACCENT.emojiShell, "w-10 h-10 text-xl")}>📈</div>
          <div>
            <p className="font-semibold text-foreground">{t("nutrition_hub.growth.title")}</p>
            <p className={HUB_BODY}>{t("nutrition_hub.growth.subtitle")}</p>
          </div>
        </div>
        <a href="/progress">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-white/15 bg-white/[0.05] hover:bg-white/[0.08]"
          >
            {t("nutrition_hub.growth.cta")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </a>
      </div>
    </div>
  );
}
