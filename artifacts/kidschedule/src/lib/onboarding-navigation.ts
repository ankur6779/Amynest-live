import { navigateAfterAuth } from "@/lib/auth-navigation";
import { spaNavigateAfterSignIn } from "@/lib/auth-native-navigation";
import { isNativeAmyNestShell } from "@/lib/native-shell";

/** Avoid full document reload on native WebView — prevents onboarding loop after finish. */
export function navigateAfterOnboardingComplete(path: string): void {
  if (typeof window === "undefined") return;
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (isNativeAmyNestShell()) {
    spaNavigateAfterSignIn(normalized);
    navigateAfterAuth(normalized);
    return;
  }

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  window.location.assign(`${window.location.origin}${base}${normalized}`);
}
