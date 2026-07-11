import { useEffect } from "react";
import { useLocation } from "wouter";
import { trackStartupFunnel } from "@/lib/startup-funnel";

/**
 * Emits login_screen_visible / signup_screen_visible once per session.
 * Mounted inside AppCore router — no UI changes.
 */
export function StartupFunnelScreenTracker(): null {
  const [location] = useLocation();

  useEffect(() => {
    if (location === "/sign-in" || location === "/login") {
      trackStartupFunnel("login_screen_visible");
    }
    if (location === "/sign-up") {
      trackStartupFunnel("signup_screen_visible");
      trackStartupFunnel("signup_started");
    }
  }, [location]);

  return null;
}
