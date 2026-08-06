import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  createFirebaseSink,
  createMemoryFirebaseWriter,
  createNoopFirebaseOfflineQueue,
  createOnceEngine,
  createMemoryOnceStore,
  createSinkRegistry,
  createV2AnalyticsBus,
  createV2AnalyticsContext,
  getV2SinkHealth,
  isAllowedForFirebaseSink,
  listFirebaseSinkAllowlist,
  mapRegistryEventToFirebaseName,
  buildFirebaseParams,
  resetV2AnalyticsBusForTests,
  resetV2SinkHealthForTests,
  setActiveV2AnalyticsContext,
  setV2AnalyticsDebugEnabled,
  type V2AnalyticsRecord,
} from "../../index";

function makeRecord(
  partial: Partial<V2AnalyticsRecord> & Pick<V2AnalyticsRecord, "eventName">,
): V2AnalyticsRecord {
  const ctx = createV2AnalyticsContext({
    anonymousId: "anon-fb",
    accountId: "uid_1",
    sessionId: "sess-fb",
    journeyId: "v2_product_north_star",
    journeyVersion: 1,
    appVersion: "2.5.0",
    platform: "web",
  });
  if (!ctx.ok) throw new Error("ctx");
  return {
    eventName: partial.eventName,
    eventVersion: partial.eventVersion ?? 1,
    layer: partial.layer ?? "product",
    owner: partial.owner ?? "fe.today_mission",
    onceKey: partial.onceKey ?? `once:${partial.eventName}`,
    context: partial.context ?? ctx.context,
    payload: partial.payload ?? {
      mission_id: "speech_preschool_name_it",
      date_key: "2026-08-01",
    },
    occurredAt: partial.occurredAt ?? "2026-08-01T12:00:00.000Z",
  };
}

describe("FirebaseSink allowlist", () => {
  it("allows North Star product/business + sys_sign_up", () => {
    const names = listFirebaseSinkAllowlist();
    expect(names).toEqual(
      expect.arrayContaining([
        "v2_wow_completed",
        "v2_mission_started",
        "v2_mission_completed",
        "v2_d1_returned",
        "v2_practice_day3",
        "sys_sign_up",
      ]),
    );
    expect(names).not.toContain("ads_purchase");
    expect(names).not.toContain("ads_begin_checkout");
    expect(names).not.toContain("premium_view");
    expect(names).not.toContain("today_viewed");
  });

  it("unknown event rejection", () => {
    expect(isAllowedForFirebaseSink("not_real").reason).toBe("unknown_event");
  });

  it("registry firebase:false rejection", () => {
    expect(isAllowedForFirebaseSink("today_viewed").reason).toBe("not_firebase");
  });

  it("commerce/ads layer excluded even if firebase:true", () => {
    expect(isAllowedForFirebaseSink("ads_begin_checkout").reason).toBe(
      "layer_excluded",
    );
    expect(isAllowedForFirebaseSink("ads_purchase").reason).toBe(
      "layer_excluded",
    );
  });
});

describe("Firebase DebugView mapping", () => {
  it("maps sys_sign_up → sign_up", () => {
    expect(mapRegistryEventToFirebaseName("sys_sign_up")).toBe("sign_up");
  });

  it("keeps custom North Star names for DebugView", () => {
    expect(mapRegistryEventToFirebaseName("v2_mission_completed")).toBe(
      "v2_mission_completed",
    );
    expect(mapRegistryEventToFirebaseName("v2_wow_completed")).toBe(
      "v2_wow_completed",
    );
  });
});

describe("FirebaseSink write", () => {
  let writer: ReturnType<typeof createMemoryFirebaseWriter>;
  let sink: ReturnType<typeof createFirebaseSink>;

  beforeEach(() => {
    setV2AnalyticsDebugEnabled(true);
    resetV2SinkHealthForTests();
    writer = createMemoryFirebaseWriter();
    sink = createFirebaseSink({ writer });
  });

  afterEach(() => {
    sink.resetForwardedForTests();
    resetV2AnalyticsBusForTests();
    setV2AnalyticsDebugEnabled(false);
  });

  it("forwards allowlisted event with payload + journey + version", async () => {
    const record = makeRecord({
      eventName: "v2_mission_started",
      owner: "fe.today_mission",
      layer: "product",
      onceKey: "mission_start:anon-fb:speech_preschool_name_it:2026-08-01",
    });
    await sink.write(record);
    expect(sink.getLastResult()?.status).toBe("forwarded");
    expect(writer.calls).toHaveLength(1);
    expect(writer.calls[0]!.eventName).toBe("v2_mission_started");
    const params = writer.calls[0]!.params;
    expect(params.event_version).toBe(1);
    expect(params.journey_id).toBe("v2_product_north_star");
    expect(params.journey_version).toBe(1);
    expect(params.anonymous_id).toBe("anon-fb");
    expect(params.session_id).toBe("sess-fb");
    expect(params.user_id).toBe("uid_1");
    expect(params.mission_id).toBe("speech_preschool_name_it");
    expect(params.date_key).toBe("2026-08-01");
    expect(params.analytics_flag).toBe("analytics_v2_core");
  });

  it("rejects unknown / not-allowlisted without calling writer", async () => {
    await sink.write(
      makeRecord({
        eventName: "vanity_click",
        onceKey: "x",
      }),
    );
    expect(sink.getLastResult()).toMatchObject({
      status: "rejected",
      reason: "unknown_event",
    });
    expect(writer.calls).toHaveLength(0);

    await sink.write(
      makeRecord({
        eventName: "ads_purchase",
        layer: "ads",
        owner: "fe.attribution_native",
        onceKey: "ads_paid:t1",
        payload: {
          transaction_id: "t1",
          plan_id: "yearly",
          value: 1,
          currency: "INR",
          item_id: "yearly",
        },
      }),
    );
    expect(sink.getLastResult()?.status).toBe("rejected");
    expect(writer.calls).toHaveLength(0);
  });

  it("duplicate onceKey → already_forwarded (exactly-once)", async () => {
    const record = makeRecord({
      eventName: "v2_d1_returned",
      layer: "business",
      owner: "fe.analytics_bootstrap",
      onceKey: "d1:anon-fb:2026-08-01",
      payload: { cohort_day0: "2026-08-01", return_date: "2026-08-02" },
    });
    await sink.write(record);
    await sink.write(record);
    expect(writer.calls).toHaveLength(1);
    expect(sink.getLastResult()?.status).toBe("already_forwarded");
  });

  it("sys_sign_up DebugView name is sign_up", async () => {
    await sink.write(
      makeRecord({
        eventName: "sys_sign_up",
        layer: "system",
        owner: "fe.auth",
        onceKey: "signup:uid_1",
        payload: { method: "google", user_id: "uid_1" },
      }),
    );
    expect(writer.calls[0]!.eventName).toBe("sign_up");
    expect(writer.calls[0]!.params.method).toBe("google");
  });

  it("strips PII keys from params", () => {
    const params = buildFirebaseParams(
      makeRecord({
        eventName: "v2_mission_completed",
        payload: {
          mission_id: "m1",
          date_key: "2026-08-01",
          name: "ShouldNeverAppear",
          child_name: "Nope",
        },
      }),
    );
    expect(params).not.toHaveProperty("name");
    expect(params).not.toHaveProperty("child_name");
    expect(params.mission_id).toBe("m1");
  });

  it("offline queue is explicit no-op", async () => {
    const offline = createNoopFirebaseOfflineQueue();
    expect(offline.supported).toBe(false);
    const failing = createFirebaseSink({
      writer: {
        async log() {
          return false;
        },
      },
      offlineQueue: offline,
    });
    await failing.write(
      makeRecord({
        eventName: "v2_practice_day3",
        layer: "business",
        owner: "fe.practice_counter",
        onceKey: "day3:anon-fb",
        payload: {
          cohort_day0: "2026-08-01",
          practice_count: 2,
          reached_on_date: "2026-08-02",
        },
      }),
    );
    expect(failing.getLastResult()?.status).toBe("writer_failed");
    expect(offline.size()).toBe(0);
    expect(await offline.flush()).toBe(0);
  });

  it("debug sink health — accepted / rejected / duplicate / dropped", async () => {
    await sink.write(
      makeRecord({
        eventName: "v2_mission_started",
        onceKey: "health:start",
      }),
    );
    await sink.write(
      makeRecord({
        eventName: "vanity_click",
        onceKey: "health:unknown",
      }),
    );
    await sink.write(
      makeRecord({
        eventName: "v2_mission_started",
        onceKey: "health:start",
      }),
    );
    const dropper = createFirebaseSink({
      writer: {
        async log() {
          return false;
        },
      },
    });
    await dropper.write(
      makeRecord({
        eventName: "v2_wow_completed",
        onceKey: "health:drop",
        payload: {
          elapsed_ms: 1,
          practice_id: "p1",
        },
      }),
    );

    expect(getV2SinkHealth()).toEqual({
      accepted: 1,
      rejected: 1,
      duplicate: 1,
      dropped: 1,
    });
  });

  it("sink throw never blocks bus track (UX isolation)", async () => {
    vi.stubEnv(v2BooleanFlagEnvKey("analytics_v2_core"), "1");
    const throwingSink = createFirebaseSink({
      writer: {
        async log() {
          throw new Error("firebase down");
        },
      },
    });
    const sinks = createSinkRegistry();
    sinks.register(throwingSink);
    const ctx = createV2AnalyticsContext({
      anonymousId: "anon-ux",
      sessionId: "sess-ux",
      journeyId: "v2_product_north_star",
      journeyVersion: 1,
      platform: "web",
    });
    if (!ctx.ok) throw new Error("ctx");
    setActiveV2AnalyticsContext(ctx.context);

    const bus = createV2AnalyticsBus({
      isEnabled: () => true,
      onceEngine: createOnceEngine(createMemoryOnceStore()),
      sinks,
    });

    const result = bus.track({
      eventName: "v2_mission_started",
      eventVersion: 1,
      layer: "product",
      owner: "fe.today_mission",
      payload: {
        mission_id: "m1",
        date_key: "2026-08-01",
      },
    });
    expect(result).toMatchObject({ ok: true, status: "tracked" });
    await vi.waitFor(() =>
      expect(throwingSink.getLastResult()?.status).toBe("writer_failed"),
    );
  });

  it("getV2SinkHealth is null when debug disabled", () => {
    setV2AnalyticsDebugEnabled(false);
    expect(getV2SinkHealth()).toBeNull();
  });
});

describe("Bus → FirebaseSink integration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetV2AnalyticsBusForTests();
  });

  it("bus forwards once; duplicate track does not hit sink again", async () => {
    vi.stubEnv(v2BooleanFlagEnvKey("analytics_v2_core"), "1");
    const writer = createMemoryFirebaseWriter();
    const firebaseSink = createFirebaseSink({ writer });
    const sinks = createSinkRegistry();
    sinks.register(firebaseSink);
    const ctx = createV2AnalyticsContext({
      anonymousId: "anon-bus",
      sessionId: "sess-bus",
      journeyId: "v2_product_north_star",
      journeyVersion: 1,
      platform: "web",
    });
    if (!ctx.ok) throw new Error("ctx");
    setActiveV2AnalyticsContext(ctx.context);

    const bus = createV2AnalyticsBus({
      isEnabled: () => true,
      onceEngine: createOnceEngine(createMemoryOnceStore()),
      sinks,
    });

    const first = bus.track({
      eventName: "v2_mission_completed",
      eventVersion: 1,
      layer: "product",
      owner: "fe.today_mission",
      payload: {
        mission_id: "speech_preschool_name_it",
        date_key: "2026-08-01",
      },
    });
    expect(first.status).toBe("tracked");
    await vi.waitFor(() => expect(writer.calls).toHaveLength(1));

    const second = bus.track({
      eventName: "v2_mission_completed",
      eventVersion: 1,
      layer: "product",
      owner: "fe.today_mission",
      payload: {
        mission_id: "speech_preschool_name_it",
        date_key: "2026-08-01",
      },
    });
    expect(second.status).toBe("already_tracked");
    await Promise.resolve();

    expect(writer.calls).toHaveLength(1);
    expect(writer.calls[0]!.params.journey_id).toBe("v2_product_north_star");
    expect(writer.calls[0]!.params.event_version).toBe(1);
  });
});
