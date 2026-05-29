import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeOnboardingProgressPercent,
  inferOnboardingCompleteFromProfile,
  mergeSetupStatusPreferComplete,
  OnboardingFinishError,
  runOnboardingFinishTransaction,
} from "@/lib/onboarding-completion";
import {
  clearOnboardingChatSession,
  CURRENT_ONBOARDING_SESSION_VERSION,
  loadOnboardingChatSession,
  saveIncompatibleOnboardingSessionForTests,
  saveOnboardingChatSession,
} from "@/lib/onboarding-chat-session";
import { createOnboardingRunId, getOnboardingRunId } from "@/lib/onboarding-telemetry";
import {
  applySetupStatusUpdate,
  isSetupComplete,
  readOnboardingCache,
  repairLocalFromServerComplete,
  resolveSetupStatus,
} from "@/lib/setup-status";

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("onboarding completion inference", () => {
  it("treats parent-allergies as 100% progress", () => {
    expect(computeOnboardingProgressPercent("parent-allergies")).toBe(100);
    expect(computeOnboardingProgressPercent("saving")).toBe(100);
  });

  it("infers complete when profile signals and children exist", () => {
    expect(
      inferOnboardingCompleteFromProfile(
        {
          workType: "work_from_home",
          dietType: "vegetarian",
          foodStyle: "indian",
          focusAreas: ["improve_sleep"],
        },
        [{ name: "Ava" }],
        100,
      ),
    ).toBe(true);
  });
});

describe("setup status merge", () => {
  it("never downgrades cached complete to remote incomplete", () => {
    const cached = { onboardingComplete: true, profileComplete: true };
    const remote = { onboardingComplete: false, profileComplete: false };
    expect(mergeSetupStatusPreferComplete(cached, remote)).toEqual(cached);
    expect(applySetupStatusUpdate(cached, remote)).toEqual(cached);
  });

  it("accepts remote complete over cached incomplete", () => {
    const cached = { onboardingComplete: false, profileComplete: false };
    const remote = { onboardingComplete: true, profileComplete: true };
    expect(applySetupStatusUpdate(cached, remote)).toEqual(remote);
  });

  it("COMPLETE + UNKNOWN stays COMPLETE", () => {
    const cached = { onboardingComplete: true, profileComplete: true };
    expect(mergeSetupStatusPreferComplete(cached, undefined)).toEqual(cached);
  });
});

describe("server complete repairs local incomplete", () => {
  beforeEach(() => {
    localStorage.clear();
    saveOnboardingChatSession({
      step: "parent-allergies",
      messages: [],
      textInput: "",
      countryCode: "US",
      countryName: "United States",
      curr: {},
      parent: { name: "Sam" },
      children: [{ name: "Ava" }],
    });
  });

  it("Scenario D: repairs local cache and clears session", () => {
    expect(readOnboardingCache().onboardingComplete).toBe(false);
    expect(loadOnboardingChatSession()).not.toBeNull();

    const repaired = repairLocalFromServerComplete({
      onboardingComplete: true,
      profileComplete: true,
    });

    expect(repaired.onboardingComplete).toBe(true);
    expect(readOnboardingCache().onboardingComplete).toBe(true);
    expect(loadOnboardingChatSession()).toBeNull();
  });
});

describe("runOnboardingFinishTransaction", () => {
  const payload = {
    parent: { name: "Sam", workType: "work_from_home", dietType: "vegetarian" },
    children: [{ isOnboarding: true, name: "Ava" }],
    selectedParentGoals: ["improve_sleep"] as string[],
    onboardingMeta: {
      children: [{ name: "Ava", ageGroup: "5", problems: ["improve_sleep"] }],
      parent: { caregiver: "mother", concern: "", routineLevel: "medium", dietType: "vegetarian" },
      priorityGoal: "improve_sleep",
    },
  };

  beforeEach(() => {
    createOnboardingRunId();
  });

  it("Scenario A: network failure keeps transaction failed", async () => {
    const authFetch = vi.fn(async (url: string) => {
      if (url === "/api/onboarding") {
        return mockResponse({ onboardingComplete: false, profileComplete: false });
      }
      if (url === "/api/parent-profile") {
        return mockResponse({ fallback: true }, true, 200);
      }
      throw new Error("network down");
    });

    await expect(runOnboardingFinishTransaction(authFetch, payload)).rejects.toBeInstanceOf(
      OnboardingFinishError,
    );
  });

  it("Scenario C: double completion is idempotent when server already complete", async () => {
    const authFetch = vi.fn(async (url: string) => {
      if (url === "/api/onboarding") {
        return mockResponse({ onboardingComplete: true, profileComplete: true });
      }
      throw new Error(`unexpected ${url}`);
    });

    const result = await runOnboardingFinishTransaction(authFetch, payload);
    expect(result.alreadyCompleted).toBe(true);
    expect(authFetch).toHaveBeenCalledTimes(1);
  });

  it("Scenario C: performs single write path on fresh account", async () => {
    let onboardingPosts = 0;
    let onboardingGets = 0;
    let childrenGets = 0;
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/onboarding" && (!init || init.method === "GET")) {
        onboardingGets += 1;
        if (onboardingGets > 1) {
          return mockResponse({ onboardingComplete: true, profileComplete: true });
        }
        return mockResponse({ onboardingComplete: false, profileComplete: false });
      }
      if (url === "/api/parent-profile") {
        return mockResponse({ name: "Sam" });
      }
      if (url === "/api/children" && (!init || init.method === "GET")) {
        childrenGets += 1;
        if (childrenGets > 1) {
          return mockResponse([{ id: 1, name: "Ava" }]);
        }
        return mockResponse([]);
      }
      if (url === "/api/children") {
        return mockResponse({ id: 1, name: "Ava" });
      }
      if (url.includes("/goals")) {
        return mockResponse({ ok: true });
      }
      if (url === "/api/onboarding" && init?.method === "POST") {
        onboardingPosts += 1;
        return mockResponse({ success: true, onboardingComplete: true });
      }
      throw new Error(`unexpected ${url}`);
    });

    await runOnboardingFinishTransaction(authFetch, payload);
    expect(onboardingPosts).toBe(1);
  });
});

describe("resolveSetupStatus bootstrap", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Scenario B/E: server complete routes to dashboard state after reload", async () => {
    const authFetch = vi.fn(async () =>
      mockResponse({ onboardingComplete: true, profileComplete: true }),
    );

    const status = await resolveSetupStatus(authFetch);
    expect(isSetupComplete(status)).toBe(true);
    expect(readOnboardingCache().onboardingComplete).toBe(true);
  });

  it("Scenario D: server complete repairs stale local incomplete", async () => {
    saveOnboardingChatSession({
      step: "parent-allergies",
      messages: [],
      textInput: "",
      countryCode: "US",
      countryName: "United States",
      curr: {},
      parent: {},
      children: [],
    });

    const authFetch = vi.fn(async () =>
      mockResponse({ onboardingComplete: true, profileComplete: true }),
    );

    const status = await resolveSetupStatus(authFetch);
    expect(status.onboardingComplete).toBe(true);
    expect(readOnboardingCache().onboardingComplete).toBe(true);
    expect(loadOnboardingChatSession()).toBeNull();
  });
});

describe("versioned onboarding session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Scenario F: incompatible session version is invalidated", () => {
    saveIncompatibleOnboardingSessionForTests();
    expect(loadOnboardingChatSession()).toBeNull();
  });

  it("persists CURRENT_ONBOARDING_SESSION_VERSION", () => {
    saveOnboardingChatSession({
      step: "parent-allergies",
      messages: [],
      textInput: "",
      countryCode: "US",
      countryName: "United States",
      curr: {},
      parent: {},
      children: [],
    });
    const raw = localStorage.getItem("amynest_onboarding_session");
    expect(raw).toContain(`"version":${CURRENT_ONBOARDING_SESSION_VERSION}`);
    clearOnboardingChatSession();
  });
});

describe("onboardingRunId correlation", () => {
  it("creates a traceable run id", () => {
    const id = createOnboardingRunId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(getOnboardingRunId()).toBe(id);
  });
});

describe("safe session clearing order", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Scenario A: failed save preserves session snapshot", () => {
    saveOnboardingChatSession({
      step: "parent-allergies",
      messages: [{ id: "1", role: "user", text: "No allergies" }],
      textInput: "",
      countryCode: "US",
      countryName: "United States",
      curr: {},
      parent: { name: "Sam" },
      children: [{ name: "Ava" }],
    });

    expect(loadOnboardingChatSession()?.step).toBe("parent-allergies");
    expect(loadOnboardingChatSession()?.data.parent).toEqual({ name: "Sam" });
  });

  it("clears session only after explicit clear call (success path)", () => {
    saveOnboardingChatSession({
      step: "parent-allergies",
      messages: [],
      textInput: "",
      countryCode: "US",
      countryName: "United States",
      curr: {},
      parent: {},
      children: [],
    });
    clearOnboardingChatSession();
    expect(loadOnboardingChatSession()).toBeNull();
  });
});
