import { Suspense, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { lazyPage } from "@/lib/safe-import";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { FirebaseAuthProvider, Show } from "@/lib/firebase-auth";
import { OAuthRedirectHandler } from "@/components/oauth-redirect-handler";
import { useAuth, useClerk } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { Layout } from "@/components/layout";

// Eager imports — landing + sign-in flow are the most common first views,
// and NotFound is tiny + needed as a fallback. Everything else is lazy
// (see below) so the initial JS bundle stays small enough for iOS Safari's
// WebContent process to fit in the in-app browser memory budget that
// WhatsApp / Instagram / etc. provide. Before code-splitting, the main
// chunk was 2.58 MB minified (762 KB gzipped) and was getting killed by
// iOS Jetsam mid-mount on iPhones opened from in-app browsers.
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import SignInPageEager from "@/pages/sign-in";
const SignInPageLazy = lazyPage(() => import("@/pages/sign-in"));
const SignInPage =
  import.meta.env.VITE_AMYNEST_CAPACITOR_IOS_BUILD === "true"
    ? SignInPageEager
    : SignInPageLazy;
const SignUpPage = lazyPage(() => import("@/pages/sign-up"));
const AppleAuthCallbackPage = lazyPage(() => import("@/pages/apple-auth-callback"));
const VerifyEmailPage = lazyPage(() => import("@/pages/verify-email"));
const AuthCallbackPage = lazyPage(() => import("@/pages/auth-callback"));
const ResetPasswordPage = lazyPage(() => import("@/pages/reset-password"));
import RouteFailedPage from "@/pages/route-failed";
import { FirebaseActionGate } from "@/components/firebase-action-gate";
import { AuthBootShell } from "@/components/auth-boot-shell";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { SafeRoutePage } from "@/components/safe-route-page";
import { RouteLoadingShell } from "@/components/route-loading-shell";
import { ApiRetryShell } from "@/components/api-retry-shell";
import { ProductionAppShell } from "@/components/production-app-shell";
import { FetchTimeoutError } from "@/lib/fetch-with-timeout";
import {
  isSetupComplete,
} from "@/lib/setup-status";
import { installTtsGestureListener } from "@/lib/tts-guard";
import { OnboardingStatusProvider, useOnboardingStatus } from "@/contexts/onboarding-status-context";
import { AmyVoiceProvider } from "@/contexts/amy-voice-provider";
import { AppInitGate } from "@/components/app-init-gate";
import { CapacitorIosAuthPreload } from "@/components/capacitor-ios-auth-preload";
import { CapacitorRoutePreload } from "@/components/capacitor-route-preload";
import { isCapacitorIosShell } from "@/lib/device-lite";
import { devLog } from "@/lib/dev-log";
import { initCapacitorOta } from "@/lib/capacitor-ota";

// Lazy-loaded pages — each becomes its own JS chunk, fetched on demand
// when its route is first matched. The Suspense boundary below renders
// `null` while a chunk is loading so there's no flash of fallback UI.
const PrivacyPolicyPage = lazyPage(() => import("@/pages/privacy"));
const TermsOfServicePage = lazyPage(() => import("@/pages/terms"));
const DeleteAccountPage = lazyPage(() => import("@/pages/delete-account"));
const BillingDisputePage = lazyPage(() => import("@/pages/billing-dispute"));
const Dashboard = lazyPage(() => import("@/pages/dashboard"));
const ChildrenList = lazyPage(() => import("@/pages/children/index"));
const ChildForm = lazyPage(() => import("@/pages/children/form"));
const RoutinesList = lazyPage(() => import("@/pages/routines/index"));
const RoutineGenerate = lazyPage(() => import("@/pages/routines/generate"));
const RoutineDetail = lazyPage(() => import("@/pages/routines/detail"));
const BehaviorTracker = lazyPage(() => import("@/pages/behavior/index"));
const ParentProfile = lazyPage(() => import("@/pages/parent-profile"));
const AssistantPage = lazyPage(() => import("@/pages/assistant"));
const AmyAiTutorPage = lazyPage(() => import("@/pages/amy-ai-tutor"));
const ProgressPage = lazyPage(() => import("@/pages/progress"));
const ParentingHub = lazyPage(() => import("@/pages/parenting-hub"));
const PhonicsPage = lazyPage(() => import("@/pages/phonics"));
const PhonicsTestPlayPage = lazyPage(() => import("@/pages/phonics-test-play"));
const LifeSkillsPage = lazyPage(() => import("@/pages/life-skills"));
const SpeechCoachPage = lazyPage(() => import("@/pages/speech-coach/index"));
const LiveSpeechCoachPage = lazyPage(() => import("@/pages/speech-coach/live-speech-coach"));
const KidsControlCenterPage = lazyPage(() => import("@/pages/kids-control-center"));
const StudyPage = lazyPage(() => import("@/pages/study"));
const EventPrepPage = lazyPage(() => import("@/pages/event-prep"));
const SchoolMorningFlowPage = lazyPage(() => import("@/pages/school-morning-flow"));
const AmyCoachPage = lazyPage(() => import("@/pages/ai-coach"));
const AmyCoachProgressPage = lazyPage(() => import("@/pages/ai-coach-progress"));
const RecipesPage = lazyPage(() => import("@/pages/recipes"));
const NutritionHubPage = lazyPage(() => import("@/pages/nutrition"));
const AudioLessonsPage = lazyPage(() => import("@/pages/audio-lessons"));
const GamesPage = lazyPage(() => import("@/pages/games"));
const OnboardingPage = lazyPage(() => import("@/pages/onboarding"));
const PricingPage = lazyPage(() => import("@/pages/pricing"));
const ReferralsPage = lazyPage(() => import("@/pages/referrals"));
const ReferralDeepLinkPage = lazyPage(() => import("@/pages/referral-deep-link"));
const InsightsPage = lazyPage(() => import("@/pages/insights"));
const RewardsPage = lazyPage(() => import("@/pages/rewards"));
const NotificationSettingsPage = lazyPage(() => import("@/pages/notification-settings"));
const NotificationDiagnosticsPage = lazyPage(() => import("@/pages/notification-diagnostics"));
const NotifyPromptPage = lazyPage(() => import("@/pages/notify-prompt"));
const DebugParityPage = lazyPage(() => import("@/pages/debug-parity"));
const EnvironmentPage = lazyPage(() => import("@/pages/environment"));
const FeedbackPage = lazyPage(() => import("@/pages/feedback"));
const AdminFeedbackPage = lazyPage(() => import("@/pages/admin-feedback"));

import { NativeStartupPermissionsGateLazy } from "@/components/native-startup-permissions-gate-lazy";
import { PwaAndroidPermissionsGateLazy } from "@/components/pwa-android-permissions-gate-lazy";
import { ReferralAttributionBridge } from "@/components/referral-attribution-bridge";
import { GiftAttributionBridge } from "@/components/gift-attribution-bridge";
import { OfflineScreen, useOnlineStatus } from "@/components/offline-screen";
import { getAppApiBaseOrigin } from "@/lib/api";
import { waitForIdToken } from "@/lib/auth-token";
import { DebugProvider } from "@/contexts/debug-context";
import { DebugPanel } from "@/components/debug-panel";
import { FcmForegroundHandler } from "@/components/fcm-foreground-handler";
import { useNotificationDeepLink } from "@/hooks/use-notification-deep-link";
import { PaywallProvider } from "@/contexts/paywall-context";
import { PaywallModalLazy } from "@/components/paywall-modal-lazy";
import { SubscriptionEventBridge } from "@/components/subscription-event-bridge";
// ReactInstanceRecovery is rendered by the parent App.tsx (the eager
// shell), so it is NOT imported here — keeping it out of this lazy chunk
// shrinks the initial bundle further and ensures the recovery boundary
// catches errors thrown by the lazy AppCore chunk itself.

// Phase marker helper — installed by the inline boot script in index.html.
// We call this from a top-level useEffect to confirm React's mount actually
// completed (not just `root.render()` returning synchronously, which is
// what the existing `react-rendered` mark in main.tsx records).
declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
  }
}
const bootMark = (phase: string) => {
  try { window.__amynestMark?.(phase); } catch (_e) { /* breadcrumbs are best-effort */ }
};

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function HomeRedirect() {
  const { isSignedIn, isLoaded, authStatus } = useAuth();
  const { data, isError, error, refetch } = useOnboardingStatus();

  devLog("HOME RENDER", { isSignedIn, authStatus, isLoaded });

  // Wait for auth to resolve before deciding signed-in vs not. Without this,
  // an authenticated user momentarily sees <LandingPage /> while Firebase is
  // still loading, which can kick off duplicate /api/onboarding fetches once
  // auth resolves on the next render.
  const authLoading = !isLoaded || authStatus === "loading";
  if (authLoading) return <RouteLoadingShell />;

  if (!isSignedIn) {
    if (isCapacitorIosShell()) {
      return <Redirect to="/sign-in" />;
    }
    return <LandingPage />;
  }

  const authBlocked =
    isError && error instanceof Error && error.message === "auth-unauthorized";

  if (isError && !authBlocked) {
    const timedOut = error instanceof FetchTimeoutError;
    return (
      <ApiRetryShell
        message={
          timedOut
            ? "Loading your account timed out. Check your connection and retry."
            : "We could not load your account status."
        }
        onRetry={() => void refetch()}
      />
    );
  }

  if (authBlocked) {
    return <RouteLoadingShell />;
  }

  return isSetupComplete(data) ? <Redirect to="/dashboard" /> : <Redirect to="/onboarding" />;
}

/** If setup is already done, leave /onboarding (users often land here from an old redirect). */
function OnboardingRouteGuard() {
  const { isSignedIn, isLoaded, authStatus } = useAuth();
  const { data, isError, error, refetch } = useOnboardingStatus();
  const authBlocked =
    isError && error instanceof Error && error.message === "auth-unauthorized";

  const authLoading = !isLoaded || authStatus === "loading";
  if (authLoading) return <RouteLoadingShell />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (authBlocked) return <RouteLoadingShell />;
  if (isError) {
    return (
      <ApiRetryShell
        onRetry={() => void refetch()}
      />
    );
  }
  if (isSetupComplete(data)) return <Redirect to="/dashboard" />;
  return (
    <AppErrorBoundary label="Onboarding">
      <OnboardingPage />
    </AppErrorBoundary>
  );
}

/** Standalone native push prompt — no Layout shell (same pattern as onboarding). */
function NotifyPromptRouteGuard() {
  const { isSignedIn, isLoaded, authStatus } = useAuth();

  const authLoading = !isLoaded || authStatus === "loading";
  if (authLoading) return <RouteLoadingShell />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  return (
    <AppErrorBoundary label="NotifyPrompt">
      <NotifyPromptPage />
    </AppErrorBoundary>
  );
}

function ProtectedRoute({ component: Component }: { component: ComponentType; requiresProfile?: boolean }) {
  const { isSignedIn, isLoaded, authStatus } = useAuth();
  const { data, isError, error, refetch } = useOnboardingStatus();
  const authBlocked =
    isError && error instanceof Error && error.message === "auth-unauthorized";

  // Hard guard: never decide signed-in / signed-out until Firebase has
  // resolved. Without this gate, a signed-in user with a slow auth resolve
  // would briefly hit the /sign-in redirect and bounce back, triggering an
  // unnecessary route remount + duplicate API calls.
  const authLoading = !isLoaded || authStatus === "loading";
  if (authLoading) return <RouteLoadingShell />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (authBlocked) return <RouteLoadingShell />;
  if (isError) {
    return <ApiRetryShell onRetry={() => void refetch()} />;
  }
  if (!isSetupComplete(data)) return <Redirect to="/onboarding" />;
  return (
    <AppErrorBoundary label="Layout">
      <Layout>
        <SafeRoutePage component={Component} label="ProtectedPage" suspense />
      </Layout>
    </AppErrorBoundary>
  );
}

/** Stable route component — avoids remounting guards on parent re-renders. */
function makeProtectedRoute(Component: ComponentType) {
  function ProtectedRoutePage() {
    return <ProtectedRoute component={Component} />;
  }
  ProtectedRoutePage.displayName = `Protected(${Component.displayName ?? Component.name ?? "Page"})`;
  return ProtectedRoutePage;
}

const DashboardRoute = makeProtectedRoute(Dashboard);
const ChildrenListRoute = makeProtectedRoute(ChildrenList);
const ChildFormRoute = makeProtectedRoute(ChildForm);
const RoutinesListRoute = makeProtectedRoute(RoutinesList);
const RoutineGenerateRoute = makeProtectedRoute(RoutineGenerate);
const RoutineDetailRoute = makeProtectedRoute(RoutineDetail);
const BehaviorTrackerRoute = makeProtectedRoute(BehaviorTracker);
const ParentProfileRoute = makeProtectedRoute(ParentProfile);
const NotificationSettingsRoute = makeProtectedRoute(NotificationSettingsPage);
const NotificationDiagnosticsRoute = makeProtectedRoute(NotificationDiagnosticsPage);
const AssistantRoute = makeProtectedRoute(AssistantPage);
const AmyAiTutorRoute = makeProtectedRoute(AmyAiTutorPage);
const ProgressRoute = makeProtectedRoute(ProgressPage);
const ParentingHubRoute = makeProtectedRoute(ParentingHub);
const PhonicsRoute = makeProtectedRoute(PhonicsPage);
const PhonicsTestPlayRoute = makeProtectedRoute(PhonicsTestPlayPage);
const LifeSkillsRoute = makeProtectedRoute(LifeSkillsPage);
const SpeechCoachRoute = makeProtectedRoute(SpeechCoachPage);
const LiveSpeechCoachRoute = makeProtectedRoute(LiveSpeechCoachPage);
const KidsControlCenterRoute = makeProtectedRoute(KidsControlCenterPage);
const StudyRoute = makeProtectedRoute(StudyPage);
const EventPrepRoute = makeProtectedRoute(EventPrepPage);
const SchoolMorningFlowRoute = makeProtectedRoute(SchoolMorningFlowPage);
const AmyCoachRoute = makeProtectedRoute(AmyCoachPage);
const AmyCoachProgressRoute = makeProtectedRoute(AmyCoachProgressPage);
const RecipesRoute = makeProtectedRoute(RecipesPage);
const NutritionHubRoute = makeProtectedRoute(NutritionHubPage);
const AudioLessonsRoute = makeProtectedRoute(AudioLessonsPage);
const GamesRoute = makeProtectedRoute(GamesPage);
const PricingRoute = makeProtectedRoute(PricingPage);
const ReferralsRoute = makeProtectedRoute(ReferralsPage);
/** Public — universal link `/referral/:code` captures invite before sign-in. */
const ReferralDeepLinkRoute = ReferralDeepLinkPage;
const InsightsRoute = makeProtectedRoute(InsightsPage);
const RewardsRoute = makeProtectedRoute(RewardsPage);
const EnvironmentRoute = makeProtectedRoute(EnvironmentPage);
const FeedbackRoute = makeProtectedRoute(FeedbackPage);
const AdminFeedbackRoute = makeProtectedRoute(AdminFeedbackPage);

function FirebaseAuthBootstrap() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => waitForIdToken(getToken));
    } else {
      setAuthTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

  return null;
}

function ClientTelemetryBootstrap() {
  const authFetch = useAuthFetch();
  const authFetchRef = useRef(authFetch);
  authFetchRef.current = authFetch;
  const { isSignedIn } = useAuth();
  const telemetryStartedRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || telemetryStartedRef.current) return;
    telemetryStartedRef.current = true;
    const flush = () => {
      void import("@/lib/client-logs").then(({ flushClientLogs }) =>
        flushClientLogs(authFetchRef.current),
      );
    };
    flush();
    const id = setInterval(flush, 30_000);
    return () => {
      clearInterval(id);
    };
  }, [isSignedIn]);

  return null;
}

/** Orval `customFetch` uses relative `/api/...` paths — prepend API origin (Render / local dev). */
let apiBaseUrlInitialized = false;

function NativeApiBaseUrlBootstrap() {
  useEffect(() => {
    if (apiBaseUrlInitialized) return;
    apiBaseUrlInitialized = true;
    const origin = getAppApiBaseOrigin();
    setBaseUrl(origin || null);
  }, []);

  return null;
}

function QueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function NotificationDeepLinkBridge() {
  useNotificationDeepLink();
  return null;
}

function ReactMountMarker() {
  // Confirms React's reconciliation actually completed and effects are
  // running — not just that `root.render()` returned synchronously (which
  // is what the existing `react-rendered` mark in main.tsx captures).
  // If a boot record on the next load shows `react-rendered` but NOT
  // `react-effect-fired`, the iOS WebContent process was killed during
  // initial reconciliation — almost always a memory-pressure crash from
  // the bundle being too large.
  useEffect(() => {
    bootMark("react-effect-fired");
  }, []);
  return null;
}

function AppRoutes() {
  return (
      <ThemeProvider>
        <TooltipProvider>
          <DebugProvider>
          <PaywallProvider>
            <ReactMountMarker />
            <NativeApiBaseUrlBootstrap />
            <FirebaseAuthBootstrap />
            <ClientTelemetryBootstrap />
            <OAuthRedirectHandler />
            <CapacitorIosAuthPreload />
            <CapacitorRoutePreload />
            <QueryClientCacheInvalidator />
            <ReferralAttributionBridge />
            <GiftAttributionBridge />
            <FcmForegroundHandler />
            <NotificationDeepLinkBridge />
            <Suspense fallback={<RouteLoadingShell />}>
            <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/index.html">
            <Redirect to="/" />
          </Route>
          <Route path="/privacy" component={PrivacyPolicyPage} />
          <Route path="/terms" component={TermsOfServicePage} />
          <Route path="/delete-account" component={DeleteAccountPage} />
          <Route path="/billing-dispute" component={BillingDisputePage} />
          <Route path="/login">
            <Redirect to="/sign-in" />
          </Route>
          <Route path="/sign-in" component={SignInPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route path="/verify-email" component={VerifyEmailPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/verify" component={AuthCallbackPage} />
          <Route path="/auth/callback" component={AuthCallbackPage} />
          {/* Firebase email template may use /auth/action */}
          <Route path="/auth/action" component={AuthCallbackPage} />
          <Route path="/auth/apple/callback" component={AppleAuthCallbackPage} />
          <Route path="/onboarding" component={OnboardingRouteGuard} />
          <Route path="/dashboard" component={DashboardRoute} />
          <Route path="/children" component={ChildrenListRoute} />
          <Route path="/children/new" component={ChildFormRoute} />
          <Route path="/children/:id" component={ChildFormRoute} />
          <Route path="/routines" component={RoutinesListRoute} />
          <Route path="/routines/generate" component={RoutineGenerateRoute} />
          <Route path="/routines/:id" component={RoutineDetailRoute} />
          <Route path="/behavior" component={BehaviorTrackerRoute} />
          <Route path="/profile">
            <Redirect to="/parent-profile" />
          </Route>
          <Route path="/parent-profile" component={ParentProfileRoute} />
          <Route path="/notification-settings" component={NotificationSettingsRoute} />
          <Route path="/notification-diagnostics" component={NotificationDiagnosticsRoute} />
          <Route path="/notify-prompt" component={NotifyPromptRouteGuard} />
          <Route path="/babysitters">
            <Redirect to="/dashboard" />
          </Route>
          <Route path="/assistant" component={AssistantRoute} />
          <Route path="/amy-ai-tutor" component={AmyAiTutorRoute} />
          <Route path="/progress" component={ProgressRoute} />
          <Route path="/parenting-hub" component={ParentingHubRoute} />
          <Route path="/phonics/test/play" component={PhonicsTestPlayRoute} />
          <Route path="/phonics/test" component={PhonicsRoute} />
          <Route path="/phonics" component={PhonicsRoute} />
          <Route path="/life-skills" component={LifeSkillsRoute} />
          <Route path="/speech-coach/live" component={LiveSpeechCoachRoute} />
          <Route path="/speech-coach" component={SpeechCoachRoute} />
          <Route path="/parenting-hub/speech-coach/live" component={LiveSpeechCoachRoute} />
          <Route path="/parenting-hub/speech-coach" component={SpeechCoachRoute} />
          <Route path="/kids-control-center" component={KidsControlCenterRoute} />
          <Route path="/study" component={StudyRoute} />
          <Route path="/event-prep" component={EventPrepRoute} />
          <Route path="/school-morning-flow" component={SchoolMorningFlowRoute} />
          <Route path="/amy-coach" component={AmyCoachRoute} />
          <Route path="/amy-coach/progress" component={AmyCoachProgressRoute} />
          <Route path="/recipes" component={RecipesRoute} />
          <Route path="/nutrition" component={NutritionHubRoute} />
          <Route path="/audio-lessons" component={AudioLessonsRoute} />
          <Route path="/games" component={GamesRoute} />
          <Route path="/pricing" component={PricingRoute} />
          <Route path="/referral/:code" component={ReferralDeepLinkRoute} />
          <Route path="/referrals" component={ReferralsRoute} />
          <Route path="/insights" component={InsightsRoute} />
          <Route path="/rewards" component={RewardsRoute} />
          <Route path="/debug-parity" component={DebugParityPage} />
          <Route path="/environment" component={EnvironmentRoute} />
          <Route path="/feedback" component={FeedbackRoute} />
          <Route path="/admin/feedback" component={AdminFeedbackRoute} />
          <Route component={RouteFailedPage} />
            </Switch>
            </Suspense>
            <PaywallModalLazy />
            <SubscriptionEventBridge />
            <Toaster />
            <DebugPanel />
          </PaywallProvider>
          </DebugProvider>
        </TooltipProvider>
      </ThemeProvider>
  );
}

// Marks the moment AppCore actually mounts (i.e. the lazy chunk has
// downloaded, parsed, and React has rendered + run effects). If a boot
// record on the next load shows `react-effect-fired` but NOT
// `appcore-mounted`, AppCore loaded but its providers crashed; if it
// shows neither, the AppCore chunk fetch / parse itself was the killer.
//
// Also flips `window.__amynestAppCoreReady` so the splash-dismiss logic
// in main.tsx can wait for the lazy chunk to be on screen before fading
// out. Without this flag the splash could time out (3.2 s full / 1.2 s
// lite) before AppCore arrived on a slow connection, briefly exposing
// the empty Suspense fallback.
let appCoreInitDone = false;

function AppCoreMountMarker() {
  useEffect(() => {
    if (appCoreInitDone) return;
    appCoreInitDone = true;
    devLog("APPCORE MOUNTED (init once)");
    void initCapacitorOta();
    installTtsGestureListener();
    try { (window as Window & { __amynestAppCoreReady?: boolean }).__amynestAppCoreReady = true; } catch (_e) { /* best-effort */ }
    bootMark("appcore-mounted");
  }, []);
  return null;
}

/**
 * OfflineGate — renders the premium AmyNest offline screen as a fixed overlay
 * whenever the browser reports no connectivity. Auto-dismisses the moment the
 * `online` event fires (no user action required). Also polls /api/healthz every
 * 5 s as a fallback for environments where the browser event is delayed.
 */
function OfflineGate() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return <OfflineScreen />;
}

export default function AppCore() {
  return (
    <ProductionAppShell>
      <FirebaseAuthProvider>
        <AmyVoiceProvider>
        <OnboardingStatusProvider>
          <AppInitGate>
            <WouterRouter base={basePath}>
              <FirebaseActionGate>
                <AppCoreMountMarker />
                <AppErrorBoundary label="AppRoutes">
                  <AppRoutes />
                </AppErrorBoundary>
                <OfflineGate />
                <NativeStartupPermissionsGateLazy />
                <PwaAndroidPermissionsGateLazy />
              </FirebaseActionGate>
            </WouterRouter>
          </AppInitGate>
        </OnboardingStatusProvider>
        </AmyVoiceProvider>
      </FirebaseAuthProvider>
    </ProductionAppShell>
  );
}
