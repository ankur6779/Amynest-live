import { test } from "node:test";
import assert from "node:assert/strict";
import { canDeliverPush } from "@workspace/notification-engine";

test("canDeliverPush blocks GDPR region without consent", () => {
  const result = canDeliverPush({
    pushConsentAt: null,
    pushConsentVersion: null,
    marketingOptIn: false,
    countryCode: "DE",
    childAgeYears: null,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "missing_push_consent");
});

test("canDeliverPush allows GDPR region with recorded consent", () => {
  const result = canDeliverPush({
    pushConsentAt: new Date(),
    pushConsentVersion: "2026-05-global-v1",
    marketingOptIn: true,
    countryCode: "DE",
    childAgeYears: null,
  });
  assert.equal(result.allowed, true);
});

test("canDeliverPush blocks COPPA under-13 without parental consent", () => {
  const result = canDeliverPush({
    pushConsentAt: null,
    pushConsentVersion: null,
    marketingOptIn: false,
    countryCode: "US",
    childAgeYears: 8,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "coppa_parental_consent");
});
