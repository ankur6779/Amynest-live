import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  childAgeGroupLabel,
  resetChildJourneyTelemetryForTests,
  trackChildJourneyComplete,
  trackChildJourneyView,
} from "./child-journey-telemetry";
import { clearStartupFunnelQueueForTests, getStartupFunnelQueueSize } from "@/lib/startup-funnel/queue";

vi.mock("@/lib/firebase", () => ({
  getFirebaseAuth: () => ({
    currentUser: { providerData: [{ providerId: "google.com" }] },
  }),
}));

vi.mock("@/lib/startup-funnel/context", () => ({
  getStartupFunnelContext: () => ({
    session_id: "session-test-12345678",
    install_id: "install-test-12345678",
    device_id: "device-test-12345678",
    device_model: "Pixel 8",
    android_version: "14",
    network_type: "wifi",
    platform: "android",
  }),
}));

vi.mock("@/lib/startup-funnel/queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/startup-funnel/queue")>();
  return actual;
});

describe("child journey telemetry", () => {
  beforeEach(() => {
    resetChildJourneyTelemetryForTests();
    clearStartupFunnelQueueForTests();
  });

  it("maps age bands for segmentation", () => {
    expect(childAgeGroupLabel(0, 4)).toBe("0_6_months");
    expect(childAgeGroupLabel(1, 0)).toBe("1_2_years");
    expect(childAgeGroupLabel(6, 0)).toBe("5_8_years");
  });

  it("enqueues view and complete events with auth_provider meta", () => {
    trackChildJourneyView("child-name", { childAgeYears: 4 });
    trackChildJourneyComplete("child-name", { childAgeYears: 4 });
    expect(getStartupFunnelQueueSize()).toBe(2);
  });
});
