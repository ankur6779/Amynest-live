import { navigateAfterAuth } from "@/lib/auth-navigation";
import { spaNavigateAfterSignIn } from "@/lib/auth-native-navigation";
import { isNativeAmyNestShell } from "@/lib/native-shell";

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
