/**
 * Premium download bank: reserve commits bank−1 before the download row insert.
 * Unique conflicts (23505) and outer failures must refund, or concurrent
 * double-taps permanently burn paid bank credits without a new grant.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  isBankDebitReservation,
  type PremiumDownloadReserve,
} from "./premiumDownloadBankService.js";

const walletStub = {
  enabled: true,
  availableToday: 1,
  dailyAllocation: 5,
  dailyRefresh: 5,
  dailyUsed: 5,
  dailyRemaining: 0,
  bankedDownloads: 1,
  maxBank: 25,
  maxAvailable: 30,
  lastRefreshAt: null,
};

describe("isBankDebitReservation", () => {
  it("is true only for successful bank-sourced reserves", () => {
    const bankOk: PremiumDownloadReserve = {
      ok: true,
      source: "bank",
      wallet: walletStub,
    };
    const dailyOk: PremiumDownloadReserve = {
      ok: true,
      source: "daily",
      wallet: { ...walletStub, dailyUsed: 1, dailyRemaining: 4, bankedDownloads: 2 },
    };
    const denied: PremiumDownloadReserve = { ok: false, wallet: walletStub };

    assert.equal(isBankDebitReservation(bankOk), true);
    assert.equal(isBankDebitReservation(dailyOk), false);
    assert.equal(isBankDebitReservation(denied), false);
    assert.equal(isBankDebitReservation(null), false);
    assert.equal(isBankDebitReservation(undefined), false);
  });
});

describe("hub download routes refund bank on unique conflict / outer failure", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const routesDir = path.resolve(here, "../routes");
  const routeFiles = ["coloring.ts", "funsheets.ts", "worksheets.ts"] as const;

  for (const file of routeFiles) {
    it(`${file} refunds bank debit on 23505 and outer catch`, () => {
      const src = readFileSync(path.join(routesDir, file), "utf8");
      assert.match(
        src,
        /refundPremiumDownloadBankDebitIfNeeded/,
        `${file} must use refundPremiumDownloadBankDebitIfNeeded`,
      );
      // Unique-conflict path must refund before re-streaming.
      const uniqIdx = src.indexOf('pgCode === "23505"');
      assert.ok(uniqIdx >= 0, `${file} missing 23505 handler`);
      const afterUniq = src.slice(uniqIdx, uniqIdx + 500);
      assert.match(
        afterUniq,
        /refundPremiumDownloadBankDebitIfNeeded\(userId,\s*premiumReservation\)/,
        `${file} 23505 path must refund bank debit`,
      );
      // Outer catch must also refund (hoisted reservation).
      assert.match(
        src,
        /catch\s*\(err\)\s*\{[\s\S]*refundPremiumDownloadBankDebitIfNeeded\(userId,\s*premiumReservation\)/,
        `${file} outer catch must refund bank debit`,
      );
    });
  }
});
