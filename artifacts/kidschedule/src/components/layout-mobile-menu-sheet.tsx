import { useCallback, useEffect, useRef } from "react";
import { useMountedRef } from "@/hooks/use-safe-async";
import { Link, useLocation } from "wouter";
import {
  X,
  LogOut,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useClerk, useUser, useAuth } from "@/lib/firebase-auth-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { logNavEvent, logNavError } from "@/lib/navigation-log";
import { safePathStartsWith } from "@/lib/safe-route";
import { runSafeNavAction, safeHref } from "@/lib/safe-navigation";
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

function SmartParentBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${className}`}
      data-testid="badge-smart-parent"
    >
      <Sparkles className="h-2.5 w-2.5" />
      {t("components.layout.smart_parent")}
    </span>
  );
}

function MenuItems({
  items,
  location,
  onNavigate,
}: {
  items: MobileNavItem[];
  location: string;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const safeItems = resolveSafeMenu(items);

  return (
    <>
      {safeItems.map((item) => {
        const isActive = safePathStartsWith(location, item.href);
        const Icon: LucideIcon = item.icon;
        return (
          <Link
            key={item.href}
            href={safeHref(item.href)}
            onPointerDown={() => prefetchRouteChunk(item.href)}
            onClick={() => {
              runSafeNavAction(item.href, () => {
                logNavEvent("nav-route", { href: item.href, from: location });
                onNavigate();
              });
            }}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isActive ? "bg-primary text-primary-foreground font-medium" : "text-foreground/70 hover:bg-muted hover:text-foreground"}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1 truncate">{t(item.labelKey)}</span>
            {item.badge ? (
              <span className="shrink-0 inline-flex items-center rounded-full bg-gradient-to-r from-primary to-primary px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
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

  const safeChildren = childList ?? [];
  const safeMenu = resolveSafeMenu(navItems ?? DEFAULT_MOBILE_MENU);

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
      });
    }
  }, [isMenuOpen, location, userId, isLoaded, user]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSidebar();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeSidebar, isMenuOpen]);

  if (!isMenuOpen) return null;

  if (!userLoaded || !user) {
    return (
      <div className="fixed inset-0 z-[1100] md:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-[var(--overlay-bg)]"
          onClick={closeSidebar}
        />
        <aside
          className="absolute bottom-0 right-0 top-0 flex w-[82vw] max-w-[350px] flex-col bg-card text-card-foreground shadow-2xl"
        >
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Loading menu...
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1100] md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-[var(--overlay-bg)]"
        onClick={closeSidebar}
      />
      <aside
        className="absolute bottom-0 right-0 top-0 flex w-[82vw] max-w-[350px] flex-col bg-card text-card-foreground shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate flex items-center gap-1.5">
              <span className="truncate">{displayName}</span>
              {isPremium ? <SmartParentBadge /> : null}
            </span>
            {email ? (
              <span className="text-xs text-muted-foreground truncate">{email}</span>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeSidebar}
            className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1 text-card-foreground">
          <MenuItems items={safeMenu} location={location} onNavigate={closeSidebar} />
        </nav>

        <div className="mobile-menu-sheet-footer shrink-0 border-t px-4 py-3">
          <button
            type="button"
            onClick={handleSignOut}
            data-testid="button-sign-out-mobile"
            className="flex w-full min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {t("nav.sign_out")}
          </button>
          <p className="text-center text-[9px] font-bold tracking-widest uppercase mt-2.5 text-primary/30">
            {t("patent_pending.footer_label")}
          </p>
        </div>
      </aside>
    </div>
  );
}
