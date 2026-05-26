import { useEffect } from "react";
import { useLocation } from "wouter";
import { registerAuthNavigator } from "@/lib/auth-navigation";
import { isNativeAmyNestShell } from "@/lib/native-shell";

/** Wires wouter navigation into post-sign-in helpers (Capacitor iOS/Android). */
export function AuthNavigationBridge() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isNativeAmyNestShell()) {
      registerAuthNavigator(null);
      return;
    }

    registerAuthNavigator((path) => {
      setLocation(path);
    });

    return () => registerAuthNavigator(null);
  }, [setLocation]);

  return null;
}
