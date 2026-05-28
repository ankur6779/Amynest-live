import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  registerNavigationOrchestrator,
  resetNavigationOrchestratorForTests,
  safeNavigate,
  setNavigationBootstrapComplete,
  unregisterNavigationOrchestrator,
} from "./navigation-orchestrator";

describe("navigation-orchestrator", () => {
  beforeEach(() => {
    resetNavigationOrchestratorForTests();
  });

  it("queues navigation until bootstrap completes", () => {
    const navigate = vi.fn();
    registerNavigationOrchestrator(navigate, "/dashboard");

    safeNavigate("/dashboard", "/routines", { source: "test" });
    expect(navigate).not.toHaveBeenCalled();

    setNavigationBootstrapComplete(true);
    expect(navigate).toHaveBeenCalledWith("/routines", { replace: true });
  });

  it("skips duplicate route navigation", () => {
    const navigate = vi.fn();
    registerNavigationOrchestrator(navigate, "/routines");
    setNavigationBootstrapComplete(true);

    const ok = safeNavigate("/routines", "/routines", { source: "test" });
    expect(ok).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("unregisters cleanly", () => {
    const navigate = vi.fn();
    registerNavigationOrchestrator(navigate, "/");
    unregisterNavigationOrchestrator();
    setNavigationBootstrapComplete(true);
    safeNavigate("/", "/dashboard", { source: "test" });
    expect(navigate).not.toHaveBeenCalled();
  });
});
