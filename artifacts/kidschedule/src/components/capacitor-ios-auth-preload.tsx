import { useEffect } from "react";
import { isCapacitorIosShell } from "@/lib/device-lite";

/** Warm sign-in + native Apple auth modules on Capacitor iOS before route navigation. */
export function CapacitorIosAuthPreload() {
  useEffect(() => {
    if (!isCapacitorIosShell()) return;
    void import("@/pages/sign-in");
    void import("@/lib/apple-auth");
    void import("@capacitor-community/apple-sign-in");
  }, []);
  return null;
}
