import { ChevronRight, GraduationCap, LogOut, Settings2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppLink } from "@/components/app-link";
import { DrawerNavItem, type DrawerTone } from "@/components/drawer-nav-item";
import { navTourId, useNavItemDescription } from "@/components/premium-nav-item";
import {
  DEFAULT_MOBILE_MENU,
  resolveSafeMenu,
  type MobileNavItem,
} from "@/lib/mobile-menu-config";
import {
  NAV_PREMIUM_HEADER,
  groupDrawerItems,
} from "@/lib/nav-premium-config";
import { prefetchRouteChunk } from "@/lib/route-chunk-preload";
import { safePathStartsWith } from "@/lib/safe-route";
import { useMobileMenuData } from "@/hooks/use-mobile-menu-data";
import { cn } from "@/lib/utils";

/** Learning Zone links to the existing study route (no new route added). */
const LEARNING_ZONE_ITEM: MobileNavItem = {
  href: "/study",
  labelKey: "nav.learning_zone",
  icon: GraduationCap,
};

type PremiumDesktopSidebarProps = {
  displayName: string;
  email?: string | null;
  initials: string;
  avatarUrl?: string | null;
  isPremium: boolean;
  onSignOut: () => void;
};

function FreeUserBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/65",
        className,
      )}
      data-testid="badge-free-user"
    >
      {t("components.layout.free_user")}
    </span>
  );
}

function SmartParentBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-gradient-to-r from-amber-500/30 to-yellow-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100",
        className,
      )}
      data-testid="badge-smart-parent"
    >
      <Sparkles className="h-2.5 w-2.5" />
      {t("components.layout.smart_parent")}
    </span>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
      {children}
    </p>
  );
}

function ProfileCard({
  displayName,
  email,
  initials,
  avatarUrl,
  isPremium,
  childName,
  extraChildren,
}: {
  displayName: string;
  email?: string | null;
  initials: string;
  avatarUrl?: string | null;
  isPremium: boolean;
  childName?: string;
  extraChildren: number;
}) {
  const { t } = useTranslation();
  const secondary = childName
    ? `${childName}${extraChildren > 0 ? ` +${extraChildren}` : ""}`
    : email ?? undefined;

  return (
    <AppLink
      href="/parent-profile"
      source="desktop-sidebar-profile"
      className="relative block overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.05] p-3.5 backdrop-blur-xl"
      data-testid="desktop-sidebar-profile-card"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 12% 20%, rgba(168,85,247,0.28), transparent 60%), radial-gradient(ellipse 60% 80% at 95% 90%, rgba(56,189,248,0.18), transparent 60%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/10"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)" }}
      />
      <div className="relative flex items-center gap-3">
        <div className="relative shrink-0">
          <span aria-hidden className="absolute -inset-1 rounded-full bg-purple-500/35 blur-md" />
          <Avatar className="relative h-14 w-14 border border-white/25">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-base font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-quicksand text-[16px] font-bold leading-tight text-white">
            {t("nav.greeting", { name: displayName, defaultValue: "Hi, {{name}}!" })}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            {isPremium ? <SmartParentBadge /> : <FreeUserBadge />}
          </div>
          {secondary ? (
            <p className="mt-1 truncate text-[12px] text-white/50">
              {childName ? (
                <span className="text-white/60">
                  {t("nav.current_child", { defaultValue: "Child" })}:{" "}
                  <span className="font-semibold text-white/80">{secondary}</span>
                </span>
              ) : (
                secondary
              )}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/60"
          >
            <Settings2 className="h-4 w-4" />
          </span>
          <ChevronRight className="h-4 w-4 text-white/35" aria-hidden />
        </div>
      </div>
    </AppLink>
  );
}

function DrawerRow({
  item,
  tone,
  location,
}: {
  item: MobileNavItem;
  tone: DrawerTone;
  location: string;
}) {
  const { t } = useTranslation();
  const premiumDescription = useNavItemDescription(item.href);
  const description =
    premiumDescription ??
    (item.href === "/study"
      ? t("nav.descriptions.learning_zone", "Skills, subjects & practice")
      : undefined);
  const isActive = safePathStartsWith(location, item.href);

  return (
    <div onPointerDown={() => prefetchRouteChunk(item.href)}>
      <DrawerNavItem
        href={item.href}
        label={t(item.labelKey)}
        description={description}
        badge={item.badge}
        icon={item.icon}
        tone={tone}
        isActive={isActive}
        animate={false}
        tourId={navTourId(item.href)}
      />
    </div>
  );
}

/** Premium glass desktop sidebar — matches mobile drawer tile navigation. */
export function PremiumDesktopSidebar({
  displayName,
  email,
  initials,
  avatarUrl,
  isPremium,
  onSignOut,
}: PremiumDesktopSidebarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { safeMenu, safeChildren } = useMobileMenuData();

  const safeChildList = (safeChildren ?? []) as Array<{ name?: string | null }>;
  const resolvedMenu = resolveSafeMenu(safeMenu ?? DEFAULT_MOBILE_MENU);
  const drawerItems = resolvedMenu.some((item) => item.href === "/study")
    ? resolvedMenu
    : [...resolvedMenu, LEARNING_ZONE_ITEM];
  const groups = groupDrawerItems(drawerItems);

  const firstChildName = safeChildList.find((c) => c?.name)?.name ?? undefined;
  const extraChildren = safeChildList.length > 1 ? safeChildList.length - 1 : 0;

  const toneById: Record<string, DrawerTone> = {
    primary: "primary",
    learning: "learning",
    insights: "insights",
    account: "account",
  };

  return (
    <aside
      className={cn(
        "hidden w-[min(360px,28vw)] min-w-[300px] shrink-0 flex-col border-r border-white/[0.06] lg:flex",
        "bg-gradient-to-b from-[#0f1228] via-[#12152f] to-[#0c0e22]",
      )}
    >
      {/* Brand header */}
      <div className="relative shrink-0 overflow-hidden border-b border-white/[0.06] px-4 pb-4 pt-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 18% 30%, rgba(168,85,247,0.22), transparent 60%), radial-gradient(ellipse 60% 90% at 92% 10%, rgba(244,114,182,0.16), transparent 55%)",
          }}
        />
        <div className="relative flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-quicksand text-xl font-black tracking-tight text-white">AmyNest AI</p>
            <p className="mt-0.5 text-[11px] text-white/55">
              {t("nav.premium_tagline", "AI for Smart Parenting")}
            </p>
          </div>
          <div className="relative shrink-0 flex h-16 w-16 items-center justify-center">
            <span aria-hidden className="absolute inset-0 rounded-full bg-violet-500/30 blur-xl" />
            <img
              src={NAV_PREMIUM_HEADER.heroSrc}
              alt=""
              aria-hidden
              className="relative h-[60px] w-[60px] object-contain object-center drop-shadow-[0_6px_18px_rgba(168,85,247,0.45)]"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Scroll area: profile card + grouped tile navigation */}
      <div className="flex flex-1 flex-col overflow-y-auto px-3 pb-3 pt-3 scrollbar-thin">
        <ProfileCard
          displayName={displayName}
          email={email}
          initials={initials}
          avatarUrl={avatarUrl}
          isPremium={isPremium}
          childName={firstChildName ?? undefined}
          extraChildren={extraChildren}
        />

        {groups.map(({ group, items }) => (
          <section key={group.id} className="mt-6 first:mt-6">
            <GroupHeading>{t(group.labelKey, group.defaultLabel)}</GroupHeading>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <DrawerRow
                  key={item.href}
                  item={item}
                  tone={toneById[group.id] ?? "primary"}
                  location={location}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer: sign out */}
      <div className="shrink-0 border-t border-white/[0.06] px-3 pb-3 pt-3">
        <DrawerNavItem
          href="#sign-out"
          label={t("nav.sign_out")}
          description={t("nav.descriptions.sign_out", "Log out of your account")}
          icon={LogOut}
          tone="account"
          variant="sign-out"
          animate={false}
          testId="button-sign-out"
          onNavigate={onSignOut}
        />

        <img
          src={NAV_PREMIUM_HEADER.profileHeroSrc}
          alt=""
          aria-hidden
          className="relative mx-auto mt-3 h-[72px] w-full max-w-[220px] object-contain object-bottom opacity-95"
          loading="lazy"
        />

        <p className="relative mt-2 text-center text-[8px] font-bold uppercase tracking-widest text-white/20">
          {t("patent_pending.footer_label")}
        </p>
      </div>
    </aside>
  );
}
