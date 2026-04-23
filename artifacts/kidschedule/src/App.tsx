import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import {
  FirebaseAuthProvider,
  Show,
  useAuth,
  useClerk,
} from "@/lib/firebase-auth";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import LandingPage from "@/pages/landing";
import PrivacyPolicyPage from "@/pages/privacy";

import Dashboard from "@/pages/dashboard";
import ChildrenList from "@/pages/children/index";
import ChildForm from "@/pages/children/form";
import RoutinesList from "@/pages/routines/index";
import RoutineGenerate from "@/pages/routines/generate";
import RoutineDetail from "@/pages/routines/detail";
import BehaviorTracker from "@/pages/behavior/index";
import ParentProfile from "@/pages/parent-profile";
import BabysittersPage from "@/pages/babysitters/index";
import AssistantPage from "@/pages/assistant";
import ProgressPage from "@/pages/progress";
import ParentingHub from "@/pages/parenting-hub";
import KidsControlCenterPage from "@/pages/kids-control-center";
import StudyPage from "@/pages/study";
import EventPrepPage from "@/pages/event-prep";
import SchoolMorningFlowPage from "@/pages/school-morning-flow";
import AmyCoachPage from "@/pages/ai-coach";
import AmyCoachProgressPage from "@/pages/ai-coach-progress";
import AudioLessonsPage from "@/pages/audio-lessons";
import GamesPage from "@/pages/games";
import OnboardingPage from "@/pages/onboarding";
import PricingPage from "@/pages/pricing";
import ReferralsPage from "@/pages/referrals";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import { ReferralAttributionBridge } from "@/components/referral-attribution-bridge";
import { PaywallProvider } from "@/contexts/paywall-context";
import { PaywallModal } from "@/components/paywall-modal";
import { SubscriptionEventBridge } from "@/components/subscription-event-bridge";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function useOnboardingStatus() {
  const { isSignedIn } = useAuth();
  const authFetch = useAuthFetch();
  const localDone = localStorage.getItem("onboardingComplete") === "true";
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
    initialData: localDone ? { onboardingComplete: true, profileComplete: false } : undefined,
    initialDataUpdatedAt: 0,
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

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <PaywallProvider>
            <FirebaseAuthBootstrap />
            <QueryClientCacheInvalidator />
            <ReferralAttributionBridge />
            <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/privacy" component={PrivacyPolicyPage} />
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
          <Route component={NotFound} />
            </Switch>
            <PaywallModal />
            <SubscriptionEventBridge />
            <Toaster />
          </PaywallProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <FirebaseAuthProvider>
      <WouterRouter base={basePath}>
        <AppRoutes />
      </WouterRouter>
    </FirebaseAuthProvider>
  );
}

export default App;
