import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Home, Users, Calendar, Star, LogOut, UserCircle, Baby, Bot, TrendingUp, BookOpen, Brain, Sparkles, Gamepad2, Gift, ChefHat, Salad, BarChart2, Trophy, MessageSquarePlus } from "lucide-react";
import { useClerk, useUser } from "@/lib/firebase-auth-hooks";
import { LayoutMobileMenu } from "@/components/layout-mobile-menu";
import { logNavEvent } from "@/lib/navigation-log";
import { safePathStartsWith, safePathStartsWithSegment } from "@/lib/safe-route";
import {
  getUserAvatarUrl,
  getUserDisplayName,
  getUserEmail,
  getUserInitials,
} from "@/lib/safe-user-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";
import { AmyFab } from "@/components/amy-fab";
import { AmyIcon } from "@/components/amy-icon";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { usePushRegistration } from "@/hooks/use-push-registration";
import { useCapacitorPushRegistrationSync } from "@/hooks/use-capacitor-push-registration-sync";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { NotificationNudgeBanner } from "@/components/notification-nudge-banner";
import { NotificationPromptModal } from "@/components/notification-prompt-modal";
import { SpotlightTour } from "@/components/spotlight-tour";
function SmartParentBadge({
  className = ""
}: {
  className?: string;
}) {
  const {
    t
  } = useTranslation();
  return <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${className}`} data-testid="badge-smart-parent">
      <Sparkles className="h-2.5 w-2.5" />
      {t("components.layout.smart_parent")}
    </span>;
}
type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  badge?: string;
};
const NAV_ITEMS: NavItem[] = [{
  href: "/dashboard",
  labelKey: "nav.dashboard",
  icon: Home
}, {
  href: "/parenting-hub",
  labelKey: "nav.parenting_hub",
  icon: BookOpen
}, {
  href: "/kids-control-center",
  labelKey: "nav.kids_control_center",
  icon: Baby,
  badge: "Soon 🚀"
}, {
  href: "/amy-coach",
  labelKey: "nav.amy_coach",
  icon: Brain
}, {
  href: "/routines",
  labelKey: "nav.routines",
  icon: Calendar
}, {
  href: "/progress",
  labelKey: "nav.progress",
  icon: TrendingUp
}, {
  href: "/insights",
  labelKey: "nav.insights",
  icon: BarChart2
}, {
  href: "/rewards",
  labelKey: "nav.rewards",
  icon: Trophy
}, {
  href: "/behavior",
  labelKey: "nav.behavior",
  icon: Star
}, {
  href: "/assistant",
  labelKey: "nav.amy_ai",
  icon: Bot
}, {
  href: "/games",
  labelKey: "nav.games",
  icon: Gamepad2
}, {
  href: "/recipes",
  labelKey: "nav.my_recipes",
  icon: ChefHat
}, {
  href: "/nutrition",
  labelKey: "nav.nutrition_hub",
  icon: Salad
}, {
  href: "/children",
  labelKey: "nav.children",
  icon: Users
}, {
  href: "/parent-profile",
  labelKey: "nav.profile",
  icon: UserCircle
}, {
  href: "/pricing",
  labelKey: "nav.pricing",
  icon: Sparkles
}, {
  href: "/referrals",
  labelKey: "nav.referrals",
  icon: Gift
}, {
  href: "/feedback",
  labelKey: "nav.feedback",
  icon: MessageSquarePlus
}];
const BOTTOM_NAV_ITEMS = [{
  href: "/dashboard",
  labelKey: "nav.dashboard",
  icon: Home,
  center: false
}, {
  href: "/routines",
  labelKey: "nav.routines",
  icon: Calendar,
  center: false
}, {
  href: "/amy-coach",
  labelKey: "nav.amy_coach",
  icon: Brain,
  center: true
}, {
  href: "/parenting-hub",
  labelKey: "nav.parenting_hub",
  icon: BookOpen,
  center: false
}];
export function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useLocation();
  const {
    signOut
  } = useClerk();
  const {
    user
  } = useUser();
  const {
    t
  } = useTranslation();
  const {
    isPremium
  } = useSubscription();
  usePushRegistration();
  useCapacitorPushRegistrationSync();
  const displayName = getUserDisplayName(user);
  const email = getUserEmail(user);
  const initials = getUserInitials(user);
  const avatarUrl = getUserAvatarUrl(user);
  const isImmersiveRoute =
    safePathStartsWith(location, "/phonics") || safePathStartsWith(location, "/speech-coach");
  const isAssistantRoute = safePathStartsWithSegment(location, "/assistant");
  const showDashboardChrome = location === "/dashboard";
  const canShowBack = !showDashboardChrome && location !== "/";

  useEffect(() => {
    logNavEvent("layout-mounted", { location });
  }, [location]);

  const handleSignOut = () => {
    try {
      void signOut({ redirectUrl: "/" });
    } catch (err) {
      console.error("[amynest:nav] sign-out failed", err);
    }
  };
  const handleBack = () => {
    try {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch (err) {
      console.error("[amynest:nav] history back failed", err);
    }
    setLocation("/dashboard");
  };
  return (
    <div className="app-shell main-container relative w-full max-w-full min-w-0 bg-background overflow-x-clip box-border">
      {!isImmersiveRoute ? (
        <header
          className={`app-header header flex min-h-20 w-full max-w-full min-w-0 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 py-3 md:hidden shadow-sm ${isNativeAmyNestShell() ? "pt-3" : "pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]"}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {canShowBack ? (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Back"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}
            <BrandLogo size="sm" showTagline={true} />
            <AmyMascotLogo size={34} />
          </div>
          <div className="flex items-center gap-2">
            <LayoutMobileMenu />
          </div>
        </header>
      ) : null}

      <main className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col md:flex-row">
        {/* Desktop Sidebar */}
        {!isImmersiveRoute && <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
          <div className="flex h-24 items-center justify-between border-b px-5 shadow-sm">
            <BrandLogo size="md" showTagline={true} />
            <AmyMascotLogo size={42} />
          </div>
          <div className="px-4 pt-3">
            </div>
          <nav className="flex flex-1 flex-col gap-1 p-4">
            {NAV_ITEMS.map(item => {
            const isActive = safePathStartsWith(location, item.href);
            return <Link key={item.href} href={item.href} data-tour={item.href === "/dashboard" ? "dashboard" : item.href === "/routines" ? "routines" : item.href === "/amy-coach" ? "amy-coach" : item.href === "/parenting-hub" ? "parenting-hub" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 truncate">{t(item.labelKey)}</span>
                  {item.badge && <span className="shrink-0 inline-flex items-center rounded-full bg-gradient-to-r from-primary to-primary px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                      {item.badge}
                    </span>}
                </Link>;
          })}
          </nav>
          {/* Desktop user / sign-out */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
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
            <button onClick={handleSignOut} data-testid="button-sign-out" className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" />
              {t("nav.sign_out")}
            </button>
            <p className="text-center text-[9px] font-bold tracking-widest uppercase mt-3 text-primary/25">
              {t("patent_pending.footer_label")}
            </p>
          </div>
        </aside>}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={
              isImmersiveRoute || isAssistantRoute
                ? "mx-auto flex w-full min-h-0 flex-1 flex-col overflow-hidden p-0 md:p-0"
                : "mx-auto w-full max-w-5xl flex-1 p-4 md:p-8"
            }
          >
            {!isImmersiveRoute &&
              !isAssistantRoute &&
              !["/sign-in", "/onboarding", "/notify-prompt"].some((p) =>
                safePathStartsWith(location, p),
              ) && (
                <div className="mb-4">
                  <NotificationNudgeBanner />
                </div>
              )}
            {children}
          </div>
        </div>
        </div>
      </main>

      {showDashboardChrome ? (
        <footer className="app-footer shrink-0 md:hidden">
          <nav
            className="h-[78px] w-full border-t border-border bg-card/95 shadow-[0_-8px_28px_var(--shadow-color)] backdrop-blur-xl"
            aria-label={t("nav.dashboard")}
          >
            <div className="relative flex h-full w-full items-end justify-around px-2 pb-2">
              {BOTTOM_NAV_ITEMS.map((item) => {
                const isActive = safePathStartsWithSegment(location, item.href);
                if (item.center) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-tour="amy-coach"
                      className="relative flex flex-col items-center justify-end -translate-y-5"
                    >
                      <div
                        className={`flex h-[60px] w-[60px] items-center justify-center rounded-full text-primary-foreground transition-transform active:scale-90 ${isActive ? "bg-gradient-to-br from-primary to-primary shadow-lg ring-2 ring-primary/20" : "bg-gradient-to-br from-primary to-primary shadow-md"}`}
                      >
                        <item.icon className="h-7 w-7" />
                      </div>
                      <span className="mt-1 text-[10px] font-semibold text-muted-foreground">
                        {t(item.labelKey)}
                      </span>
                    </Link>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
                  </Link>
                );
              })}
            </div>
          </nav>
        </footer>
      ) : null}

      {!isImmersiveRoute &&
        !["/sign-in", "/onboarding"].some((p) => safePathStartsWith(location, p)) && (
          <NotificationPromptModal />
        )}

      {showDashboardChrome ? <AmyFab /> : null}

      <SpotlightTour />
    </div>
  );
}