import { lazy, Suspense, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { FirebaseAuthProvider, Show } from "@/lib/firebase-auth";
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
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";

// Lazy-loaded pages — each becomes its own JS chunk, fetched on demand
// when its route is first matched. The Suspense boundary below renders
// `null` while a chunk is loading so there's no flash of fallback UI.
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy"));
const TermsOfServicePage = lazy(() => import("@/pages/terms"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const ChildrenList = lazy(() => import("@/pages/children/index"));
const ChildForm = lazy(() => import("@/pages/children/form"));
const RoutinesList = lazy(() => import("@/pages/routines/index"));
const RoutineGenerate = lazy(() => import("@/pages/routines/generate"));
const RoutineDetail = lazy(() => import("@/pages/routines/detail"));
const BehaviorTracker = lazy(() => import("@/pages/behavior/index"));
const ParentProfile = lazy(() => import("@/pages/parent-profile"));
const BabysittersPage = lazy(() => import("@/pages/babysitters/index"));
const AssistantPage = lazy(() => import("@/pages/assistant"));
const ProgressPage = lazy(() => import("@/pages/progress"));
const ParentingHub = lazy(() => import("@/pages/parenting-hub"));
const KidsControlCenterPage = lazy(() => import("@/pages/kids-control-center"));
const StudyPage = lazy(() => import("@/pages/study"));
const EventPrepPage = lazy(() => import("@/pages/event-prep"));
const SchoolMorningFlowPage = lazy(() => import("@/pages/school-morning-flow"));
const AmyCoachPage = lazy(() => import("@/pages/ai-coach"));
const AmyCoachProgressPage = lazy(() => import("@/pages/ai-coach-progress"));
const RecipesPage = lazy(() => import("@/pages/recipes"));
const NutritionHubPage = lazy(() => import("@/pages/nutrition"));
const AudioLessonsPage = lazy(() => import("@/pages/audio-lessons"));
const GamesPage = lazy(() => import("@/pages/games"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const ReferralsPage = lazy(() => import("@/pages/referrals"));
const InsightsPage = lazy(() => import("@/pages/insights"));
const RewardsPage = lazy(() => import("@/pages/rewards"));
const NotificationSettingsPage = lazy(() => import("@/pages/notification-settings"));

import { ReferralAttributionBridge } from "@/components/referral-attribution-bridge";
import { PaywallProvider } from "@/contexts/paywall-context";
import { PaywallModal } from "@/components/paywall-modal";
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

function useOnboardingStatus() {
  const { isSignedIn } = useAuth();
  const authFetch = useAuthFetch();
  return useQuery({
    queryKey: ["onboarding-status"],
    queryFn: async () => {
      const res = await authFetch("/api/onboarding");
      if (!res.ok) {
        localStorage.removeItem("onboardingComplete");
        return { onboardingComplete: false, profileComplete: false };
      }
      const data = await res.json() as { onboardingComplete: boolean; profileComplete: boolean };
      if (data.onboardingComplete) {
        localStorage.setItem("onboardingComplete", "true");
      } else {
        localStorage.removeItem("onboardingComplete");
      }
      return data;
    },
    enabled: !!isSignedIn,
    staleTime: 30_000,
  });
}

function HomeRedirect() {
  const { data, isLoading } = useOnboardingStatus();
  return (
    <>
      <Show when="signed-in">
        {isLoading
          ? null
          : data?.onboardingComplete
            ? <Redirect to="/dashboard" />
            : <Redirect to="/onboarding" />
        }
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType; requiresProfile?: boolean }) {
  const { data, isLoading } = useOnboardingStatus();
  return (
    <>
      <Show when="signed-in">
        {isLoading
          ? null
          : !data?.onboardingComplete
            ? <Redirect to="/onboarding" />
            : <Layout><Component /></Layout>
        }
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function FirebaseAuthBootstrap() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

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

const queryClient = new QueryClient();

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <PaywallProvider>
            <ReactMountMarker />
            <FirebaseAuthBootstrap />
            <QueryClientCacheInvalidator />
            <ReferralAttributionBridge />
            <Suspense fallback={null}>
            <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/privacy" component={PrivacyPolicyPage} />
          <Route path="/terms" component={TermsOfServicePage} />
          <Route path="/sign-in" component={SignInPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route path="/onboarding">
            {() => (
              <>
                <Show when="signed-in"><OnboardingPage /></Show>
                <Show when="signed-out"><Redirect to="/sign-in" /></Show>
              </>
            )}
          </Route>
          <Route path="/dashboard">
            {() => <ProtectedRoute component={Dashboard} />}
          </Route>
          <Route path="/children">
            {() => <ProtectedRoute component={ChildrenList} requiresProfile={false} />}
          </Route>
          <Route path="/children/new">
            {() => <ProtectedRoute component={ChildForm} requiresProfile={false} />}
          </Route>
          <Route path="/children/:id">
            {() => <ProtectedRoute component={ChildForm} requiresProfile={false} />}
          </Route>
          <Route path="/routines">
            {() => <ProtectedRoute component={RoutinesList} />}
          </Route>
          <Route path="/routines/generate">
            {() => <ProtectedRoute component={RoutineGenerate} />}
          </Route>
          <Route path="/routines/:id">
            {() => <ProtectedRoute component={RoutineDetail} />}
          </Route>
          <Route path="/behavior">
            {() => <ProtectedRoute component={BehaviorTracker} />}
          </Route>
          <Route path="/parent-profile">
            {() => <ProtectedRoute component={ParentProfile} requiresProfile={false} />}
          </Route>
          <Route path="/notification-settings">
            {() => <ProtectedRoute component={NotificationSettingsPage} requiresProfile={false} />}
          </Route>
          <Route path="/babysitters">
            {() => <ProtectedRoute component={BabysittersPage} />}
          </Route>
          <Route path="/assistant">
            {() => <ProtectedRoute component={AssistantPage} />}
          </Route>
          <Route path="/progress">
            {() => <ProtectedRoute component={ProgressPage} />}
          </Route>
          <Route path="/parenting-hub">
            {() => <ProtectedRoute component={ParentingHub} />}
          </Route>
          <Route path="/kids-control-center">
            {() => <ProtectedRoute component={KidsControlCenterPage} />}
          </Route>
          <Route path="/study">
            {() => <ProtectedRoute component={StudyPage} />}
          </Route>
          <Route path="/event-prep">
            {() => <ProtectedRoute component={EventPrepPage} />}
          </Route>
          <Route path="/school-morning-flow">
            {() => <ProtectedRoute component={SchoolMorningFlowPage} />}
          </Route>
          <Route path="/amy-coach">
            {() => <ProtectedRoute component={AmyCoachPage} />}
          </Route>
          <Route path="/amy-coach/progress">
            {() => <ProtectedRoute component={AmyCoachProgressPage} />}
          </Route>
          <Route path="/recipes">
            {() => <ProtectedRoute component={RecipesPage} />}
          </Route>
          <Route path="/nutrition">
            {() => <ProtectedRoute component={NutritionHubPage} />}
          </Route>
          <Route path="/audio-lessons">
            {() => <ProtectedRoute component={AudioLessonsPage} />}
          </Route>
          <Route path="/games">
            {() => <ProtectedRoute component={GamesPage} />}
          </Route>
          <Route path="/pricing">
            {() => <ProtectedRoute component={PricingPage} requiresProfile={false} />}
          </Route>
          <Route path="/referrals">
            {() => <ProtectedRoute component={ReferralsPage} requiresProfile={false} />}
          </Route>
          <Route path="/insights">
            {() => <ProtectedRoute component={InsightsPage} />}
          </Route>
          <Route path="/rewards">
            {() => <ProtectedRoute component={RewardsPage} />}
          </Route>
          <Route component={NotFound} />
            </Switch>
            </Suspense>
            <PaywallModal />
            <SubscriptionEventBridge />
            <Toaster />
          </PaywallProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
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
function AppCoreMountMarker() {
  useEffect(() => {
    try { (window as Window & { __amynestAppCoreReady?: boolean }).__amynestAppCoreReady = true; } catch (_e) { /* best-effort */ }
    bootMark("appcore-mounted");
  }, []);
  return null;
}

export default function AppCore() {
  return (
    <FirebaseAuthProvider>
      <WouterRouter base={basePath}>
        <AppCoreMountMarker />
        <AppRoutes />
      </WouterRouter>
    </FirebaseAuthProvider>
  );
}
