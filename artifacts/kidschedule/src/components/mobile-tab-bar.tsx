import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Brain, BookOpen, Calendar, Home } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { safePathStartsWithSegment } from "@/lib/safe-route";

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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !visible) return null;

  return createPortal(
    <footer
      className="app-footer tabbar bottom-nav md:hidden"
      data-testid="mobile-tab-bar"
      aria-hidden={false}
    >
      <nav
        className="app-footer__nav w-full border-t border-border bg-card/95 shadow-[0_-8px_28px_var(--shadow-color)] backdrop-blur-xl"
        aria-label={t("nav.dashboard")}
      >
        <div className="relative flex h-full w-full items-center justify-around px-2">
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
                  className="relative flex flex-col items-center justify-center"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground transition-transform active:scale-90 ${isActive ? "bg-gradient-to-br from-primary to-primary shadow-lg ring-2 ring-primary/20" : "bg-gradient-to-br from-primary to-primary shadow-md"}`}
                  >
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                    {t(item.labelKey)}
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
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "fill-primary" : ""}`} />
                <span className="text-[11px] font-medium leading-none">
                  {t(item.labelKey)}
                </span>
                {isActive ? (
                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-muted" />
                ) : null}
              </AppLink>
            );
          })}
        </div>
      </nav>
    </footer>,
    document.body,
  );
}
