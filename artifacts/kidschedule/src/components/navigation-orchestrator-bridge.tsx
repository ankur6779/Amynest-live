import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  registerNavigationOrchestrator,
  syncOrchestratorLocation,
  unregisterNavigationOrchestrator,
} from "@/lib/navigation-orchestrator";

/** Wires wouter into the navigation orchestrator (single navigate authority). */
export function NavigationOrchestratorBridge() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    registerNavigationOrchestrator(navigate, location);
    return () => unregisterNavigationOrchestrator();
  }, [navigate]);

  useEffect(() => {
    syncOrchestratorLocation(location);
  }, [location]);

  return null;
}
