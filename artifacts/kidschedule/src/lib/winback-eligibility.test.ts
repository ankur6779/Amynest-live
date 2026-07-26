import { describe, expect, it } from "vitest";
import type { Entitlements } from "@/hooks/use-subscription";
import { FREE_ENTITLEMENTS } from "@/lib/subscription-defaults";
import {
  areEntitlementsResolved,
  evaluateWinbackEligibility,
  isServerConfirmedExpiredTrial,
  winbackDiagnosticEvent,
  type WinbackResolveState,
} from "@/lib/winback-eligibility";

const resolved: WinbackResolveState = {
  featureEnabled: true,
  isSignedIn: true,
  isFetched: true,
  isPlaceholderData: false,
  isFetching: false,
  dismissedRecently: false,
};

const loadingPlaceholder: WinbackResolveState = {
  ...resolved,
  isFetched: false,
  isPlaceholderData: true,
  isFetching: true,
};

const coldStartPlaceholder: WinbackResolveState = {
  ...resolved,
  // React Query with placeholderData: isLoading=false, isPlaceholderData=true, isFetching=true
  isFetched: false,
  isPlaceholderData: true,
  isFetching: true,
};

function trialEntitlements(overrides: Partial<Entitlements> = {}): Entitlements {
  return {
    ...FREE_ENTITLEMENTS,
    status: "trialing",
    isPremium: true,
    isPremiumSubscriber: false,
    isTrialActive: true,
    isTrialing: true,
    trialDaysRemaining: 3,
    trialEndsAt: "2026-07-11T00:23:24.315Z",
    subscriptionState: "TRIAL",
    provider: "none",
    internalTrialExpired: false,
    ...overrides,
  };
}

function expiredEntitlements(overrides: Partial<Entitlements> = {}): Entitlements {
  return {
    ...FREE_ENTITLEMENTS,
    status: "free",
    isPremium: false,
    isPremiumSubscriber: false,
    isTrialActive: false,
    isTrialing: false,
    trialDaysRemaining: 0,
    trialEndsAt: null,
    subscriptionState: "EXPIRED",
    provider: "none",
    internalTrialExpired: true,
    ...overrides,
  };
}

describe("areEntitlementsResolved", () => {
  it("is false during cold start placeholder FREE", () => {
    expect(areEntitlementsResolved(coldStartPlaceholder)).toBe(false);
  });

  it("is false while refreshing", () => {
    expect(
      areEntitlementsResolved({
        ...resolved,
        isFetching: true,
      }),
    ).toBe(false);
  });

  it("is true only when fetch completed without placeholder", () => {
    expect(areEntitlementsResolved(resolved)).toBe(true);
  });
});

describe("isServerConfirmedExpiredTrial", () => {
  it("never uses localStorage — FREE without server flags is not expired", () => {
    expect(isServerConfirmedExpiredTrial(FREE_ENTITLEMENTS)).toBe(false);
  });

  it("rejects bare subscriptionState EXPIRED without internalTrialExpired", () => {
    // Heal false-positives use EXPIRED — must NOT unlock Trial Ended / winback.
    expect(
      isServerConfirmedExpiredTrial(
        expiredEntitlements({
          subscriptionState: "EXPIRED",
          internalTrialExpired: false,
        }),
      ),
    ).toBe(false);
  });

  it("accepts internalTrialExpired flag only", () => {
    expect(
      isServerConfirmedExpiredTrial(
        expiredEntitlements({
          subscriptionState: "FREE",
          internalTrialExpired: true,
        }),
      ),
    ).toBe(true);
    expect(isServerConfirmedExpiredTrial(expiredEntitlements())).toBe(true);
  });

  it("rejects active trial", () => {
    expect(isServerConfirmedExpiredTrial(trialEntitlements())).toBe(false);
  });
});

describe("evaluateWinbackEligibility — false winback must never appear", () => {
  it("New trial: blocks active trial", () => {
    const result = evaluateWinbackEligibility(trialEntitlements(), resolved);
    expect(result).toEqual({ show: false, reason: "active_trial" });
  });

  it("Second app_open during placeholder FREE (prod bug T5OX4fdY): blocks loading", () => {
    // Local marker would have said "trial started" but server not synced yet —
    // placeholder looks like FREE + !isTrialing. Must NOT show.
    const fakeFreeWhileLoading = {
      ...FREE_ENTITLEMENTS,
      status: "free" as const,
      isTrialing: false,
      isPremium: false,
    };
    const result = evaluateWinbackEligibility(
      fakeFreeWhileLoading,
      coldStartPlaceholder,
    );
    expect(result.show).toBe(false);
    expect(result.reason).toMatch(/entitlements_/);
  });

  it("Cold start: unknown entitlements → do nothing", () => {
    const result = evaluateWinbackEligibility(null, {
      ...resolved,
      isFetched: false,
      isPlaceholderData: false,
      isFetching: true,
    });
    expect(result).toEqual({ show: false, reason: "entitlements_loading" });
  });

  it("Slow network: stay blocked while isFetching", () => {
    const result = evaluateWinbackEligibility(trialEntitlements(), {
      ...resolved,
      isFetching: true,
    });
    expect(result).toEqual({ show: false, reason: "entitlements_refreshing" });
  });

  it("Offline startup with EMPTY FREE after failed fetch: not_eligible (no false show)", () => {
    // fetchSubscriptionResilient returns EMPTY on hard fail — resolved FREE ≠ expired
    const result = evaluateWinbackEligibility(FREE_ENTITLEMENTS, resolved);
    expect(result).toEqual({ show: false, reason: "not_eligible" });
  });

  it("Expired trial (server EXPIRED): shows", () => {
    const result = evaluateWinbackEligibility(expiredEntitlements(), resolved);
    expect(result).toEqual({ show: true, reason: "subscription_expired" });
  });

  it("Paid subscriber: never shows", () => {
    const result = evaluateWinbackEligibility(
      {
        ...FREE_ENTITLEMENTS,
        status: "active",
        plan: "yearly",
        isPremium: true,
        isPremiumSubscriber: true,
        provider: "revenuecat",
        subscriptionState: "ACTIVE",
      },
      resolved,
    );
    expect(result).toEqual({ show: false, reason: "is_premium" });
  });

  it("Loading state: never assumes FREE eligibility", () => {
    const result = evaluateWinbackEligibility(
      FREE_ENTITLEMENTS,
      loadingPlaceholder,
    );
    expect(result.show).toBe(false);
    expect(["entitlements_loading", "entitlements_placeholder"]).toContain(
      result.reason,
    );
  });

  it("Lapsed subscriber (canceled RC): shows", () => {
    const result = evaluateWinbackEligibility(
      {
        ...FREE_ENTITLEMENTS,
        status: "canceled",
        provider: "revenuecat",
        isPremium: false,
        isPremiumSubscriber: false,
        isTrialing: false,
        subscriptionState: "FREE",
      },
      resolved,
    );
    expect(result).toEqual({ show: true, reason: "lapsed_subscriber" });
  });

  it("Active trialing status alone blocks even if isTrialing flag missing", () => {
    const result = evaluateWinbackEligibility(
      {
        ...FREE_ENTITLEMENTS,
        status: "trialing",
        isTrialing: false,
        isTrialActive: false,
        isPremium: false,
        subscriptionState: "TRIAL",
      },
      resolved,
    );
    expect(result).toEqual({ show: false, reason: "active_trial" });
  });

  it("Dismissed recently: blocks", () => {
    const result = evaluateWinbackEligibility(expiredEntitlements(), {
      ...resolved,
      dismissedRecently: true,
    });
    expect(result).toEqual({ show: false, reason: "dismissed_recently" });
  });

  it("Feature flag off: blocks", () => {
    const result = evaluateWinbackEligibility(expiredEntitlements(), {
      ...resolved,
      featureEnabled: false,
    });
    expect(result).toEqual({ show: false, reason: "feature_flag_off" });
  });
});

describe("winbackDiagnosticEvent", () => {
  it("maps loading blocks", () => {
    expect(
      winbackDiagnosticEvent({ show: false, reason: "entitlements_placeholder" }),
    ).toBe("winback_blocked_loading");
    expect(
      winbackDiagnosticEvent({ show: false, reason: "entitlements_refreshing" }),
    ).toBe("winback_blocked_loading");
  });

  it("maps active trial blocks", () => {
    expect(
      winbackDiagnosticEvent({ show: false, reason: "active_trial" }),
    ).toBe("winback_blocked_trial");
  });

  it("maps shown", () => {
    expect(
      winbackDiagnosticEvent({ show: true, reason: "subscription_expired" }),
    ).toBe("winback_shown");
  });

  it("ignores mundane blocks", () => {
    expect(
      winbackDiagnosticEvent({ show: false, reason: "not_eligible" }),
    ).toBeNull();
  });
});

describe("production race regression (T5OX4fdY timeline)", () => {
  it("second app_open with stale FREE placeholder + local trial marker must not show", () => {
    // Exact race: localStorage trial_started set, query still placeholder FREE
    const placeholderFree = { ...FREE_ENTITLEMENTS };
    const midOpen = evaluateWinbackEligibility(placeholderFree, {
      featureEnabled: true,
      isSignedIn: true,
      isFetched: false,
      isPlaceholderData: true,
      isFetching: true,
      dismissedRecently: false,
    });
    expect(midOpen.show).toBe(false);

    // After sync: still trialing → still must not show
    const afterSync = evaluateWinbackEligibility(trialEntitlements(), resolved);
    expect(afterSync.show).toBe(false);
    expect(afterSync.reason).toBe("active_trial");
  });
});
