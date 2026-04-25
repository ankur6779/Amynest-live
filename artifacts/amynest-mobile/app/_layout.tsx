import { FirebaseAuthProvider, useAuth } from "@/lib/firebase-auth";
import * as WebBrowser from "expo-web-browser";
import { loadTutorialStatus, subscribeTutorialStatus, getTutorialStatus } from "@/utils/tutorialState";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { API_BASE_URL } from "@/constants/api";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import PremiumSplash from "@/components/PremiumSplash";
import { ReferralAttributionBridge } from "@/components/ReferralAttributionBridge";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { useAppDataBootstrap } from "@/hooks/useAppData";
import { useOfflineSyncBootstrap } from "@/hooks/useOfflineSync";
import { useSubscriptionBootstrap } from "@/hooks/useSubscription";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import "@/i18n";
import { brand } from "@/constants/colors";
import { initCrashReporter } from "@/utils/crashReporter";

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();
initCrashReporter();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

setBaseUrl(API_BASE_URL);

type OnboardingStatus = "unknown" | "checking" | "complete" | "incomplete" | "error";
type TutorialStatus = "checking" | "needed" | "done";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>("unknown");
  const [tutorialStatus, setTutorialStatus] = useState<TutorialStatus>(() => getTutorialStatus());
  const checkInFlightRef = useRef(false);

  // First-launch tutorial: subscribe so completion (markTutorialSeen) immediately
  // updates the gate and AuthGate stops forcing /tutorial.
  useEffect(() => {
    const unsub = subscribeTutorialStatus(setTutorialStatus);
    if (getTutorialStatus() === "checking") {
      loadTutorialStatus().catch(() => {});
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (isSignedIn && getToken) {
      setAuthTokenGetter(() => getToken());
    }
  }, [isSignedIn, getToken]);

  // Bootstrap unified /api/app-data layer (cache hydrate + fetch + 5min auto-refresh)
  useAppDataBootstrap();
  // Bootstrap offline action queue + background sync on reconnect/foreground
  useOfflineSyncBootstrap();
  // Bootstrap freemium subscription + entitlements
  useSubscriptionBootstrap();
  // Register Expo push token with backend (best-effort, no-ops on web/sim)
  usePushRegistration();

  // Hidden component — captures `?ref=CODE` from deep links and submits to API.
  // Rendering inline keeps it inside the QueryClient + ClerkProvider tree.

  const checkOnboardingStatus = useCallback(async (): Promise<"complete" | "incomplete"> => {
    if (checkInFlightRef.current || !getToken) return "incomplete";
    checkInFlightRef.current = true;
    setOnboardingStatus("checking");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/onboarding`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) {
        setOnboardingStatus("incomplete");
        return "incomplete";
      }
      const data = (await res.json()) as { onboardingComplete?: boolean };
      const result: "complete" | "incomplete" = data?.onboardingComplete === true ? "complete" : "incomplete";
      setOnboardingStatus(result);
      return result;
    } catch {
      setOnboardingStatus("error");
      return "incomplete";
    } finally {
      checkInFlightRef.current = false;
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (tutorialStatus === "checking") return;

    const inTutorial = (segments[0] as string) === "tutorial";

    // First-launch tutorial takes priority over every other route.
    if (tutorialStatus === "needed") {
      if (!inTutorial) router.replace("/tutorial" as never);
      return;
    }

    const inTabsGroup = segments[0] === "(tabs)";
    const inOnboarding = segments[0] === "onboarding";
    const inAuth = segments[0] === "sign-in" || segments[0] === "sign-up";
    const inWelcome = segments[0] === "welcome" || (segments.length as number) === 0;

    if (!isSignedIn) {
      if (!inAuth && !inWelcome && !inTutorial) router.replace("/welcome");
      return;
    }

    if (onboardingStatus === "unknown" || onboardingStatus === "error") {
      // Kick off the check — navigation is handled by the state-driven blocks
      // below once onboardingStatus settles to "complete" / "incomplete".
      // Do NOT call router.replace inside this .then(): the navigator (Stack)
      // may not be mounted yet because isAuthTransition hides children while
      // onboardingStatus is "unknown" / "checking". Navigating before the
      // navigator is mounted produces the "+not-found / This screen doesn't exist" error.
      checkOnboardingStatus().catch(() => {});
      return;
    }

    if (onboardingStatus === "checking") return;

    if (onboardingStatus === "incomplete") {
      if (inTabsGroup) {
        // Re-verify so a post-onboarding reload doesn't get stuck
        checkOnboardingStatus().catch(() => {});
      } else if (!inOnboarding) {
        router.replace("/onboarding");
      }
      return;
    }

    if (onboardingStatus === "complete") {
      if (inAuth || inOnboarding || inWelcome) {
        router.replace("/(tabs)");
      }
    }
  }, [isLoaded, isSignedIn, segments, onboardingStatus, tutorialStatus]);

  useEffect(() => {
    if (!isSignedIn) {
      queryClient.clear();
      setOnboardingStatus("unknown");
      checkInFlightRef.current = false;
    }
  }, [isSignedIn]);

  const isCheckingOnboarding = isSignedIn && (onboardingStatus === "unknown" || onboardingStatus === "checking");
  const isAuthTransition = !isLoaded || isCheckingOnboarding || tutorialStatus === "checking";

  const c = useColors();

  // Always render children so the Stack navigator stays mounted — unmounting it
  // and remounting after the onboarding check creates a race where router.replace()
  // fires before the navigator is ready, landing the user on the +not-found screen.
  // Instead, overlay a full-screen spinner on top while the check is in flight.
  return (
    <>
      {children}
      {isAuthTransition && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.background,
          }}
          pointerEvents="box-only"
        >
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      )}
    </>
  );
}

function RootLayoutNav() {
  const c = useColors();
  return (
    <>
    <ReferralAttributionBridge />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Screen name="tutorial" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="children/[id]"
        options={{
          headerShown: true,
          headerTitle: "Child Profile",
          headerBackTitle: "Back",
          headerTintColor: c.accent,
          headerStyle: { backgroundColor: c.background },
        }}
      />
      <Stack.Screen
        name="children/new"
        options={{
          headerShown: true,
          headerTitle: "Add Child",
          headerBackTitle: "Back",
          headerTintColor: c.accent,
          headerStyle: { backgroundColor: c.background },
        }}
      />
      <Stack.Screen
        name="routines/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="games"          options={{ headerShown: false }} />
      <Stack.Screen name="audio-lessons"  options={{ headerShown: false }} />
      <Stack.Screen
        name="referrals"
        options={{
          headerShown: true,
          headerTitle: "Invite & Earn",
          headerBackTitle: "Back",
          headerTintColor: c.accent,
          headerStyle: { backgroundColor: c.background },
        }}
      />
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
      <Stack.Screen name="kids-control-center" options={{ headerShown: false }} />
      <Stack.Screen name="nutrition" options={{ headerShown: false }} />
      <Stack.Screen name="coach/progress" options={{ headerShown: false }} />
      {__DEV__ && (
        <Stack.Screen
          name="dev/theme"
          options={{ headerShown: false }}
        />
      )}
    </Stack>
    </>
  );
}

export default function RootLayout() {
  const [splashVisible, setSplashVisible] = useState(true);

  // Hide the native splash on first mount so our premium animated splash takes over.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <FirebaseAuthProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <ProgressProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <AuthGate>
                      <RootLayoutNav />
                    </AuthGate>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </ProgressProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
      {splashVisible && <PremiumSplash onFinish={() => setSplashVisible(false)} />}
    </FirebaseAuthProvider>
  );
}
