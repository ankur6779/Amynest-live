import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEPLOY_VERSION_SESSION_KEY,
  LEGACY_DEPLOY_VERSION_LS_KEY,
  checkDeployVersionMismatch,
  migrateLegacyDeployVersionStorage,
} from "@/lib/deploy-version";

describe("deploy-version", () => {
  beforeEach(() => {
    vi.stubGlobal("document", {
      querySelector: () => ({ getAttribute: () => "build-b" }),
    });
    vi.stubGlobal("sessionStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("migrates legacy localStorage key and removes it", () => {
    localStorage.setItem(LEGACY_DEPLOY_VERSION_LS_KEY, "legacy-a");
    migrateLegacyDeployVersionStorage();
    expect(localStorage.getItem(LEGACY_DEPLOY_VERSION_LS_KEY)).toBeNull();
    expect(sessionStorage.getItem(DEPLOY_VERSION_SESSION_KEY)).toBe("legacy-a");
  });

  it("detects mismatch against session storage", () => {
    sessionStorage.setItem(DEPLOY_VERSION_SESSION_KEY, "build-a");
    const check = checkDeployVersionMismatch();
    expect(check.mismatch).toBe(true);
    expect(check.previous).toBe("build-a");
    expect(check.current).toBe("build-b");
  });
});
