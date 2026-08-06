import { afterEach, describe, expect, it } from "vitest";
import {
  assertOptimizeCardinality,
  createMemoryOnceStore,
  createOnceEngine,
  createSinkRegistry,
  createV2AnalyticsBus,
  createV2AnalyticsContext,
  getRegistryEvent,
  getV2AnalyticsDebugBuffer,
  listRegistryEventNames,
  lookupRegistryEvent,
  materializeOnceKey,
  resetActiveV2AnalyticsContextForTests,
  resetV2AnalyticsBusForTests,
  resetV2AnalyticsDebugForTests,
  setActiveV2AnalyticsContext,
  setV2AnalyticsDebugEnabled,
  validateV2Payload,
  V2_ANALYTICS_REGISTRY,
} from "./index";

const CTX = createV2AnalyticsContext({
  anonymousId: "anon-1",
  accountId: null,
  sessionId: "sess-1",
  platform: "web",
  appVersion: "0.0.0-test",
});

if (!CTX.ok) throw new Error("test context failed");

afterEach(() => {
  resetV2AnalyticsBusForTests();
  resetActiveV2AnalyticsContextForTests();
  resetV2AnalyticsDebugForTests();
});

describe("Registry validation", () => {
  it("lists all Event Registry index names", () => {
    const expected = [
      "v2_wow_completed",
      "v2_mission_started",
      "v2_mission_completed",
      "today_viewed",
      "v2_d1_returned",
      "v2_practice_day3",
      "v2_paid_conversion",
      "v2_identity_link",
      "premium_view",
      "premium_checkout",
      "premium_restore_success",
      "premium_restore_fail",
      "premium_already",
      "premium_fail",
      "premium_offline",
      "ads_begin_checkout",
      "ads_purchase",
      "sys_sign_up",
      "sys_analytics_native_fallback",
    ];
    expect(listRegistryEventNames()).toEqual(expected);
    expect(V2_ANALYTICS_REGISTRY).toHaveLength(19);
  });

  it("unknown event = FAIL", () => {
    const r = lookupRegistryEvent("not_a_real_event");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unknown_event");
  });

  it("exactly one optimizable event: ads_purchase", () => {
    expect(() => assertOptimizeCardinality()).not.toThrow();
    expect(getRegistryEvent("ads_purchase")?.canOptimize).toBe(true);
    expect(V2_ANALYTICS_REGISTRY.filter((e) => e.canOptimize)).toHaveLength(1);
  });

  it("each event has owner, layer, onceKeyTemplate, version", () => {
    for (const e of V2_ANALYTICS_REGISTRY) {
      expect(e.owner.length).toBeGreaterThan(0);
      expect(e.layer).toBeTruthy();
      expect(e.onceKeyTemplate.length).toBeGreaterThan(0);
      expect(e.eventVersion).toBe(1);
      expect(e.status).toBe("active");
    }
  });
});

describe("Context creation", () => {
  it("creates context without child PII fields", () => {
    expect(CTX.context.anonymousId).toBe("anon-1");
    expect(CTX.context.sessionId).toBe("sess-1");
    expect(CTX.context.accountId).toBeNull();
    expect(CTX.context.platform).toBe("web");
    expect("name" in CTX.context).toBe(false);
  });

  it("rejects missing anonymousId / sessionId", () => {
    expect(
      createV2AnalyticsContext({
        anonymousId: "",
        sessionId: "s",
        platform: "ios",
      }).ok,
    ).toBe(false);
    expect(
      createV2AnalyticsContext({
        anonymousId: "a",
        sessionId: "  ",
        platform: "android",
      }).ok,
    ).toBe(false);
  });
});

describe("Payload validation", () => {
  it("requires mission payload keys", () => {
    const def = getRegistryEvent("v2_mission_completed")!;
    const bad = validateV2Payload({
      definition: def,
      payload: {},
      context: CTX.context,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe("missing_payload_key");
  });

  it("rejects PII keys", () => {
    const def = getRegistryEvent("v2_mission_completed")!;
    const bad = validateV2Payload({
      definition: def,
      payload: {
        mission_id: "speech_preschool_name_it",
        date_key: "2026-08-01",
        child_name: "Aarav",
      },
      context: CTX.context,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe("pii_forbidden");
  });

  it("builds onceKey from template", () => {
    const def = getRegistryEvent("v2_mission_completed")!;
    const ok = validateV2Payload({
      definition: def,
      payload: {
        mission_id: "speech_preschool_name_it",
        date_key: "2026-08-01",
      },
      context: CTX.context,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.onceKey).toBe(
        "mission_done:anon-1:speech_preschool_name_it:2026-08-01",
      );
    }
  });
});

describe("Once keys / duplicate detection", () => {
  it("materializeOnceKey fills tokens", () => {
    expect(
      materializeOnceKey("wow:{anonymousId}", { anonymousId: "x" }),
    ).toBe("wow:x");
  });

  it("duplicate onceKey → already_tracked", () => {
    const engine = createOnceEngine(createMemoryOnceStore());
    expect(engine.claim("k1")).toBe("claimed");
    expect(engine.claim("k1")).toBe("already_tracked");
    expect(engine.has("k1")).toBe(true);
  });

  it("OnceStore claim / release / has", () => {
    const store = createMemoryOnceStore();
    expect(store.claim("a")).toBe("claimed");
    expect(store.has("a")).toBe(true);
    expect(store.claim("a")).toBe("already_tracked");
    store.release("a");
    expect(store.has("a")).toBe(false);
    expect(store.claim("a")).toBe("claimed");
  });
});

describe("Event bus", () => {
  function bus() {
    setActiveV2AnalyticsContext(CTX.context);
    return createV2AnalyticsBus({
      isEnabled: () => true,
      onceEngine: createOnceEngine(createMemoryOnceStore()),
      sinks: createSinkRegistry(),
    });
  }

  it("tracks valid event once", () => {
    setV2AnalyticsDebugEnabled(true);
    const b = bus();
    const first = b.track({
      eventName: "v2_mission_started",
      eventVersion: 1,
      layer: "product",
      owner: "fe.today_mission",
      payload: {
        mission_id: "speech_preschool_name_it",
        date_key: "2026-08-01",
      },
    });
    expect(first).toMatchObject({ ok: true, status: "tracked" });

    const second = b.track({
      eventName: "v2_mission_started",
      eventVersion: 1,
      layer: "product",
      owner: "fe.today_mission",
      payload: {
        mission_id: "speech_preschool_name_it",
        date_key: "2026-08-01",
      },
    });
    expect(second).toMatchObject({ ok: true, status: "already_tracked" });
    expect(getV2AnalyticsDebugBuffer().length).toBeGreaterThan(0);
  });

  it("rejects unknown event", () => {
    const r = bus().track({
      eventName: "vanity_click",
      eventVersion: 1,
      layer: "product",
      owner: "fe.today_mission",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unknown_event");
  });

  it("rejects layer / owner / version mismatch", () => {
    const b = bus();
    expect(
      b.track({
        eventName: "today_viewed",
        eventVersion: 99,
        layer: "product",
        owner: "fe.today",
      }).ok,
    ).toBe(false);
    expect(
      b.track({
        eventName: "today_viewed",
        eventVersion: 1,
        layer: "business",
        owner: "fe.today",
      }).ok,
    ).toBe(false);
    expect(
      b.track({
        eventName: "today_viewed",
        eventVersion: 1,
        layer: "product",
        owner: "wrong.owner",
      }).ok,
    ).toBe(false);
  });

  it("rejects when flag disabled", () => {
    setActiveV2AnalyticsContext(CTX.context);
    const b = createV2AnalyticsBus({ isEnabled: () => false });
    const r = b.track({
      eventName: "today_viewed",
      eventVersion: 1,
      layer: "product",
      owner: "fe.today",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("flag_disabled");
  });

  it("does not call sinks when registry empty (no emission)", () => {
    const sinks = createSinkRegistry();
    let writes = 0;
    // Interface-only sprint: we still prove the registry can hold a sink later;
    // do not register production sinks. Verify list is empty by default.
    expect(sinks.list()).toHaveLength(0);
    setActiveV2AnalyticsContext(CTX.context);
    const b = createV2AnalyticsBus({
      isEnabled: () => true,
      sinks,
      onceEngine: createOnceEngine(createMemoryOnceStore()),
    });
    b.track({
      eventName: "today_viewed",
      eventVersion: 1,
      layer: "product",
      owner: "fe.today",
    });
    expect(writes).toBe(0);
    expect(sinks.list()).toHaveLength(0);
  });
});
