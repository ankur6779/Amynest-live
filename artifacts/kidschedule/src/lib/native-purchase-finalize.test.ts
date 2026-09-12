// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import type { SubscriptionResponse } from "@/hooks/use-subscription";

vi.mock("@/lib/api", () => ({
  getApiUrl: (path: string) => `https://api.test${path}`,
}));

import { finalizeNativePurchase, finalizeNativeRestore } from "./native-purchase-finalize";

function premiumResponse(): SubscriptionResponse {
  return {
    entitlements: {
      isPremium: true,
      isPremiumSubscriber: true,
      plan: "monthly",
      status: "active",
      provider: "revenuecat",
    },
    plans: [],
  } as SubscriptionResponse;
}

function freeResponse(): SubscriptionResponse {
  return {
    entitlements: {
      isPremium: false,
      isPremiumSubscriber: false,
      plan: "free",
      status: "free",
      provider: "none",
    },
    plans: [],
  } as SubscriptionResponse;
}

function makeQc(initial: SubscriptionResponse): QueryClient {
  let current = initial;
  return {
    invalidateQueries: vi.fn(async () => undefined),
    getQueriesData: vi.fn(() => [[["subscription", "user"], current]]),
    setPremium() {
      current = premiumResponse();
    },
  } as unknown as QueryClient & { setPremium: () => void };
}

describe("finalizeNativePurchase", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs purchase_finalize then unlocks after subscription cache refresh", async () => {
    const bodies: unknown[] = [];
    const authFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(init?.body ? JSON.parse(String(init.body)) : null);
      return new Response(
        JSON.stringify({
          ok: true,
          isPremium: true,
          apiPremium: true,
          activeEntitlement: true,
          dbUpdated: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const qc = makeQc(freeResponse()) as QueryClient & { setPremium: () => void };
    (qc.invalidateQueries as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      qc.setPremium();
    });

    const result = await finalizeNativePurchase(authFetch, qc);

    expect(authFetch).toHaveBeenCalledWith(
      "https://api.test/api/subscription/rc-sync",
      expect.objectContaining({ method: "POST" }),
    );
    expect(bodies).toEqual([{ purpose: "purchase_finalize" }]);
    expect(result).toEqual({ ok: true, isPremium: true, isPremiumSubscriber: true });
  });

  it("does not treat a failed rc-sync as premium when cache stays FREE", async () => {
    vi.useFakeTimers();
    const authFetch = vi.fn(async () => new Response("nope", { status: 409 }));
    const qc = makeQc(freeResponse());

    const pending = finalizeNativePurchase(authFetch, qc);
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result).toEqual({
      ok: false,
      isPremium: false,
      isPremiumSubscriber: false,
    });
    vi.useRealTimers();
  });
});

describe("finalizeNativeRestore", () => {
  it("POSTs restore purpose", async () => {
    const bodies: unknown[] = [];
    const authFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(init?.body ? JSON.parse(String(init.body)) : null);
      return new Response(
        JSON.stringify({ ok: true, isPremium: true, apiPremium: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const qc = makeQc(freeResponse()) as QueryClient & { setPremium: () => void };
    (qc.invalidateQueries as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      qc.setPremium();
    });

    const result = await finalizeNativeRestore(authFetch, qc);
    expect(bodies).toEqual([{ purpose: "restore" }]);
    expect(result.isPremiumSubscriber).toBe(true);
  });
});
