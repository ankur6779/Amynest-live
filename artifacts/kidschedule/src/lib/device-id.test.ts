// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getOrCreateDeviceId, getAppVersion } from "./device-id";

describe("device identity", () => {
  beforeEach(() => {
    localStorage.clear();
    const w = window as Window & {
      __AMYNEST_NATIVE_DEVICE_ID?: string;
      __AMYNEST_RESOLVED_DEVICE_ID?: string;
      __AMYNEST_APP_VERSION?: string;
    };
    delete w.__AMYNEST_NATIVE_DEVICE_ID;
    delete w.__AMYNEST_RESOLVED_DEVICE_ID;
    delete w.__AMYNEST_APP_VERSION;
  });

  it("reuses the native device id on a fresh install before login", () => {
    const w = window as Window & { __AMYNEST_NATIVE_DEVICE_ID?: string };
    w.__AMYNEST_NATIVE_DEVICE_ID = "native-device-id-abc123";
    expect(getOrCreateDeviceId()).toBe("native-device-id-abc123");
    expect(localStorage.getItem("amynest:device:id:v1")).toBe("native-device-id-abc123");
    expect(getOrCreateDeviceId()).toBe("native-device-id-abc123");
  });

  it("survives a simulated app restart by reading localStorage", () => {
    localStorage.setItem("amynest:device:id:v1", "persisted-device-id-xyz");
    expect(getOrCreateDeviceId()).toBe("persisted-device-id-xyz");
  });

  it("reads native app version when injected", () => {
    const w = window as Window & { __AMYNEST_APP_VERSION?: string };
    w.__AMYNEST_APP_VERSION = "1.4.64";
    expect(getAppVersion()).toBe("1.4.64");
  });
});
