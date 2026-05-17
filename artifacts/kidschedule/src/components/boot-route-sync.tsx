import { useEffect } from "react";
import { useLocation } from "wouter";
import { syncBootRoute } from "@/lib/boot-store";

/** Keeps boot debug overlay route in sync with wouter navigations. */
export function BootRouteSync() {
  const [location] = useLocation();
  useEffect(() => {
    syncBootRoute(location);
  }, [location]);
  return null;
}
