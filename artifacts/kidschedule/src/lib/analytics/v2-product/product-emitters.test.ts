import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getActiveV2AnalyticsContext,
  getV2AnalyticsDebugBuffer,
  resetActiveV2AnalyticsContextForTests,
  resetV2AnalyticsBusForTests,
  setV2AnalyticsDebugEnabled,
} from "@/lib/analytics/v2-core";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  clearGuestSession,
  ensureGuestSession,
} from "@/v2/guest";
import {
  clearCohortDay0ForTests,
  clearDoorStartedForTests,
  clearPracticeLogForTests,
  clearProductAnalyticsIdentityForTests,
  emitV2D1ReturnedIfEligible,
  emitV2MissionCompleted,
  emitV2MissionStarted,
  emitV2WowCompletedIfEligible,
  ensureCohortDay0,
  ensureProductAnalyticsReady,
  markFrontDoorStarted,
  PRODUCT_JOURNEY_ID,
  PRODUCT_JOURNEY_VERSION,
  resetProductAnalyticsBootstrapForTests,
  resolveAnonymousId,
} from "./index";

const ONCE_PREFIX = "amynest.v2.analytics.once.";

function clearOnceKeys(): void {
  if (typeof localStorage === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(ONCE_PREFIX)) toRemove.push(k);
  }
  for (const k of toRemove) localStorage.removeItem(k);
}

function enableAnalyticsFlag(): void {
  vi.stubEnv(v2BooleanFlagEnvKey("analytics_v2_core"), "1");
  vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
}

function resetAll(): void {
  vi.unstubAllEnvs();
  resetProductAnalyticsBootstrapForTests();
  resetV2AnalyticsBusForTests();
  resetActiveV2AnalyticsContextForTests();
  clearOnceKeys();
  clearDoorStartedForTests();
  clearCohortDay0ForTests();
  clearPracticeLogForTests();
  clearProductAnalyticsIdentityForTests();
  clearGuestSession();
  setV2AnalyticsDebugEnabled(false);
}

describe("Product analytics emitters (3C-4)", () => {
  beforeEach(() => {
    resetAll();
    enableAnalyticsFlag();
    setV2AnalyticsDebugEnabled(true);
  });

  afterEach(() => {
    resetAll();
  });

  it("mission started — once then duplicate → already_tracked", () => {
    ensureProductAnalyticsReady({ guestId: "guest-a" });
    const first = emitV2MissionStarted({
      missionId: "speech_preschool_name_it",
      dateKey: "2026-08-01",
    });
    expect(first).toMatchObject({ ok: true, status: "tracked" });

    const second = emitV2MissionStarted({
      missionId: "speech_preschool_name_it",
      dateKey: "2026-08-01",
    });
    expect(second).toMatchObject({ ok: true, status: "already_tracked" });
  });

  it("mission completed — once / duplicate", () => {
    ensureProductAnalyticsReady({ guestId: "guest-a" });
    const a = emitV2MissionCompleted({
      missionId: "speech_preschool_name_it",
      dateKey: "2026-08-01",
      evaluateNorthStars: false,
    });
    expect(a.mission).toMatchObject({ ok: true, status: "tracked" });

    const b = emitV2MissionCompleted({
      missionId: "speech_preschool_name_it",
      dateKey: "2026-08-01",
      evaluateNorthStars: false,
    });
    expect(b.mission).toMatchObject({ ok: true, status: "already_tracked" });
  });

  it("refresh / restart — durable onceKey survives bus reinstall", () => {
    ensureProductAnalyticsReady({ guestId: "guest-refresh" });
    const first = emitV2MissionStarted({
      missionId: "m1",
      dateKey: "2026-08-01",
    });
    expect(first.status).toBe("tracked");

    // Simulate process restart: tear down bus, keep localStorage.
    resetProductAnalyticsBootstrapForTests();
    resetV2AnalyticsBusForTests();
    resetActiveV2AnalyticsContextForTests();

    ensureProductAnalyticsReady({ guestId: "guest-refresh" });
    const again = emitV2MissionStarted({
      missionId: "m1",
      dateKey: "2026-08-01",
    });
    expect(again).toMatchObject({ ok: true, status: "already_tracked" });
  });

  it("guest — anonymousId continuity from guestId + journey meta", () => {
    ensureGuestSession();
    const guest = ensureGuestSession();
    expect(guest?.guestId).toBeTruthy();
    const ctx = ensureProductAnalyticsReady({ guestId: guest!.guestId });
    expect(ctx?.anonymousId).toBe(guest!.guestId);
    expect(ctx?.accountId).toBeNull();
    expect(ctx?.journeyId).toBe(PRODUCT_JOURNEY_ID);
    expect(ctx?.journeyVersion).toBe(PRODUCT_JOURNEY_VERSION);
    expect(resolveAnonymousId()).toBe(guest!.guestId);
  });

  it("account — accountId set without replacing anonymousId", () => {
    ensureGuestSession();
    const guestId = ensureGuestSession()!.guestId;
    const ctx = ensureProductAnalyticsReady({
      guestId,
      accountId: "uid_parent_1",
    });
    expect(ctx?.anonymousId).toBe(guestId);
    expect(ctx?.accountId).toBe("uid_parent_1");
    expect(getActiveV2AnalyticsContext()?.anonymousId).toBe(guestId);
  });

  it("WOW — emits once within 90s of Front Door start", () => {
    ensureProductAnalyticsReady({ guestId: "wow-guest" });
    const start = new Date("2026-08-01T10:00:00.000Z");
    markFrontDoorStarted(start);
    const ok = emitV2WowCompletedIfEligible({
      practiceId: "speech_preschool_name_it",
      ageBand: "preschool_3_5",
      worryId: "speech_talking",
      now: new Date("2026-08-01T10:00:45.000Z"),
    });
    expect(ok).toMatchObject({ ok: true, status: "tracked" });

    const dup = emitV2WowCompletedIfEligible({
      practiceId: "speech_preschool_name_it",
      now: new Date("2026-08-01T10:00:50.000Z"),
    });
    expect(dup).toMatchObject({ ok: true, status: "already_tracked" });
  });

  it("WOW — rejects outside 90s window", () => {
    ensureProductAnalyticsReady({ guestId: "wow-late" });
    markFrontDoorStarted(new Date("2026-08-01T10:00:00.000Z"));
    const late = emitV2WowCompletedIfEligible({
      practiceId: "p1",
      now: new Date("2026-08-01T10:02:00.000Z"),
    });
    expect(late.ok).toBe(false);
  });

  it("D1 — emits on cohort_day0 + 1 only", () => {
    ensureProductAnalyticsReady({ guestId: "d1-guest" });
    // Force cohort day0
    localStorage.setItem("amynest.v2.analytics.cohort_day0", "2026-08-01");
    const miss = emitV2D1ReturnedIfEligible({
      now: new Date("2026-08-01T12:00:00"),
    });
    expect(miss.ok).toBe(false);

    const hit = emitV2D1ReturnedIfEligible({
      now: new Date("2026-08-02T09:00:00"),
    });
    expect(hit).toMatchObject({
      ok: true,
      status: "tracked",
      eventName: "v2_d1_returned",
    });

    const dup = emitV2D1ReturnedIfEligible({
      now: new Date("2026-08-02T18:00:00"),
    });
    expect(dup).toMatchObject({ ok: true, status: "already_tracked" });
  });

  it("practice day3 — fires after ≥2 completions in window", () => {
    ensureProductAnalyticsReady({ guestId: "day3-guest" });
    localStorage.setItem("amynest.v2.analytics.cohort_day0", "2026-08-01");

    const first = emitV2MissionCompleted({
      missionId: "m1",
      dateKey: "2026-08-01",
      now: new Date("2026-08-01T10:00:00"),
      evaluateNorthStars: true,
    });
    expect(first.mission.status).toBe("tracked");
    expect(first.practiceDay3?.ok).toBe(false);

    const second = emitV2MissionCompleted({
      missionId: "m2",
      dateKey: "2026-08-02",
      now: new Date("2026-08-02T10:00:00"),
      evaluateNorthStars: true,
    });
    expect(second.mission.status).toBe("tracked");
    expect(second.practiceDay3).toMatchObject({
      ok: true,
      status: "tracked",
      eventName: "v2_practice_day3",
    });
  });

  it("regression — flag off rejects without throwing; no debug emission path required", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("analytics_v2_core"), "0");
    resetProductAnalyticsBootstrapForTests();
    resetV2AnalyticsBusForTests();
    ensureProductAnalyticsReady({ guestId: "flag-off" });
    const r = emitV2MissionStarted({
      missionId: "m1",
      dateKey: "2026-08-01",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("flag_disabled");
  });

  it("no child PII keys in tracked debug record", () => {
    ensureProductAnalyticsReady({ guestId: "pii-guest" });
    emitV2MissionStarted({
      missionId: "m1",
      dateKey: "2026-08-01",
      ageBand: "preschool_3_5",
      worryId: "speech_talking",
    });
    const buf = getV2AnalyticsDebugBuffer();
    const tracked = buf.find((e) => e.result.status === "tracked");
    expect(tracked?.record).toBeTruthy();
    const payload = tracked!.record!.payload;
    expect(payload).not.toHaveProperty("name");
    expect(payload).not.toHaveProperty("child_name");
    expect(payload).not.toHaveProperty("childName");
  });

  it("ensureCohortDay0 is stable across calls", () => {
    const a = ensureCohortDay0(new Date("2026-08-01T08:00:00"));
    const b = ensureCohortDay0(new Date("2026-08-05T08:00:00"));
    expect(a).toBe(b);
  });

  it("ordering regression — Mission Started → Completed → WOW", () => {
    ensureProductAnalyticsReady({ guestId: "order-guest" });
    const t0 = new Date("2026-08-01T10:00:00.000Z");
    markFrontDoorStarted(t0);

    emitV2MissionStarted({
      missionId: "speech_preschool_name_it",
      dateKey: "2026-08-01",
      now: new Date("2026-08-01T10:00:10.000Z"),
    });
    emitV2MissionCompleted({
      missionId: "speech_preschool_name_it",
      dateKey: "2026-08-01",
      now: new Date("2026-08-01T10:00:20.000Z"),
      evaluateNorthStars: true,
    });

    const tracked = getV2AnalyticsDebugBuffer()
      .filter((e) => e.result.ok && e.result.status === "tracked")
      .map((e) => e.result.eventName);

    const iStart = tracked.indexOf("v2_mission_started");
    const iDone = tracked.indexOf("v2_mission_completed");
    const iWow = tracked.indexOf("v2_wow_completed");

    expect(iStart).toBeGreaterThanOrEqual(0);
    expect(iDone).toBeGreaterThanOrEqual(0);
    expect(iWow).toBeGreaterThanOrEqual(0);
    expect(iStart).toBeLessThan(iDone);
    expect(iDone).toBeLessThan(iWow);
  });
});
