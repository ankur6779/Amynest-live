import { navigateAfterAuth } from "@/lib/auth-navigation";
import { spaNavigateAfterSignIn } from "@/lib/auth-native-navigation";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { isTodayHomeV1Enabled } from "@/lib/today-home/feature-flags";

/**
 * Post-onboarding destination.
 * Today Home V1: land on Home Hero first (Begin → routine). Emotional film continuity.
 * Kill switch VITE_FF_TODAY_HOME_V1=0: legacy direct /routines/generate.
 * Routine generate remains available via Home Begin + ACTIVATION_ROUTINE_GENERATE_HREF.
 */
export const POST_ONBOARDING_ACTIVATION_PATH = (
  isTodayHomeV1Enabled() ? "/dashboard" : "/routines/generate"
) as "/dashboard" | "/routines/generate";

/** Avoid full document reload on native WebView — prevents onboarding loop after finish. */
export function navigateAfterOnboardingComplete(path: string): void {
  if (typeof window === "undefined") return;
  const normalized = path.startsWith("/") ? path : `/${path}`;

  console.info("[onboarding-nav] navigating after complete", {
    path: normalized,
    isNative: isNativeAmyNestShell(),
    ts: Date.now(),
  });

  if (isNativeAmyNestShell()) {
    // spaNavigateAfterSignIn fires a PopStateEvent (wouter listens to it) and
    // pushes to history. navigateAfterAuth calls the registered Wouter setLocation.
    // Both run to ensure at least one succeeds regardless of ordering issues.
    spaNavigateAfterSignIn(normalized);
    navigateAfterAuth(normalized);
    return;
  }

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  window.location.assign(`${window.location.origin}${base}${normalized}`);
}
