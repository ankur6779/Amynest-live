import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Home, Library, Trophy, Users } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TRANSITION } from "@/lib/experience-system";
import type { NutritionTab } from "@/features/nutrition/types/nutrition-hub.types";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

export const NUTRITION_NAV_ITEMS: {
  id: NutritionTab;
  labelKey: string;
  shortKey: string;
  icon: React.ReactNode;
}[] = [
  { id: "today", labelKey: "nutrition_hub.nav.today", shortKey: "nutrition_hub.nav_short.today", icon: <Home className="h-4 w-4" aria-hidden /> },
  { id: "plan", labelKey: "nutrition_hub.nav.plan", shortKey: "nutrition_hub.nav_short.plan", icon: <CalendarDays className="h-4 w-4" aria-hidden /> },
  { id: "track", labelKey: "nutrition_hub.nav.track", shortKey: "nutrition_hub.nav_short.track", icon: <Trophy className="h-4 w-4" aria-hidden /> },
  { id: "learn", labelKey: "nutrition_hub.nav.learn", shortKey: "nutrition_hub.nav_short.learn", icon: <Library className="h-4 w-4" aria-hidden /> },
  { id: "family", labelKey: "nutrition_hub.nav.family", shortKey: "nutrition_hub.nav_short.family", icon: <Users className="h-4 w-4" aria-hidden /> },
];

const TAB_ORDER = NUTRITION_NAV_ITEMS.map((item) => item.id);

export function NutritionTopNav() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useNutritionContext();
  const reducedMotion = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);

  const focusTab = useCallback((tab: NutritionTab) => {
    const button = navRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
    button?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex: number | null = null;
      if (event.key === "ArrowRight") {
        nextIndex = (index + 1) % TAB_ORDER.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (index - 1 + TAB_ORDER.length) % TAB_ORDER.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = TAB_ORDER.length - 1;
      }
      if (nextIndex == null) return;
      event.preventDefault();
      const nextTab = TAB_ORDER[nextIndex]!;
      setActiveTab(nextTab);
      focusTab(nextTab);
    },
    [focusTab, setActiveTab],
  );

  return (
    <nav
      ref={navRef}
      data-testid="nutrition-journey-nav"
      aria-label={t("nutrition_hub.title")}
      className={cn(
        "sticky z-30 -mx-1 px-1 sm:mx-0 sm:px-0",
        "top-[max(env(safe-area-inset-top,0px),0px)]",
        "py-2 sm:py-2.5",
      )}
    >
      <div
        className={cn(
          "rounded-full border border-white/[0.10] bg-[#0b1730]/72",
          "shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl",
          "px-1.5 py-1.5 sm:px-2",
        )}
      >
        <LayoutGroup id="nutrition-journey-nav">
          <div
            role="tablist"
            aria-orientation="horizontal"
            data-testid="nutrition-journey-nav-scroll"
            className="flex gap-1 overflow-x-auto scroll-smooth no-scrollbar"
          >
            {NUTRITION_NAV_ITEMS.map((item, index) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  data-tab={item.id}
                  data-testid={`nutrition-nav-${item.id}`}
                  id={`nutrition-tab-${item.id}`}
                  aria-controls={`nutrition-panel-${item.id}`}
                  aria-selected={isActive}
                  aria-current={isActive ? "page" : undefined}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(item.id)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  className={cn(
                    "relative flex min-h-11 min-w-[4.5rem] shrink-0 items-center justify-center gap-1.5",
                    "rounded-full px-3.5 py-2 text-xs font-semibold sm:min-w-[5.5rem] sm:px-4 sm:text-sm",
                    "transition-[opacity,transform,box-shadow] duration-200 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1730]",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground/75 opacity-80 hover:opacity-100 hover:text-foreground/90 hover:shadow-[0_2px_12px_rgba(0,0,0,0.18)]",
                  )}
                >
                  {isActive && !reducedMotion ? (
                    <motion.span
                      layoutId="nutrition-journey-indicator"
                      data-testid="nutrition-journey-active-indicator"
                      className={cn(
                        "absolute inset-0 rounded-full border border-emerald-400/35",
                        "bg-gradient-to-b from-emerald-400/18 via-green-400/12 to-teal-500/10",
                        "shadow-[0_0_18px_rgba(52,211,153,0.22)]",
                      )}
                      transition={TRANSITION.springGentle}
                    />
                  ) : isActive ? (
                    <span
                      data-testid="nutrition-journey-active-indicator"
                      className={cn(
                        "absolute inset-0 rounded-full border border-emerald-400/35",
                        "bg-gradient-to-b from-emerald-400/18 via-green-400/12 to-teal-500/10",
                        "shadow-[0_0_18px_rgba(52,211,153,0.22)]",
                      )}
                    />
                  ) : null}
                  <span className="relative z-[1] flex items-center gap-1.5">
                    {item.icon}
                    <span className="hidden sm:inline">{t(item.labelKey)}</span>
                    <span className="sm:hidden">{t(item.shortKey)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </nav>
  );
}
