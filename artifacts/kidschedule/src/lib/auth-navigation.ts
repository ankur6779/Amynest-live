import { spaNavigateAfterSignIn } from "@/lib/auth-native-navigation";
import { isNativeAmyNestShell } from "@/lib/native-shell";

type AuthNavigator = (path: string) => void;

let registeredNavigator: AuthNavigator | null = null;

/** Registered by AuthNavigationBridge (wouter setLocation on native). */
export function registerAuthNavigator(navigator: AuthNavigator | null): void {
  registeredNavigator = navigator;
}

/** Post-sign-in navigation — prefers wouter on Capacitor, then SPA pushState. */
export function navigateAfterAuth(path: string): void {
  if (typeof window === "undefined") return;
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (registeredNavigator) {
    registeredNavigator(normalized);
    return;
  }

  if (isNativeAmyNestShell()) {
    spaNavigateAfterSignIn(normalized);
    return;
  }

  window.location.assign(`${window.location.origin}${normalized}`);
}
