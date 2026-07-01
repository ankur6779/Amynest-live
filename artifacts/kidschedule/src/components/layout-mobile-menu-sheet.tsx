import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMountedRef } from "@/hooks/use-safe-async";
import { useLocation } from "wouter";
import { X, Sparkles } from "lucide-react";
import { useClerk, useUser, useAuth } from "@/lib/firebase-auth-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { PremiumNavItem, navTourId, useNavItemDescription } from "@/components/premium-nav-item";
import { NAV_PREMIUM_HEADER, splitNavItems } from "@/lib/nav-premium-config";
import { cn } from "@/lib/utils";

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

function MobileNavRow({
  item,
  location,
  onNavigate,
}: {
  item: MobileNavItem;
  location: string;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const description = useNavItemDescription(item.href);
  const isActive = safePathStartsWith(location, item.href);

  return (
    <div onPointerDown={() => prefetchRouteChunk(item.href)}>
      <PremiumNavItem
        href={item.href}
        label={t(item.labelKey)}
        description={description}
        badge={item.badge}
        isActive={isActive}
        tourId={navTourId(item.href)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

function PremiumMenuItems({
  items,
  location,
  onNavigate,
}: {
  items: MobileNavItem[];
  location: string;
  onNavigate: () => void;
}) {
  return (
    <>
      {items.map((item) => (
        <MobileNavRow key={item.href} item={item} location={location} onNavigate={onNavigate} />
      ))}
    </>
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

  const safeChildren = childList ?? [];
  const safeMenu = resolveSafeMenu(navItems ?? DEFAULT_MOBILE_MENU);
  const { primary, account } = splitNavItems(safeMenu);

  const displayName = getUserDisplayName(user);
  const email = getUserEmail(user);
  const initials = getUserInitials(user);
  const avatarUrl = getUserAvatarUrl(user);

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
      <div className="drawer-overlay md:hidden" role="dialog" aria-modal="true">
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
      <div className="drawer-overlay md:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-[var(--overlay-bg)]"
          onClick={closeSidebar}
        />
        <aside className="drawer flex flex-col bg-gradient-to-b from-[#0f1228] via-[#12152f] to-[#0c0e22] text-white shadow-2xl">
          <div className="relative shrink-0 border-b border-white/[0.06] px-4 pb-3 pt-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-quicksand text-lg font-black tracking-tight text-white">AmyNest AI</p>
                  <p className="text-[11px] text-white/55">
                    {t("nav.premium_tagline", "AI for Smart Parenting")}
                  </p>
                </div>
                <img
                  src={NAV_PREMIUM_HEADER.heroSrc}
                  alt=""
                  aria-hidden
                  className="h-12 w-12 shrink-0 object-contain"
                  loading="lazy"
                />
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeSidebar}
                className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3">
            <PremiumMenuItems items={primary} location={location} onNavigate={closeSidebar} />

            <div className="my-2 border-t border-white/[0.06]" />

            <div className="mb-2 flex items-center gap-2.5 rounded-[18px] border border-white/[0.08] bg-white/[0.04] p-2.5">
              <Avatar className="h-9 w-9 border border-white/20">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold text-white">
                  {t("nav.greeting", { name: displayName, defaultValue: "Hi, {{name}}!" })}
                </p>
                {isPremium ? <SmartParentBadge className="mt-1" /> : <FreeUserBadge className="mt-1" />}
                {email ? (
                  <p className="mt-0.5 truncate text-[10px] text-white/45">{email}</p>
                ) : null}
              </div>
            </div>

            <PremiumMenuItems items={account} location={location} onNavigate={closeSidebar} />
          </nav>

          <div className="mobile-menu-sheet-footer shrink-0 border-t border-white/[0.06] px-3 py-3">
            <PremiumNavItem
              href="#sign-out"
              label={t("nav.sign_out")}
              description={t("nav.descriptions.sign_out", "Log out of your account")}
              variant="sign-out"
              testId="button-sign-out-mobile"
              onNavigate={handleSignOut}
            />
            <img
              src={NAV_PREMIUM_HEADER.profileHeroSrc}
              alt=""
              aria-hidden
              className="mx-auto mt-2 h-[72px] w-full max-w-[200px] object-contain object-bottom opacity-90"
              loading="lazy"
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
