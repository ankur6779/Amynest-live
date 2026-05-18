import { FirebaseAuthProvider, useAuth } from "@/lib/firebase-auth";
import * as WebBrowser from "expo-web-browser";
import { loadTutorialStatus, subscribeTutorialStatus, getTutorialStatus } from "@/utils/tutorialState";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { API_BASE_URL } from "@/constants/api";
import { ActivityIndicator, LogBox, StyleSheet, View } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";

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
import { useNotificationDeepLink } from "@/hooks/useNotificationDeepLink";
import { isSetupComplete, useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import "@/i18n";
import { brand } from "@/constants/colors";
import { initCrashReporter } from "@/utils/crashReporter";
import { DebugProvider } from "@/contexts/DebugContext";
import { DebugPanel } from "@/components/DebugPanel";
import { OfflineScreen } from "@/components/OfflineScreen";
import { useNetworkStore, selectIsOnline } from "@/store/useNetworkStore";
import NetInfo from "@react-native-community/netinfo";
SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

// Suppress known-benign React Native / Expo warnings that clutter Android
// Studio Logcat and the yellow-box overlay in dev builds. Each entry is
// accompanied by a comment explaining why it is safe to suppress.
LogBox.ignoreLogs([
  // Fires when a native-driven animation finishes after the JS listener
  // was removed on unmount — harmless timing issue, not a bug in our code.
  "Sending `onAnimatedValueUpdate` with no listeners registered.",
  // React Navigation serialises route params; non-serialisable values are
  // fine at runtime and only a problem if you need to persist nav state.
  "Non-serializable values were found in the navigation state",
  // Reanimated shared-value updates that arrive after a component unmounts.
  "Tried to synchronously call",
  // Expo Router internal warning during pre-render pass — not actionable.
  "Warning: An update to",
  // VirtualizedList inside ScrollView — layout-only, not a crash risk.
  "VirtualizedLists should never be nested inside plain ScrollViews",
  // Expo Router type-check warning in dev for optional catch-all routes.
  "No route named",
  // Expo AV / Audio session warnings on simulators that have no audio HW.
  "AVAudioSession",
  // expo-notifications remote push not supported in Expo Go (SDK 53+).
  // Remote push works in development builds; this warning is expected in Expo Go.
  "expo-notifications: Android Push notifications",
  "expo-notifications: remote notifications",
]);

initCrashReporter();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

setBaseUrl(API_BASE_URL);

type TutorialStatus = "checking" | "needed" | "done";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [tutorialStatus, setTutorialStatus] = useState<TutorialStatus>(() => getTutorialStatus());
  const {
    data: setupData,
    isLoading: setupLoading,
    isFetching: setupFetching,
    isError: setupError,
    refetch: refetchSetup,
  } = useOnboardingStatus(isSignedIn && isLoaded);

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
  // Listen for notification taps and deep-link into the right screen
  useNotificationDeepLink();

  // Hidden component — captures `?ref=CODE` from deep links and submits to API.
  // Rendering inline keeps it inside the QueryClient + ClerkProvider tree.

  const setupComplete = isSetupComplete(setupData);
  const setupPending =
    isSignedIn && setupLoading && setupData === undefined && !setupError;

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

    if (setupPending) return;

    if (setupError) {
      if (!inOnboarding && !inAuth && !inWelcome) {
        void refetchSetup();
      }
      return;
    }

    if (!setupComplete) {
      if (inTabsGroup && setupFetching) return;
      if (!inOnboarding) {
        router.replace("/onboarding");
      }
      return;
    }

    if (inAuth || inOnboarding || inWelcome) {
      router.replace("/(tabs)");
    }
  }, [
    isLoaded,
    isSignedIn,
    segments,
    setupComplete,
    setupPending,
    setupError,
    setupFetching,
    tutorialStatus,
    router,
    refetchSetup,
  ]);

  useEffect(() => {
    if (!isSignedIn) {
      queryClient.clear();
    }
  }, [isSignedIn]);

  const isCheckingOnboarding = setupPending;
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

/**
 * NetworkGateOverlay — full-screen overlay shown when the device is offline.
 *
 * Subscribes to the Zustand network store (already initialised by
 * useOfflineSyncBootstrap inside AuthGate). When `selectIsOnline` returns
 * false the overlay mounts; as soon as NetInfo reports connectivity restored
 * the overlay unmounts automatically — no manual action needed.
 *
 * The "Reconnect" button fires a manual NetInfo.refresh() so the user gets
 * immediate feedback rather than waiting for the next listener tick.
 */
function NetworkGateOverlay() {
  const isOnline      = useNetworkStore(selectIsOnline);
  const initialized   = useNetworkStore((s) => s.initialized);
  const setFromNetInfo = useNetworkStore((s) => s.setFromNetInfo);

  const handleRetry = () => {
    NetInfo.refresh().then((state) => setFromNetInfo(state)).catch(() => {});
  };

  if (!initialized || isOnline) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <OfflineScreen onRetry={handleRetry} />
    </View>
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
      <Stack.Screen name="games"           options={{ headerShown: false }} />
      <Stack.Screen name="spelling"        options={{ headerShown: false }} />
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
      <Stack.Screen name="amy-ai" options={{ headerShown: false }} />
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

  // Load Inter + Ionicons fonts before rendering; keeps native splash visible
  // until fonts are ready so users never see bare Unicode glyphs.
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Ionicons glyph font — must be loaded explicitly in Expo Go (SDK 53+).
    // Without this, icon code points render as CJK characters on Android.
    ...Ionicons.font,
  });

  // Hide the native splash only after fonts are ready.
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <FirebaseAuthProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <ProgressProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <DebugProvider>
                    <AuthGate>
                      <RootLayoutNav />
                      <DebugPanel />
                    </AuthGate>
                    </DebugProvider>
                  </KeyboardProvider>
                  {/* Offline overlay — sits above everything, auto-hides on reconnect */}
                  <NetworkGateOverlay />
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
