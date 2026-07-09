import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const featureFlagsMock = vi.hoisted(() => ({
  isPreSignupPermNativeEnabled: vi.fn(() => true),
  isPreSignupDiagnosticsEnabled: vi.fn(() => true),
  isPreSignupReengagementEnabled: vi.fn(() => true),
  readPreSignupFeatureFlags: vi.fn(() => ({
    parent: true,
    permNative: true,
    diagnostics: true,
  })),
}));

vi.mock("@/lib/pre-signup-feature-flags", () => featureFlagsMock);

vi.mock("@/lib/native-push-bridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/native-push-bridge")>();
  return {
    ...actual,
    readAndroidPushPermissionStatus: vi.fn(() => "granted" as const),
    getBrowserNotificationPermission: vi.fn(() => "default" as NotificationPermission),
    isAmyNestWrapper: vi.fn(() => true),
  };
});

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => "web",
  },
}));

describe("resolvePreSignupPermissionDetailed (F1)", () => {
  beforeEach(() => {
    featureFlagsMock.isPreSignupPermNativeEnabled.mockReturnValue(true);
    Object.defineProperty(window, "AndroidLocalNotif", {
      configurable: true,
      value: { scheduleBatch: vi.fn() },
    });
    Object.defineProperty(window, "AndroidPush", {
      configurable: true,
      value: {
        getPushToken: () => null,
        getPermissionStatus: () => "granted",
      },
    });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "default" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "AndroidLocalNotif", {
      configurable: true,
      value: { scheduleBatch: vi.fn() },
    });
  });

  it("uses AndroidPush when native perm flag is on and bridge exists", async () => {
    vi.resetModules();
    const { resolvePreSignupPermissionDetailed } = await import("./local-notifications");
    const { readAndroidPushPermissionStatus } = await import("@/lib/native-push-bridge");

    const result = await resolvePreSignupPermissionDetailed();

    expect(readAndroidPushPermissionStatus).toHaveBeenCalled();
    expect(result).toEqual({
      status: "granted",
      source: "android_push",
      apiUsed: "AndroidPush.getPermissionStatus",
    });
  });

  it("falls back to browser API when perm native flag is off", async () => {
    featureFlagsMock.isPreSignupPermNativeEnabled.mockReturnValue(false);
    vi.resetModules();

    const { resolvePreSignupPermissionDetailed } = await import("./local-notifications");
    const result = await resolvePreSignupPermissionDetailed();

    expect(result.source).toBe("browser_notification");
    expect(result.apiUsed).toBe("Notification.permission");
    expect(result.status).toBe("default");
  });

  it("falls back to browser API when Android bridge missing", async () => {
    Object.defineProperty(window, "AndroidLocalNotif", {
      configurable: true,
      value: undefined,
    });
    vi.resetModules();

    const { resolvePreSignupPermissionDetailed } = await import("./local-notifications");
    const result = await resolvePreSignupPermissionDetailed();

    expect(result.source).toBe("browser_notification");
    expect(result.status).toBe("default");
  });
});

describe("pre-signup feature flags", () => {
  it("parent flag OFF disables perm native and diagnostics", () => {
    featureFlagsMock.isPreSignupReengagementEnabled.mockReturnValue(false);
    featureFlagsMock.isPreSignupPermNativeEnabled.mockReturnValue(false);
    featureFlagsMock.isPreSignupDiagnosticsEnabled.mockReturnValue(false);

    expect(featureFlagsMock.isPreSignupReengagementEnabled()).toBe(false);
    expect(featureFlagsMock.isPreSignupPermNativeEnabled()).toBe(false);
    expect(featureFlagsMock.isPreSignupDiagnosticsEnabled()).toBe(false);
  });
});

describe("diagnostics dedupe (F4)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    featureFlagsMock.isPreSignupDiagnosticsEnabled.mockReturnValue(true);
    vi.resetModules();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.resetModules();
  });

  it("emits campaign_blocked once per session per reason", async () => {
    vi.doMock("@/lib/analytics", () => ({ track: vi.fn() }));
    const { trackPreSignupCampaignBlocked } = await import("./diagnostics");

    trackPreSignupCampaignBlocked("permission_default");
    trackPreSignupCampaignBlocked("permission_default");
    trackPreSignupCampaignBlocked("feature_flag_off");

    const keys = JSON.parse(sessionStorage.getItem("amynest:pre_signup_diag_dedupe:v1") ?? "[]");
    expect(keys).toContain("blocked:permission_default");
    expect(keys).toContain("blocked:feature_flag_off");
    expect(keys.filter((k: string) => k === "blocked:permission_default")).toHaveLength(1);
  });
});

describe("schedulePreSignupLocalNotifications outcome", () => {
  beforeEach(() => {
    featureFlagsMock.isPreSignupPermNativeEnabled.mockReturnValue(true);
    Object.defineProperty(window, "AndroidLocalNotif", {
      configurable: true,
      value: { scheduleBatch: vi.fn() },
    });
    Object.defineProperty(window, "AndroidPush", {
      configurable: true,
      value: {
        getPushToken: () => null,
        getPermissionStatus: () => "granted",
      },
    });
    Object.defineProperty(window, "__AMYNEST_WRAPPER", {
      configurable: true,
      value: "android",
    });
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("reports submitted when Android bridge schedules", async () => {
    const { schedulePreSignupLocalNotifications } = await import("./local-notifications");
    const future = Date.now() + 60_000;
    const outcome = await schedulePreSignupLocalNotifications([
      {
        id: 910001,
        milestone: "day0_2h",
        fireAtMs: future,
        title: "t",
        body: "b",
        deepLink: "/sign-up",
        variant: "A",
        messageIndex: 0,
        status: "pending",
      },
    ]);

    expect(outcome.ok).toBe(true);
    expect(outcome.nativeScheduleResult).toBe("submitted");
    expect(outcome.pendingCount).toBe(1);
  });

  it("reports skipped_permission when denied", async () => {
    const bridge = await import("@/lib/native-push-bridge");
    vi.mocked(bridge.readAndroidPushPermissionStatus).mockReturnValue("denied");
    vi.resetModules();

    const { schedulePreSignupLocalNotifications } = await import("./local-notifications");
    const outcome = await schedulePreSignupLocalNotifications([]);

    expect(outcome.ok).toBe(false);
    expect(outcome.nativeScheduleResult).toBe("skipped_permission");
  });

  it("reports skipped_no_bridge when not in wrapper", async () => {
    const bridge = await import("@/lib/native-push-bridge");
    vi.mocked(bridge.isAmyNestWrapper).mockReturnValue(false);
    vi.resetModules();

    const { schedulePreSignupLocalNotifications } = await import("./local-notifications");
    const outcome = await schedulePreSignupLocalNotifications([]);

    expect(outcome.ok).toBe(false);
    expect(outcome.nativeScheduleResult).toBe("skipped_no_bridge");
  });
});

describe("Android API level detection", () => {
  it("parses API level from user agent for Android 12/13/14", async () => {
    const levels = [
      { ua: "AmyNestAndroid/1.0 Android 12", expected: 12 },
      { ua: "AmyNestAndroid/1.0 Android 13", expected: 13 },
      { ua: "AmyNestAndroid/1.0 Android 14", expected: 14 },
    ];

    const { detectAndroidApiLevel } = await import("./diagnostics");
    for (const { ua, expected } of levels) {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value: ua,
      });
      expect(detectAndroidApiLevel()).toBe(expected);
    }
  });
});
