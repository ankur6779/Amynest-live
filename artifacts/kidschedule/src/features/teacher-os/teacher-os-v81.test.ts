import { describe, expect, it, beforeEach } from "vitest";
import {
  shouldShowTeacherOsOnboarding,
  completeOnboardingStep,
  skipOnboarding,
  getOnboardingProgress,
  onboardingPercentComplete,
  resetOnboarding,
  trackProductEvent,
  getProductEvents,
  clearProductEvents,
  getSessionCount,
  startProductSession,
  getActiveFeatureTip,
  dismissFeatureTip,
  buildReleaseHealthReport,
  buildQualityDashboard,
  recordSatisfaction,
  shouldShowSatisfactionPrompt,
  isPilotModeEnabled,
  setPilotModeEnabled,
  exportPilotDiagnostics,
  resetPilotData,
} from "@workspace/teacher-os";

describe("Teacher OS v8.1 pilot sprint", () => {
  beforeEach(() => {
    clearProductEvents();
    resetOnboarding();
    resetPilotData();
    setPilotModeEnabled(false);
  });

  it("tracks onboarding progress", () => {
    expect(shouldShowTeacherOsOnboarding()).toBe(true);
    completeOnboardingStep("create_first_lesson");
    expect(getOnboardingProgress().completed).toContain("create_first_lesson");
    expect(onboardingPercentComplete()).toBeGreaterThan(0);
    skipOnboarding();
    expect(shouldShowTeacherOsOnboarding()).toBe(false);
  });

  it("records product analytics events", () => {
    startProductSession();
    trackProductEvent("worksheet_generate_done", { qualityScore: 82, module: "studio" });
    trackProductEvent("export_pdf", { module: "studio" });
    const events = getProductEvents();
    expect(events.some((e) => e.type === "worksheet_generate_done")).toBe(true);
    expect(events.some((e) => e.type === "export_pdf")).toBe(true);
    expect(getSessionCount()).toBeGreaterThanOrEqual(1);
  });

  it("builds quality dashboard from events", () => {
    trackProductEvent("teaching_pack");
    trackProductEvent("worksheet_generate_done", { qualityScore: 90 });
    trackProductEvent("export_pdf");
    const q = buildQualityDashboard();
    expect(q.mostUsedFeatures.length).toBeGreaterThan(0);
    expect(q.exportRate).toBeGreaterThanOrEqual(0);
  });

  it("builds release health report", () => {
    trackProductEvent("session_start");
    trackProductEvent("api_failure");
    trackProductEvent("offline_fallback");
    const h = buildReleaseHealthReport();
    expect(h.apiFailures).toBeGreaterThanOrEqual(1);
    expect(h.offlineFallbacks).toBeGreaterThanOrEqual(1);
    expect(h.crashFreeRate).toBeGreaterThanOrEqual(0);
  });

  it("handles feature discovery tips", () => {
    for (let i = 0; i < 3; i++) {
      startProductSession();
      trackProductEvent("session_start");
    }
    const tip = getActiveFeatureTip();
    if (tip) {
      dismissFeatureTip(tip.id);
      expect(getActiveFeatureTip()?.id).not.toBe(tip.id);
    }
  });

  it("records satisfaction with cooldown", () => {
    expect(shouldShowSatisfactionPrompt("worksheet:sea")).toBe(true);
    recordSatisfaction(5, "worksheet:sea", "Great!");
    expect(shouldShowSatisfactionPrompt("worksheet:sea")).toBe(false);
  });

  it("exports pilot diagnostics bundle", () => {
    setPilotModeEnabled(true);
    trackProductEvent("lesson_create_done");
    const bundle = exportPilotDiagnostics();
    expect(bundle.pilotMode).toBe(true);
    expect(bundle.events.length).toBeGreaterThan(0);
    expect(bundle.health).toBeDefined();
    expect(bundle.quality).toBeDefined();
  });

  it("resets pilot data", () => {
    trackProductEvent("worksheet_generate_done");
    resetPilotData();
    expect(getProductEvents().length).toBe(0);
    expect(shouldShowTeacherOsOnboarding()).toBe(true);
  });
});
