import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion, LayoutGroup, useReducedMotion } from "framer-motion";
import { Brain, BookOpen, Calendar, Home } from "lucide-react";
import { AmyFab } from "@/components/amy-fab";
import { AppLink } from "@/components/app-link";
import { safePathStartsWithSegment } from "@/lib/safe-route";
import { PRESS_FEEDBACK, TRANSITION } from "@/lib/experience-system";
import {
  isAmyCoachLivingV1Enabled,
  livingAmyCoachNavLabel,
} from "@/lib/amy-coach/living-room";

const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: Home, center: false },
  { href: "/routines", labelKey: "nav.routines", icon: Calendar, center: false },
  { href: "/amy-coach", labelKey: "nav.amy_coach", icon: Brain, center: true },
  { href: "/parenting-hub", labelKey: "nav.parenting_hub", icon: BookOpen, center: false },
] as const;

type MobileTabBarProps = {
  visible: boolean;
};

/**
 * Dashboard bottom nav — portaled to document.body so Android WebView treats
 * position:fixed relative to the viewport (not the .app-scroll container).
 */
export function MobileTabBar({ visible }: MobileTabBarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !visible) return null;

  return createPortal(
    <footer
      className="app-footer tabbar bottom-nav lg:hidden"
      data-testid="mobile-tab-bar"
      aria-hidden={false}
    >
      <AmyFab embedded />
      <nav
        className="app-footer__nav w-full border-t border-border bg-card/95 shadow-[0_-8px_28px_var(--shadow-color)] backdrop-blur-xl"
        aria-label={t("nav.main", { defaultValue: "Main" })}
      >
        <LayoutGroup id="bottom-tab-bar">
          <div className="relative flex h-[72px] w-full items-end justify-around px-2 pb-2">
            {BOTTOM_NAV_ITEMS.map((item) => {
              const isActive = safePathStartsWithSegment(location, item.href);
              if (item.center) {
                return (
                  <AppLink
                    key={item.href}
                    href={item.href}
                    tabNav
                    source="bottom-nav-center"
                    data-tour="amy-coach"
                    className={`relative flex flex-col items-center justify-end -translate-y-5 ${PRESS_FEEDBACK}`}
                  >
                    <motion.div
                      layout={!reducedMotion}
                      transition={TRANSITION.springGentle}
                      className={`flex h-[60px] w-[60px] items-center justify-center rounded-full text-primary-foreground ${isActive ? "bg-gradient-to-br from-primary to-primary shadow-lg ring-2 ring-primary/20" : "bg-gradient-to-br from-primary to-primary shadow-md"}`}
                    >
                      <item.icon className="h-7 w-7" />
                    </motion.div>
                    <span className="mt-1 text-[10px] font-semibold text-muted-foreground">
                      {item.href === "/amy-coach" && isAmyCoachLivingV1Enabled()
                        ? livingAmyCoachNavLabel()
                        : t(item.labelKey)}
                    </span>
                  </AppLink>
                );
              }
              return (
                <AppLink
                  key={item.href}
                  href={item.href}
                  tabNav
                  source="bottom-nav"
                  data-tour={
                    item.href === "/dashboard"
                      ? "dashboard"
                      : item.href === "/routines"
                        ? "routines"
                        : item.href === "/parenting-hub"
                          ? "parenting-hub"
                          : undefined
                  }
                  className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors duration-150 ${PRESS_FEEDBACK} ${isActive ? "text-primary" : "text-muted-foreground"}`}
                >
                  <item.icon className={`h-5 w-5 transition-transform duration-150 ${isActive ? "fill-primary scale-105" : ""}`} />
                  <span className="text-[11px] font-medium leading-none">
                    {t(item.labelKey)}
                  </span>
                  {isActive && !reducedMotion ? (
                    <motion.span
                      layoutId="tab-active-indicator"
                      className="absolute bottom-1 h-1 w-7 rounded-full bg-primary/90 shadow-[0_0_10px_rgba(251,146,60,0.45)]"
                      transition={TRANSITION.springGentle}
                    />
                  ) : isActive ? (
                    <span className="absolute bottom-1 h-1 w-7 rounded-full bg-primary/90" />
                  ) : null}
                </AppLink>
              );
            })}
          </div>
        </LayoutGroup>
      </nav>
    </footer>,
    document.body,
  );
}
