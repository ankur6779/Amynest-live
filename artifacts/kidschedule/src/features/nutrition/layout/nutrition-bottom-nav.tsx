import { useTranslation } from "react-i18next";
import { CalendarDays, Home, Library, Trophy, Users } from "lucide-react";
import {
  NUTRITION_HUB_CHIP_ACTIVE,
  NUTRITION_HUB_CHIP_INACTIVE,
} from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import type { NutritionTab } from "@/features/nutrition/types/nutrition-hub.types";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

const NAV_ITEMS: {
  id: NutritionTab;
  labelKey: string;
  shortKey: string;
  icon: React.ReactNode;
}[] = [
  { id: "today", labelKey: "nutrition_hub.nav.today", shortKey: "nutrition_hub.nav_short.today", icon: <Home className="h-4 w-4" /> },
  { id: "plan", labelKey: "nutrition_hub.nav.plan", shortKey: "nutrition_hub.nav_short.plan", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "track", labelKey: "nutrition_hub.nav.track", shortKey: "nutrition_hub.nav_short.track", icon: <Trophy className="h-4 w-4" /> },
  { id: "learn", labelKey: "nutrition_hub.nav.learn", shortKey: "nutrition_hub.nav_short.learn", icon: <Library className="h-4 w-4" /> },
  { id: "family", labelKey: "nutrition_hub.nav.family", shortKey: "nutrition_hub.nav_short.family", icon: <Users className="h-4 w-4" /> },
];

export function NutritionBottomNav() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useNutritionContext();

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-white/[0.08] bg-[#0b1730]/95 backdrop-blur-md px-1 py-2 sm:px-2"
      aria-label={t("nutrition_hub.title")}
    >
      <div className="grid grid-cols-5 gap-1 w-full max-w-4xl mx-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={cn(
              activeTab === item.id ? NUTRITION_HUB_CHIP_ACTIVE : NUTRITION_HUB_CHIP_INACTIVE,
              "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2",
              "text-[10px] font-bold leading-tight text-center sm:text-xs",
            )}
            aria-current={activeTab === item.id ? "page" : undefined}
          >
            <span className="[&_svg]:h-3.5 [&_svg]:w-3.5 sm:[&_svg]:h-4 sm:[&_svg]:w-4 shrink-0">{item.icon}</span>
            <span className="w-full truncate px-0.5 hidden sm:inline">{t(item.labelKey)}</span>
            <span className="w-full truncate px-0.5 sm:hidden">{t(item.shortKey)}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export function NutritionTopNav() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useNutritionContext();

  return (
    <div className="hidden sm:flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sticky top-0 z-20 py-2 backdrop-blur-md bg-[#0b1730]/85">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setActiveTab(item.id)}
          className={cn(
            activeTab === item.id ? NUTRITION_HUB_CHIP_ACTIVE : NUTRITION_HUB_CHIP_INACTIVE,
            "flex shrink-0 items-center gap-1.5 text-sm",
          )}
        >
          {item.icon}
          <span>{t(item.labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
