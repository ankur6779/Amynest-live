import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMountedRef } from "@/hooks/use-safe-async";
import { useLocation } from "wouter";
import { GraduationCap, MoonStar } from "lucide-react";
import { useClerk, useUser, useAuth } from "@/lib/firebase-auth-hooks";
import { useTranslation } from "react-i18next";
import { logNavEvent, logNavError } from "@/lib/navigation-log";
import {
  DEFAULT_MOBILE_MENU,
  resolveSafeMenu,
  type MobileNavItem,
} from "@/lib/mobile-menu-config";
import {
  getUserAvatarUrl,
  getUserDisplayName,
  getUserEmail,
  getUserInitials,
} from "@/lib/safe-user-display";
import { isBirthSkyEnabled } from "@/features/birth-sky/lib/feature-flags";
import { buildLivingNavSections } from "@/lib/nav-living-ia";
import {
  HomeNavFamilyRow,
  HomeNavHeader,
  HomeNavSections,
  HomeNavSignOut,
  homeNavShellClass,
} from "@/components/nav/amynest-home-nav";

/** Learning Zone links to the existing study route (no new route added). */
const LEARNING_ZONE_ITEM: MobileNavItem = {
  href: "/study",
  labelKey: "nav.learning_zone",
  icon: GraduationCap,
};

/** Hero product — surfaced in the burger drawer when Amy Astro is enabled. */
const AMY_ASTRO_ITEM: MobileNavItem = {
  href: "/birth-sky",
  labelKey: "nav.amy_astro_intelligence",
  icon: MoonStar,
};

export function LayoutMobileMenuSheet({
  isMenuOpen,
  onOpenChange,
  navItems,
  childList = [],
}: {
  isMenuOpen: boolean;
  onOpenChange: (open: boolean) => void;
  navItems?: MobileNavItem[];
  childList?: unknown[];
}) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoaded, userId } = useAuth();
  const { t } = useTranslation();
  const isMounted = useMountedRef();
  const signOutBusyRef = useRef(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const safeChildren = (childList ?? []) as Array<{ name?: string | null }>;
  const safeMenu = resolveSafeMenu(navItems ?? DEFAULT_MOBILE_MENU);
  let drawerItems = safeMenu.some((item) => item.href === "/study")
    ? safeMenu
    : [...safeMenu, LEARNING_ZONE_ITEM];
  const displayName = getUserDisplayName(user);
  const email = getUserEmail(user);
  const amyAstroEnabled = isBirthSkyEnabled(email);
  if (amyAstroEnabled && !drawerItems.some((item) => item.href === "/birth-sky")) {
    const dashIdx = drawerItems.findIndex((item) => item.href === "/dashboard");
    drawerItems =
      dashIdx >= 0
        ? [
            ...drawerItems.slice(0, dashIdx + 1),
            AMY_ASTRO_ITEM,
            ...drawerItems.slice(dashIdx + 1),
          ]
        : [AMY_ASTRO_ITEM, ...drawerItems];
  } else if (!amyAstroEnabled) {
    drawerItems = drawerItems.filter((item) => item.href !== "/birth-sky");
  }
  const livingSections = buildLivingNavSections(drawerItems);
  const initials = getUserInitials(user);
  const avatarUrl = getUserAvatarUrl(user);

  const firstChildName = safeChildren.find((c) => c?.name)?.name ?? undefined;
  const extraChildren = safeChildren.length > 1 ? safeChildren.length - 1 : 0;

  const closeSidebar = useCallback(() => {
    try {
      onOpenChange(false);
    } catch (err) {
      logNavError("menu-close", err);
    }
  }, [onOpenChange]);

  const handleSignOut = useCallback(() => {
    if (signOutBusyRef.current) return;
    signOutBusyRef.current = true;
    closeSidebar();
    try {
      void signOut({ redirectUrl: "/" });
    } catch (err) {
      logNavError("sign-out", err);
    } finally {
      if (isMounted.current) signOutBusyRef.current = false;
    }
  }, [closeSidebar, signOut, isMounted]);

  useEffect(() => {
    if (isMenuOpen) {
      logNavEvent("menu-mounted", {
        location,
        userId: userId ?? null,
        isLoaded,
        hasUser: !!user,
        childCount: safeChildren.length,
      });
    }
  }, [isMenuOpen, location, userId, isLoaded, user, safeChildren.length]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSidebar();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeSidebar, isMenuOpen]);

  if (!isMenuOpen || !portalReady) return null;

  const sheet =
    !userLoaded || !user ? (
      <div className="drawer-overlay lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
        <button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-[var(--overlay-bg)]"
          onClick={closeSidebar}
        />
        <aside className={homeNavShellClass("drawer shadow-2xl")}>
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-[rgba(184,169,154,0.88)]">
            {t("common.loading", { defaultValue: "Loading menu..." })}
          </div>
        </aside>
      </div>
    ) : (
      <div className="drawer-overlay lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
        <button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-[var(--overlay-bg)] animate-in fade-in duration-200"
          onClick={closeSidebar}
        />
        <aside
          className={homeNavShellClass("drawer shadow-2xl animate-in slide-in-from-left-4 fade-in duration-300 ease-out")}
          data-testid="amynest-home-nav"
        >
          <HomeNavHeader onClose={closeSidebar} />
          <HomeNavFamilyRow
            displayName={displayName}
            childName={firstChildName ?? undefined}
            extraChildren={extraChildren}
            initials={initials}
            avatarUrl={avatarUrl}
            onNavigate={closeSidebar}
          />
          <HomeNavSections
            sections={livingSections}
            location={location}
            onNavigate={closeSidebar}
          />
          <HomeNavSignOut onSignOut={handleSignOut} testId="button-sign-out-mobile" />
        </aside>
      </div>
    );

  return createPortal(sheet, document.body);
}
