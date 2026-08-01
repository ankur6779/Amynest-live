/**
 * V2 navigation shell (Sprint 2 · S2-T04).
 * Today · Ask Amy · For [Child] — only when `new_navigation` is on.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Home, MessageCircle, Baby } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { safePathStartsWithSegment } from "@/lib/safe-route";
import { shouldUseV2Navigation } from "@/v2/entry/v2-shell-flags";

const V2_TABS = [
  { href: "/today", label: "Today", icon: Home, testId: "v2-nav-today" },
  {
    href: "/ask-amy",
    label: "Ask Amy",
    icon: MessageCircle,
    testId: "v2-nav-ask-amy",
  },
  {
    href: "/for-child",
    label: "For Child",
    icon: Baby,
    testId: "v2-nav-for-child",
  },
] as const;

type V2MobileTabBarProps = {
  visible: boolean;
};

export function V2MobileTabBar({ visible }: V2MobileTabBarProps) {
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !visible || !shouldUseV2Navigation()) return null;

  return createPortal(
    <footer
      className="app-footer tabbar bottom-nav lg:hidden"
      data-testid="v2-mobile-tab-bar"
      aria-label="AmyNest V2 navigation"
    >
      <nav className="app-footer__nav w-full border-t border-border bg-card/95 shadow-[0_-8px_28px_var(--shadow-color)] backdrop-blur-xl">
        <div className="relative flex h-[64px] w-full items-center justify-around px-2">
          {V2_TABS.map((item) => {
            const isActive = safePathStartsWithSegment(location, item.href);
            const Icon = item.icon;
            return (
              <AppLink
                key={item.href}
                href={item.href}
                tabNav
                source="v2-bottom-nav"
                data-testid={item.testId}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "scale-105" : ""}`} />
                <span className="text-[11px] font-medium leading-none">
                  {item.label}
                </span>
                {isActive ? (
                  <span className="absolute bottom-1 h-1 w-7 rounded-full bg-primary/90" />
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
