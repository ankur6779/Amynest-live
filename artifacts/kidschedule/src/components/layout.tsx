import { useEffect } from "react";
import { useLocation } from "wouter";
import { invokePageBackHandler } from "@/lib/page-back-handler";
import { runSafeNavAction, smartBack } from "@/lib/safe-navigation";
import { ArrowLeft } from "lucide-react";
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
import { BrandLogo } from "@/components/brand-logo";
import { PremiumDesktopSidebar } from "@/components/premium-desktop-sidebar";
import { MobileTabBar } from "@/components/mobile-tab-bar";
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
import { isLearningZoneRoute } from "@/lib/app-layout";
import { isRoutineLivingV1Enabled } from "@/lib/routine-generation/living-entry";

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
  const isAssistantConversationRoute = safePathStartsWithSegment(location, "/assistant");
  const isImmersiveRoute =
    isLearningZoneRoute(location) ||
    safePathStartsWith(location, "/speech-coach") ||
    safePathStartsWith(location, "/speech-coach-v2") ||
    safePathStartsWith(location, "/talking-amy") ||
    safePathStartsWith(location, "/audio-lessons") ||
    isAssistantConversationRoute;
  const isAssistantRoute =
    isAssistantConversationRoute ||
    safePathStartsWithSegment(location, "/amy-ai-tutor");
  const isAmyCoachRoute = safePathStartsWithSegment(location, "/amy-coach");
  const isDashboard = location === "/" || location === "/dashboard";
  const isRoutinesDashboard = location === "/routines";
  const showDashboardChrome =
    location === "/dashboard" ||
    (isRoutinesDashboard && isRoutineLivingV1Enabled());
  const isParentHubRoute = safePathStartsWith(location, "/parenting-hub");
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
    // Page handlers may call navigateBack (same debounce key) — invoke before locking.
    if (invokePageBackHandler()) return;
    runSafeNavAction(`back:${location}`, () => {
      smartBack(setLocation, location, "layout-header-back");
    });
  };
  return (
    <div className="app-shell main-container relative w-full max-w-full min-w-0 bg-background overflow-x-clip box-border">
      {showMobileHeader ? (
        <header
          ref={headerRef}
          className="app-header header w-full max-w-full min-w-0 shrink-0 border-b border-border/80 lg:hidden shadow-sm"
        >
          <div className="app-header__bar">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {canShowBack ? (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Back"
                  className="page-back-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm active:scale-95"
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
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        {!isImmersiveRoute && (
          <PremiumDesktopSidebar
            displayName={displayName}
            email={email}
            initials={initials}
            avatarUrl={avatarUrl}
            isPremium={isPremium}
            onSignOut={handleSignOut}
          />
        )}

        <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip">
          <ScreenContainer
            noOffset={isImmersiveRoute || isAssistantRoute}
            className={
              isImmersiveRoute || isAssistantRoute
                ? `mx-auto w-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip p-0 lg:p-0${isAssistantRoute ? " assistant-route-content h-full" : ""}`
                : isAmyCoachRoute
                  ? "mx-auto w-full max-w-full min-w-0 flex-1 overflow-x-clip p-0 lg:p-8"
                : showDashboardChrome || isParentHubRoute
                  ? "mx-auto w-full max-w-full min-w-0 flex-1 overflow-x-clip p-0 lg:max-w-5xl lg:p-8"
                  : "mx-auto w-full max-w-5xl min-w-0 flex-1 overflow-x-clip px-3 py-4 sm:px-4 lg:p-8"
            }
          >
            {!isImmersiveRoute &&
              !isAssistantRoute &&
              !["/sign-in", "/onboarding", "/notify-prompt"].some((p) =>
                safePathStartsWith(location, p),
              ) && (
                <div className={showDashboardChrome ? "dashboard-inline-inset" : "mb-4"}>
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