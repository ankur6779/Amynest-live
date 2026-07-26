import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMountedRef } from "@/hooks/use-safe-async";
import { useLocation } from "wouter";
import {
  ChevronRight,
  GraduationCap,
  LogOut,
  MoonStar,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useClerk, useUser, useAuth } from "@/lib/firebase-auth-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppLink } from "@/components/app-link";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { logNavEvent, logNavError } from "@/lib/navigation-log";
import { safePathStartsWith } from "@/lib/safe-route";
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
import { prefetchRouteChunk } from "@/lib/route-chunk-preload";
import { useNavItemDescription } from "@/components/premium-nav-item";
import { DrawerNavItem, type DrawerTone } from "@/components/drawer-nav-item";
import { NAV_PREMIUM_HEADER, groupDrawerItems } from "@/lib/nav-premium-config";
import { cn } from "@/lib/utils";

/** Learning Zone links to the existing study route (no new route added). */
const LEARNING_ZONE_ITEM: MobileNavItem = {
  href: "/study",
  labelKey: "nav.learning_zone",
  icon: GraduationCap,
};

/** Hero product — always surfaced in the burger drawer. */
const AMY_ASTRO_ITEM: MobileNavItem = {
  href: "/birth-sky",
  labelKey: "nav.amy_astro_intelligence",
  icon: MoonStar,
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

function DrawerRow({
  item,
  tone,
  index,
  location,
  onNavigate,
}: {
  item: MobileNavItem;
  tone: DrawerTone;
  index: number;
  location: string;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const premiumDescription = useNavItemDescription(item.href);
  const description =
    premiumDescription ??
    (item.href === "/study"
      ? t("nav.descriptions.learning_zone", "Skills, subjects & practice")
      : item.href === "/birth-sky"
        ? t(
            "nav.descriptions.amy_astro_intelligence",
            "Cosmic Portrait · Birth Sky · Amy",
          )
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
        index={index}
        onNavigate={onNavigate}
      />
    </div>
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
  onNavigate,
}: {
  displayName: string;
  email?: string | null;
  initials: string;
  avatarUrl?: string | null;
  isPremium: boolean;
  childName?: string;
  extraChildren: number;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const secondary = childName
    ? `${childName}${extraChildren > 0 ? ` +${extraChildren}` : ""}`
    : email ?? undefined;

  return (
    <AppLink
      href="/parent-profile"
      source="drawer-profile"
      onClick={onNavigate}
      className="relative block overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.05] p-3.5 backdrop-blur-xl"
      data-testid="drawer-profile-card"
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

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
      {children}
    </p>
  );
}

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
  const { isPremium = false } = useSubscription();
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
  if (!drawerItems.some((item) => item.href === "/birth-sky")) {
    const dashIdx = drawerItems.findIndex((item) => item.href === "/dashboard");
    drawerItems =
      dashIdx >= 0
        ? [
            ...drawerItems.slice(0, dashIdx + 1),
            AMY_ASTRO_ITEM,
            ...drawerItems.slice(dashIdx + 1),
          ]
        : [AMY_ASTRO_ITEM, ...drawerItems];
  }
  const groups = groupDrawerItems(drawerItems);

  const displayName = getUserDisplayName(user);
  const email = getUserEmail(user);
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

  const toneById: Record<string, DrawerTone> = {
    primary: "primary",
    learning: "learning",
    insights: "insights",
    account: "account",
  };

  let rowIndex = 0;

  const sheet =
    !userLoaded || !user ? (
      <div className="drawer-overlay lg:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-[var(--overlay-bg)]"
          onClick={closeSidebar}
        />
        <aside className="drawer flex flex-col bg-gradient-to-b from-[#0f1228] to-[#0c0e22] text-white shadow-2xl">
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-white/60">
            Loading menu...
          </div>
        </aside>
      </div>
    ) : (
      <div className="drawer-overlay lg:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-[var(--overlay-bg)] animate-in fade-in duration-200"
          onClick={closeSidebar}
        />
        <aside className="drawer flex flex-col overflow-hidden bg-gradient-to-b from-[#0f1228] via-[#12152f] to-[#0b0d20] text-white shadow-2xl animate-in slide-in-from-left-4 fade-in duration-300 ease-out">
          {/* ── Brand header ─────────────────────────────────────────────── */}
          <div className="relative shrink-0 overflow-hidden border-b border-white/[0.06] px-4 pb-4 pt-4">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                background:
                  "radial-gradient(ellipse 70% 80% at 18% 30%, rgba(168,85,247,0.22), transparent 60%), radial-gradient(ellipse 60% 90% at 92% 10%, rgba(244,114,182,0.16), transparent 55%)",
              }}
            />
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-quicksand text-xl font-black tracking-tight text-white">
                  AmyNest AI
                </p>
                <p className="mt-0.5 text-[11px] text-white/55">
                  {t("nav.premium_tagline", "AI for Smart Parenting")}
                </p>
              </div>
              <div className="relative shrink-0 flex h-16 w-16 items-center justify-center">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-violet-500/30 blur-xl"
                />
                <img
                  src={NAV_PREMIUM_HEADER.heroSrc}
                  alt=""
                  aria-hidden
                  className="relative h-[60px] w-[60px] object-contain object-center drop-shadow-[0_6px_18px_rgba(168,85,247,0.45)]"
                  loading="lazy"
                />
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeSidebar}
                className="relative -mr-1 shrink-0 self-start rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ── Scroll area: profile card + grouped navigation ───────────── */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 pt-3 scrollbar-thin">
            <ProfileCard
              displayName={displayName}
              email={email}
              initials={initials}
              avatarUrl={avatarUrl}
              isPremium={isPremium}
              childName={firstChildName ?? undefined}
              extraChildren={extraChildren}
              onNavigate={closeSidebar}
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
                      index={rowIndex++}
                      location={location}
                      onNavigate={closeSidebar}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* ── Footer: sign out ─────────────────────────────────────────── */}
          <div className="mobile-menu-sheet-footer shrink-0 border-t border-white/[0.06] px-3 pb-2 pt-3">
            <DrawerNavItem
              href="#sign-out"
              label={t("nav.sign_out")}
              description={t("nav.descriptions.sign_out", "Log out of your account")}
              icon={LogOut}
              tone="account"
              variant="sign-out"
              testId="button-sign-out-mobile"
              onNavigate={handleSignOut}
            />
            <p className="mt-2 text-center text-[8px] font-bold uppercase tracking-widest text-white/20">
              {t("patent_pending.footer_label")}
            </p>
          </div>
        </aside>
      </div>
    );

  return createPortal(sheet, document.body);
}
