import { useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LogOut,
  Moon,
  Sun,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useClerk, useUser, useAuth } from "@/lib/firebase-auth-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/contexts/theme-context";
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

function ThemeToggleRow({ onToggle }: { onToggle?: () => void }) {
  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={() => {
        try {
          toggleTheme();
          onToggle?.();
        } catch (err) {
          logNavError("theme-toggle", err);
        }
      }}
      data-testid="button-theme-toggle"
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <span className="flex items-center gap-3">
        {isDark ? (
          <Moon className="h-5 w-5 text-primary" />
        ) : (
          <Sun className="h-5 w-5 text-primary" />
        )}
        <span>{isDark ? t("nav.dark_mode") : t("nav.light_mode")}</span>
      </span>
      <span
        className={`relative h-6 w-11 rounded-full border transition-colors ${isDark ? "bg-primary border-border" : "bg-muted border-border"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full shadow-md transition-transform ${isDark ? "translate-x-5 bg-primary" : "translate-x-0.5 bg-primary"}`}
        />
      </span>
    </button>
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
}: {
  isMenuOpen: boolean;
  onOpenChange: (open: boolean) => void;
  navItems?: MobileNavItem[];
}) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { isLoaded, userId } = useAuth();
  const { t } = useTranslation();
  const { isPremium = false } = useSubscription();

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
    closeSidebar();
    try {
      void signOut({ redirectUrl: "/" });
    } catch (err) {
      logNavError("sign-out", err);
    }
  }, [closeSidebar, signOut]);

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

  return (
    <Sheet open={isMenuOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[80vw] sm:w-[350px] flex flex-col p-0 bg-card text-card-foreground"
      >
        <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b shrink-0">
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
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1 text-card-foreground">
          <MenuItems items={safeMenu} location={location} onNavigate={closeSidebar} />
          <div className="mt-2 pt-2 border-t">
            <ThemeToggleRow onToggle={closeSidebar} />
          </div>
        </nav>

        <div className="shrink-0 border-t px-4 py-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {t("nav.sign_out")}
          </button>
          <p className="text-center text-[9px] font-bold tracking-widest uppercase mt-2.5 text-primary/30">
            {t("patent_pending.footer_label")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
