import { beforeEach, describe, expect, it, vi } from "vitest";

const getIdToken = vi.fn(async () => "id-token-abc");
const currentUser = { getIdToken };

vi.mock("@/lib/firebase", () => ({
  getFirebaseAuth: () => ({ currentUser }),
  getWebPushToken: vi.fn(async () => "web-fcm-token-xyz"),
}));

vi.mock("@/lib/native-push-bridge", () => ({
  isAmyNestWrapper: () => false,
  getNativePushBridge: () => null,
  getNativePushToken: vi.fn(),
  getBrowserNotificationPermission: () => "granted",
}));

vi.mock("@/lib/native-shell", () => ({
  canUseBrowserServiceWorkers: () => true,
}));

vi.mock("@/lib/api", () => ({
  getApiUrl: (path: string) => `https://api.test${path}`,
}));

vi.mock("@/lib/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn(async () => new Response(null, { status: 200 })),
}));

describe("push-session", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    import.meta.env.VITE_FIREBASE_VAPID_KEY =
      "BElk0ExampleVapidKeyThatIsLongEnoughForValidationChecksXX";
  });

  it("clearPushRegistrationMarkers drops device-global nudge keys", async () => {
    localStorage.setItem("notify_device_registered_at", "1");
    localStorage.setItem("notify_nudge_dismissed_until", "2");
    const { clearPushRegistrationMarkers } = await import("@/lib/push-session");
    clearPushRegistrationMarkers();
    expect(localStorage.getItem("notify_device_registered_at")).toBeNull();
    expect(localStorage.getItem("notify_nudge_dismissed_until")).toBeNull();
  });

  it("unregisterCurrentPushTokens DELETEs local web FCM token while authed", async () => {
    const { fetchWithTimeout } = await import("@/lib/fetch-with-timeout");
    const { unregisterCurrentPushTokens } = await import("@/lib/push-session");
    await unregisterCurrentPushTokens();

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "https://api.test/api/push/unregister",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ token: "web-fcm-token-xyz" }),
      }),
      4_000,
    );
    const init = vi.mocked(fetchWithTimeout).mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer id-token-abc");
  });
});
