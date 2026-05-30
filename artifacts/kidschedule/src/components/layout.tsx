import { useEffect } from "react";
import { useLocation } from "wouter";
import { AppLink } from "@/components/app-link";
import { invokePageBackHandler } from "@/lib/page-back-handler";
import { runSafeNavAction, smartBack } from "@/lib/safe-navigation";
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
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { AmyIcon } from "@/components/amy-icon";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionTrialChip } from "@/components/subscription-trial-chip";
import { usePushRegistration } from "@/hooks/use-push-registration";
import { useCapacitorPushRegistrationSync } from "@/hooks/use-capacitor-push-registration-sync";
import { NotificationNudgeBanner } from "@/components/notification-nudge-banner";
import { NotificationPromptModal } from "@/components/notification-prompt-modal";
import { SpotlightTour } from "@/components/spotlight-tour";
import { ScreenContainer } from "@/components/screen-container";
import { useAppHeaderHeight } from "@/hooks/use-app-header-height";
import { prefetchRouteChunk } from "@/lib/route-chunk-preload";
import { isLearningZoneRoute } from "@/lib/app-layout";
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
  href: "/amy-coach",
  labelKey: "nav.amy_coach",
  icon: Brain
}, {
  href: "/nutrition",
  labelKey: "nav.nutrition_hub",
  icon: Salad
}, {
  href: "/routines",
  labelKey: "nav.routines",
  icon: Calendar
}, {
  href: "/games",
  labelKey: "nav.games",
  icon: Gamepad2
}, {
  href: "/assistant",
  labelKey: "nav.amy_ai",
  icon: Bot
}, {
  href: "/kids-control-center",
  labelKey: "nav.kids_control_center",
  icon: Baby,
  badge: "Soon 🚀"
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
  href: "/recipes",
  labelKey: "nav.my_recipes",
  icon: ChefHat
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
    isLearningZoneRoute(location) ||
    safePathStartsWith(location, "/speech-coach") ||
    safePathStartsWith(location, "/audio-lessons");
  const isAssistantRoute = safePathStartsWithSegment(location, "/assistant");
  const isDashboard = location === "/" || location === "/dashboard";
  const showDashboardChrome = location === "/dashboard";
  const canShowBack = !showDashboardChrome && location !== "/";
  const showMobileHeader = !isImmersiveRoute;
  const headerRef = useAppHeaderHeight(showMobileHeader);

  useEffect(() => {
    logNavEvent("layout-mounted", { location });
  }, [location]);

  useEffect(() => {
    document.body.classList.toggle("has-tabbar", showDashboardChrome);
    document.body.classList.toggle("no-tabbar", !showDashboardChrome);
    return () => {
      document.body.classList.remove("has-tabbar", "no-tabbar");
    };
  }, [showDashboardChrome]);

  const handleSignOut = () => {
    try {
      void signOut({ redirectUrl: "/" });
    } catch (err) {
      console.error("[amynest:nav] sign-out failed", err);
    }
  };
  const handleBack = () => {
    runSafeNavAction(`back:${location}`, () => {
      if (invokePageBackHandler()) return;
      smartBack(setLocation, location, "layout-header-back");
    });
  };
  return (
    <div className="app-shell main-container relative w-full max-w-full min-w-0 bg-background overflow-x-clip box-border">
      {showMobileHeader ? (
        <header
          ref={headerRef}
          className="app-header header w-full max-w-full min-w-0 shrink-0 border-b border-border/80 md:hidden shadow-sm"
        >
          <div className="app-header__bar">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
              <BrandLogo size="sm" showTagline={false} />
              <AmyMascotLogo size={26} />
            </div>
            <div className="flex shrink-0 items-center">
              <SubscriptionTrialChip />
              <LayoutMobileMenu />
            </div>
          </div>
        </header>
      ) : null}

      <main className="app-shell-main flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col">
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
            return <AppLink key={item.href} href={item.href} source="desktop-sidebar" data-tour={item.href === "/dashboard" ? "dashboard" : item.href === "/routines" ? "routines" : item.href === "/amy-coach" ? "amy-coach" : item.href === "/parenting-hub" ? "parenting-hub" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 truncate">{t(item.labelKey)}</span>
                  {item.badge && <span className="shrink-0 inline-flex items-center rounded-full bg-gradient-to-r from-primary to-primary px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                      {item.badge}
                    </span>}
                </AppLink>;
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

        <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip">
          <ScreenContainer
            noOffset={isImmersiveRoute || isAssistantRoute}
            className={
              isImmersiveRoute || isAssistantRoute
                ? `mx-auto w-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip p-0 md:p-0${isAssistantRoute ? " assistant-route-content h-full" : ""}`
                : showDashboardChrome
                  ? "mx-auto w-full max-w-full min-w-0 flex-1 overflow-x-clip p-0 md:max-w-5xl md:p-8"
                  : "mx-auto w-full max-w-5xl min-w-0 flex-1 overflow-x-clip px-3 py-4 sm:px-4 md:p-8"
            }
          >
            {!isImmersiveRoute &&
              !isAssistantRoute &&
              !["/sign-in", "/onboarding", "/notify-prompt"].some((p) =>
                safePathStartsWith(location, p),
              ) && (
                <div className={showDashboardChrome ? "mb-4 dashboard-inline-inset" : "mb-4"}>
                  <NotificationNudgeBanner />
                </div>
              )}
            {children}
          </ScreenContainer>
        </div>
        </div>
      </main>

      <MobileTabBar visible={showDashboardChrome} />

      {!isImmersiveRoute &&
        !["/sign-in", "/onboarding"].some((p) => safePathStartsWith(location, p)) && (
          <NotificationPromptModal />
        )}

      <SpotlightTour />
    </div>
  );
}