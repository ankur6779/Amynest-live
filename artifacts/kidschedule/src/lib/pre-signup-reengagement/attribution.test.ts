import { describe, expect, it, beforeEach } from "vitest";
import {
  ATTRIBUTION_KEY,
  recordPreSignupAttribution,
  readAttribution,
  consumeAttribution,
} from "./storage";
import { ATTRIBUTION_WINDOW_MS } from "./types";

const BASE_MS = Date.parse("2026-06-15T12:00:00Z");

describe("pre-signup attribution", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores attribution with 48h expiry", () => {
    recordPreSignupAttribution({
      notificationId: "910002",
      milestone: "day1",
      variant: "B",
      tappedAt: BASE_MS,
    });
    const attr = readAttribution();
    expect(attr?.notificationId).toBe("910002");
    expect(attr?.milestone).toBe("day1");
    expect(attr?.variant).toBe("B");
    expect(attr?.expiresAt).toBe(BASE_MS + ATTRIBUTION_WINDOW_MS);
  });

  it("ignores expired attribution", () => {
    recordPreSignupAttribution({ notificationId: "910001", tappedAt: BASE_MS });
    const RealDate = Date;
    const future = BASE_MS + ATTRIBUTION_WINDOW_MS + 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Date = class extends RealDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) super(future);
        else super(...args);
      }
      static now() {
        return future;
      }
    };
    try {
      expect(readAttribution()).toBeNull();
      expect(localStorage.getItem(ATTRIBUTION_KEY)).toBeNull();
    } finally {
      globalThis.Date = RealDate;
    }
  });

  it("consumeAttribution clears storage", () => {
    recordPreSignupAttribution({ notificationId: "910003", tappedAt: BASE_MS });
    const consumed = consumeAttribution();
    expect(consumed?.notificationId).toBe("910003");
    expect(readAttribution()).toBeNull();
  });
});
