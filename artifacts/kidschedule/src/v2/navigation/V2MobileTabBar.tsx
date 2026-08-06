/**
 * V2 whisper navigation — Today · Help · Child.
 * Sheet Glass · soft-fill active · no underline · no shelf.
 * P0.3 — Constitution §4. Trust-first: every tab navigates.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Home, MessageCircle, Baby } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { shouldUseV2Navigation } from "@/v2/entry/v2-shell-flags";
import { getGuestSession } from "@/v2/guest";
import {
  useReducedMotion,
  v2HapticLight,
  V2_ICON_STROKE,
  V2_NAV,
  V2_TYPE,
} from "@/v2/craft";
import {
  V2_NAV_BAR,
  V2_NAV_ICON,
  v2NavTabClass,
} from "@/v2/craft/nav";
import { isV2TabActive } from "./v2-nav-history";

const V2_TABS = [
  { href: "/today", label: "Today", icon: Home, testId: "v2-nav-today" },
  {
    href: "/ask-amy",
    label: "Help",
    icon: MessageCircle,
    testId: "v2-nav-ask-amy",
  },
  {
    href: "/for-child",
    label: "Child",
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
  const reducedMotion = useReducedMotion();
  const childFirst =
    getGuestSession()?.name?.trim()?.split(/\s+/)[0] || null;

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
      <nav className={`app-footer__nav ${V2_NAV_BAR}`} data-nav-language="whisper">
        <div
          className={`relative flex ${V2_NAV.height} w-full items-center justify-around ${V2_NAV.padX}`}
        >
          {V2_TABS.map((item) => {
            const isActive = isV2TabActive(location, item.href);
            const Icon = item.icon;
            const label =
              item.href === "/for-child" && childFirst
                ? `For ${childFirst}`
                : item.label;

            return (
              <AppLink
                key={item.href}
                href={item.href}
                tabNav
                source="v2-bottom-nav"
                data-testid={item.testId}
                data-active={isActive ? "true" : "false"}
                aria-current={isActive ? "page" : undefined}
                className={v2NavTabClass(isActive)}
                onClick={() => {
                  v2HapticLight(reducedMotion);
                }}
              >
                <Icon
                  className={V2_NAV_ICON}
                  strokeWidth={V2_ICON_STROKE}
                  aria-hidden
                />
                <span
                  className={`max-w-full truncate ${V2_TYPE.caption}`}
                >
                  {label}
                </span>
              </AppLink>
            );
          })}
        </div>
      </nav>
    </footer>,
    document.body,
  );
}
