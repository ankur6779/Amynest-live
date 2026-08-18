import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getIdToken = vi.fn(async () => "test-token");
const authState: { currentUser: { getIdToken: typeof getIdToken } | null } = {
  currentUser: { getIdToken },
};

vi.mock("@/lib/firebase", () => ({
  getFirebaseAuth: () => authState,
}));

vi.mock("@/lib/api", () => ({
  getApiUrl: (path: string) => path,
}));

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

describe("releaseCurrentDeviceSession", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("amynest:device:id:v1", "install-id-abcdefgh");
    getIdToken.mockResolvedValue("test-token");
    authState.currentUser = { getIdToken };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("posts the current installation to /api/devices/release with the auth token", async () => {
    const { releaseCurrentDeviceSession } = await import("@/lib/device-registration");
    await releaseCurrentDeviceSession();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/api/devices/release");
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.get("x-amynest-device-id")).toBe("install-id-abcdefgh");
    expect(JSON.parse(String(init?.body))).toEqual({ deviceId: "install-id-abcdefgh" });
    expect(localStorage.getItem("amynest:device:id:v1")).toBe("install-id-abcdefgh");
  });

  it("does not throw when release fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    const { releaseCurrentDeviceSession } = await import("@/lib/device-registration");
    await expect(releaseCurrentDeviceSession()).resolves.toBeUndefined();
    expect(localStorage.getItem("amynest:device:id:v1")).toBe("install-id-abcdefgh");
  });

  it("skips the request when there is no Firebase user", async () => {
    authState.currentUser = null;
    const { releaseCurrentDeviceSession } = await import("@/lib/device-registration");
    await releaseCurrentDeviceSession();
    expect(fetch).not.toHaveBeenCalled();
  });
});
