import { GraduationCap, MoonStar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  DEFAULT_MOBILE_MENU,
  resolveSafeMenu,
  type MobileNavItem,
} from "@/lib/mobile-menu-config";
import { useMobileMenuData } from "@/hooks/use-mobile-menu-data";
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

/** Hero product — surfaced in the desktop sidebar when Amy Astro is enabled. */
const AMY_ASTRO_ITEM: MobileNavItem = {
  href: "/birth-sky",
  labelKey: "nav.amy_astro_intelligence",
  icon: MoonStar,
};

type PremiumDesktopSidebarProps = {
  displayName: string;
  email?: string | null;
  initials: string;
  avatarUrl?: string | null;
  isPremium: boolean;
  onSignOut: () => void;
};

/** Living home sidebar — same house as the mobile drawer, larger spacing. */
export function PremiumDesktopSidebar({
  displayName,
  email,
  initials,
  avatarUrl,
  onSignOut,
}: PremiumDesktopSidebarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { safeMenu, safeChildren } = useMobileMenuData();

  const safeChildList = (safeChildren ?? []) as Array<{ name?: string | null }>;
  const resolvedMenu = resolveSafeMenu(safeMenu ?? DEFAULT_MOBILE_MENU);
  let drawerItems = resolvedMenu.some((item) => item.href === "/study")
    ? resolvedMenu
    : [...resolvedMenu, LEARNING_ZONE_ITEM];
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

  const firstChildName = safeChildList.find((c) => c?.name)?.name ?? undefined;
  const extraChildren = safeChildList.length > 1 ? safeChildList.length - 1 : 0;

  return (
    <aside
      className={homeNavShellClass(
        "hidden w-[min(320px,26vw)] min-w-[280px] shrink-0 border-r border-[rgba(232,212,184,0.16)] lg:flex",
      )}
      aria-label={t("nav.main", { defaultValue: "Main" })}
      data-testid="amynest-home-nav-desktop"
    >
      <HomeNavHeader />
      <HomeNavFamilyRow
        displayName={displayName}
        childName={firstChildName ?? undefined}
        extraChildren={extraChildren}
        initials={initials}
        avatarUrl={avatarUrl}
        testId="desktop-sidebar-profile-card"
      />
      <HomeNavSections sections={livingSections} location={location} />
      <HomeNavSignOut onSignOut={onSignOut} testId="button-sign-out" />
    </aside>
  );
}
