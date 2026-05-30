/**
 * Auth + onboarding anti-regression gate — CI must fail if these flows break.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeBoundaryError,
  safeBoundaryMessage,
  safeInvokeBoundaryHandler,
  safeReportBoundaryCrash,
} from "@/lib/safe-error-boundary-catch";
import {
  isSetupComplete,
  persistOnboardingCache,
  readOnboardingCache,
} from "@/lib/setup-status";
import {
  runOnboardingFinishTransaction,
  traceOnboardingTransaction,
} from "@/lib/onboarding-completion";
import {
  shouldUseAndroidWebViewGoogleAuth,
  shouldUseCapacitorGoogleAuth,
} from "@/lib/google-auth";
import { generateFacebookLoginNonce } from "@/lib/facebook-auth";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const ONBOARDING_PAGE = join(REPO_ROOT, "artifacts/kidschedule/src/pages/onboarding.tsx");

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("onboarding hooks order (React #300)", () => {
  it("keeps all hooks before step early-return branches", () => {
    const content = readFileSync(ONBOARDING_PAGE, "utf8");
    const lines = content.split("\n");

    let firstEarlyReturn = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/if\s*\(\s*step\s*===\s*"(?:notifications|saving|done)/.test(lines[i] ?? "")) {
        firstEarlyReturn = i;
        break;
      }
    }
    expect(firstEarlyReturn).toBeGreaterThan(0);

    const hookRe =
      /\b(use(?:Memo|Effect|LayoutEffect|Callback|State|Ref|SyncExternalStore|ImperativeHandle|Context))\s*\(/;
    const hooksAfterEarlyReturn: number[] = [];
    for (let i = firstEarlyReturn; i < lines.length; i++) {
      if (hookRe.test(lines[i] ?? "")) hooksAfterEarlyReturn.push(i + 1);
    }
    expect(hooksAfterEarlyReturn).toEqual([]);
  });
});

describe("error boundaries never throw", () => {
  it("safeInvokeBoundaryHandler swallows secondary failures", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console broken");
    });
    expect(() => {
      safeInvokeBoundaryHandler("test", () => {
        throw new Error("primary boundary work failed");
      });
    }).not.toThrow();
    consoleSpy.mockRestore();
  });

  it("normalizeBoundaryError handles non-Error throws", () => {
    expect(normalizeBoundaryError("boom").message).toBe("boom");
    expect(safeBoundaryMessage(null)).toBe("Unknown error");
  });

  it("safeReportBoundaryCrash never throws", () => {
    expect(() => {
      safeReportBoundaryCrash("test", new Error("child"), { componentStack: "at Foo" });
    }).not.toThrow();
  });
});

describe("Google login routing", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { protocol: "https:", hostname: "www.amynest.in" },
      Capacitor: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Android WebView bridge on Play Store shell (not Capacitor)", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 AmyNestAndroid/1.0" });
    expect(shouldUseCapacitorGoogleAuth()).toBe(false);
    expect(shouldUseAndroidWebViewGoogleAuth()).toBe(true);
  });
});

describe("Facebook login contract", () => {
  it("generates secure login nonces", () => {
    const nonce = generateFacebookLoginNonce(32);
    expect(nonce).toHaveLength(32);
    expect(generateFacebookLoginNonce()).not.toBe(generateFacebookLoginNonce());
  });

  it("bootstrapPendingFacebookSignIn resolves false without pending token", async () => {
    const win = window as Window & { __AMYNEST_PENDING_FACEBOOK_ACCESS_TOKEN?: string };
    delete win.__AMYNEST_PENDING_FACEBOOK_ACCESS_TOKEN;
    const { bootstrapPendingFacebookSignIn } = await import("@/lib/facebook-auth");
    await expect(bootstrapPendingFacebookSignIn()).resolves.toBe(false);
  }, 15_000);
});

describe("Finish Setup transaction", () => {
  it("emits transaction trace steps through successful finish", async () => {
    const traceSpy = vi.spyOn(console, "log");
    let onboardingGets = 0;
    let childrenGets = 0;

    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/onboarding" && (!init || init.method === undefined)) {
        onboardingGets += 1;
        if (onboardingGets > 1) {
          return mockResponse({ onboardingComplete: true, profileComplete: true });
        }
        return mockResponse({ onboardingComplete: false, profileComplete: false });
      }
      if (url === "/api/parent-profile" && init?.method === "PUT") {
        return mockResponse({ name: "Sam" });
      }
      if (url === "/api/children" && (!init || init.method === undefined)) {
        childrenGets += 1;
        if (childrenGets > 1) {
          return mockResponse([{ id: 1, name: "Ava" }]);
        }
        return mockResponse([]);
      }
      if (url === "/api/children" && init?.method === "POST") {
        return mockResponse({ id: 1, name: "Ava" });
      }
      if (url.includes("/goals") && init?.method === "PUT") {
        return mockResponse({ ok: true });
      }
      if (url === "/api/onboarding" && init?.method === "POST") {
        return mockResponse({ onboardingComplete: true, success: true });
      }
      return mockResponse({}, false, 404);
    });

    await runOnboardingFinishTransaction(authFetch, {
      parent: { name: "Sam" },
      children: [{ name: "Ava", ageGroup: "5-7" }],
      onboardingMeta: {
        children: [{ name: "Ava", ageGroup: "5-7", problems: [] }],
        parent: { caregiver: "mother" },
        priorityGoal: "balanced-routine",
      },
      selectedParentGoals: ["improve_sleep"],
    });

    const txLogs = traceSpy.mock.calls
      .filter((call) => String(call[0]).includes("ONBOARDING_TX_TRACE"))
      .map((call) => (call[1] as { txStep?: string })?.txStep)
      .filter(Boolean);
    expect(txLogs).toContain("preflight-onboarding-get");
    expect(txLogs).toContain("parent-profile-put");
    expect(txLogs).toContain("onboarding-flag-post");
    expect(txLogs).toContain("finish-success");
    traceSpy.mockRestore();
  });

  it("traceOnboardingTransaction is safe to call", () => {
    expect(() => {
      traceOnboardingTransaction("preflight-onboarding-get", { status: 200 });
    }).not.toThrow();
  });
});

describe("Dashboard redirect prerequisites", () => {
  beforeEach(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* jsdom */
    }
  });

  it("persisted completion cache satisfies isSetupComplete for dashboard fast-path", () => {
    persistOnboardingCache({ onboardingComplete: true, profileComplete: true });
    expect(isSetupComplete(readOnboardingCache())).toBe(true);
  });

  it("incomplete cache blocks dashboard fast-path", () => {
    persistOnboardingCache({ onboardingComplete: false, profileComplete: false });
    expect(isSetupComplete(readOnboardingCache())).toBe(false);
  });
});
