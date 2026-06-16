import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { isSetupComplete, readOnboardingCache } from "@/lib/setup-status";
import {
  exitPreSignupCampaign,
  onPreSignupLoginCompleted,
  onPreSignupSignupCompleted,
  resolvePreSignupAudienceInput,
  syncPreSignupCampaign,
} from "@/lib/pre-signup-reengagement/orchestrator";
import { consumePreSignupSignupFlowActive, readCampaignState } from "@/lib/pre-signup-reengagement/storage";
import { PRE_SIGNUP_SEGMENT } from "@/lib/pre-signup-reengagement/types";
import {
  canUsePreSignupLocalNotifications,
  initPreSignupLocalNotificationListeners,
  wireAndroidPreSignupTapMetaHandler,
} from "@/lib/pre-signup-reengagement/local-notifications";
import { isAmyNestWrapper } from "@/lib/native-push-bridge";

/**
 * Manages the PRE_SIGNUP_USER local notification campaign on native shells.
 */
export function PreSignupReengagementOrchestrator() {
  const { isLoaded, isSignedIn, authStatus } = useAuth();
  const lastSyncKeyRef = useRef<string | null>(null);
  const wasSignedOutRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!canUsePreSignupLocalNotifications() || !isAmyNestWrapper()) return undefined;
    if (!isLoaded || authStatus === "loading") return undefined;

    wireAndroidPreSignupTapMetaHandler();
    void initPreSignupLocalNotificationListeners();

    if (isSignedIn && wasSignedOutRef.current) {
      wasSignedOutRef.current = false;
      const hadPreSignupCampaign =
        readCampaignState()?.segment === PRE_SIGNUP_SEGMENT;
      const isSignupFlow = consumePreSignupSignupFlowActive();
      if (hadPreSignupCampaign && isSignupFlow) {
        onPreSignupSignupCompleted();
      } else if (hadPreSignupCampaign) {
        onPreSignupLoginCompleted();
      } else {
        void exitPreSignupCampaign("login");
      }
      return undefined;
    }

    if (!isSignedIn) {
      wasSignedOutRef.current = true;
    }

    const signupCompleted = isSetupComplete(readOnboardingCache());

    let cancelled = false;

    void (async () => {
      const audience = await resolvePreSignupAudienceInput({
        isAuthenticated: isSignedIn,
        signupCompleted,
      });

      if (audience.isAuthenticated || audience.signupCompleted) {
        await exitPreSignupCampaign(audience.isAuthenticated ? "login" : "signup");
        return;
      }

      const syncKey = `${audience.notificationsGranted}:${audience.notificationsEnabled}:${signupCompleted}`;
      if (lastSyncKeyRef.current === syncKey) return;
      lastSyncKeyRef.current = syncKey;

      if (cancelled) return;
      await syncPreSignupCampaign(audience);
    })();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (isSignedIn) return;
      void resolvePreSignupAudienceInput({ isAuthenticated: false }).then((audience) =>
        syncPreSignupCampaign(audience),
      );
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("amynest-push-permission", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("amynest-push-permission", onVisible);
    };
  }, [isLoaded, isSignedIn, authStatus]);

  return null;
}
