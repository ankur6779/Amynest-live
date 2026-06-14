import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  HUB_AGE_BADGE,
  HUB_BODY,
  NUTRITION_HUB_ACCENT,
  hubAccentBarClasses,
  hubSectionCardClasses,
} from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { NutritionHeroParticles } from "@/features/nutrition/components/shared/nutrition-hero-particles";

export function NutritionHero() {
  const { t } = useTranslation();
  const { regionConfig } = useNutritionContext();
  const [heroExpanded, setHeroExpanded] = useState(false);

  return (
    <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "hub-page-enter overflow-hidden")}>
      <div className="flex">
        <div className={hubAccentBarClasses(NUTRITION_HUB_ACCENT)} />
        <div className="relative flex-1 min-w-0 px-3 py-3 sm:px-4 sm:py-6">
          {/* Depth layers */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-amber-500/[0.03]"
            aria-hidden
          />
          <NutritionHeroParticles />

          <div className="relative z-[1]">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  NUTRITION_HUB_ACCENT.emojiShell,
                  "w-10 h-10 sm:w-12 sm:h-12 text-xl sm:text-2xl nutrition-hero-icon-float",
                )}
              >
                🥗
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-quicksand text-lg sm:text-[22px] font-bold tracking-tight text-foreground">
                    {t("nutrition_hub.title")}
                  </h1>
                  <span className={HUB_AGE_BADGE}>{regionConfig.guidelineBadge}</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{t("nutrition_hub.subtitle")}</p>
              </div>
            </div>
            <p
              className={cn(
                HUB_BODY,
                "mt-2 max-w-xl text-foreground/80 opacity-100",
                heroExpanded ? "block" : "hidden sm:block",
              )}
            >
              {t("nutrition_hub.description")}
            </p>
            <button
              type="button"
              onClick={() => setHeroExpanded((v) => !v)}
              className="mt-1.5 flex items-center gap-1 text-xs text-emerald-200/80 hover:underline sm:hidden"
            >
              {heroExpanded ? t("nutrition_hub.hero.show_less") : t("nutrition_hub.hero.learn_more")}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", heroExpanded && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgeInfoCard() {
  const { t } = useTranslation();
  const { activeAgeGroup } = useNutritionContext();
  const [ageInfoExpanded, setAgeInfoExpanded] = useState(false);

  return (
    <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "hub-page-enter overflow-hidden")}>
      <div className="flex">
        <div className={hubAccentBarClasses(NUTRITION_HUB_ACCENT)} />
        <div className="flex flex-1 min-w-0 items-center sm:items-start gap-2 sm:gap-3 p-2.5 sm:p-4">
          <span className="text-2xl sm:text-4xl shrink-0">{activeAgeGroup.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center sm:items-start justify-between gap-2">
              <h2 className="font-quicksand font-bold text-sm sm:text-xl text-foreground truncate">
                {activeAgeGroup.label}
              </h2>
              <button
                type="button"
                onClick={() => setAgeInfoExpanded((v) => !v)}
                className="sm:hidden shrink-0 flex items-center gap-0.5 text-xs text-emerald-200/80 hover:underline"
              >
                {ageInfoExpanded ? t("nutrition_hub.age_info.show_less") : t("nutrition_hub.age_info.show_more")}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", ageInfoExpanded && "rotate-180")} />
              </button>
            </div>
            <p
              className={cn(
                HUB_BODY,
                "mt-1 sm:mt-2 opacity-100 sm:line-clamp-none",
                ageInfoExpanded ? "block" : "hidden sm:block",
              )}
            >
              {activeAgeGroup.description}
            </p>
            <div className={cn("flex flex-wrap gap-1.5 mt-2", ageInfoExpanded ? "flex" : "hidden sm:flex")}>
              {activeAgeGroup.keyFocus.map((f, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs border-white/15 bg-white/[0.06] text-foreground/90"
                >
                  {f}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
