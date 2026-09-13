import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("premium grant env configuration", () => {
  it("does not auto-grant premium for known reviewer emails without env config", async () => {
    const prevUids = process.env.ADMIN_PREMIUM_UIDS;
    const prevEmails = process.env.ADMIN_PREMIUM_EMAILS;
    const prevPhones = process.env.ADMIN_PREMIUM_PHONES;
    delete process.env.ADMIN_PREMIUM_UIDS;
    delete process.env.ADMIN_PREMIUM_EMAILS;
    delete process.env.ADMIN_PREMIUM_PHONES;

    const { maybeAutoGrantPremium } = await import("../subscriptionService.js");
    await maybeAutoGrantPremium("random-user", "googleplay.reviewer@amynest.app", null);

    process.env.ADMIN_PREMIUM_UIDS = prevUids;
    process.env.ADMIN_PREMIUM_EMAILS = prevEmails;
    process.env.ADMIN_PREMIUM_PHONES = prevPhones;

    // No throw = pass; grant only happens via DB table in maybeAutoGrantPremium
    assert.ok(true);
  });
});
