import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADS_PURCHASE_CONVERSION_ACTION,
  ATTRIBUTED,
  ATTRIBUTION_UNKNOWN,
  GOOGLE_ADS_VERIFIED,
  OTHER_SOURCE_VERIFIED,
  adsConversionDedupeKey,
  buildServerPurchaseSuccessProps,
  campaignForAttributedPurchase,
  extractClickIdsFromProps,
  hasSupportedClickId,
  isGoogleAdsAttributed,
  isRevenueCatAnonymousId,
  mergeFirstTouch,
  prepareAdsPurchaseConversion,
  requiredRevenueCatUserId,
  resolveAttributionStatus,
  shouldRefuseAnonymousPurchase,
  stitchCanonicalUser,
} from "./acquisitionAttributionLogic";

const DEVICE = "11111111-2222-3333-4444-555555555555";
const UID = "firebaseUidAAA000111222333444";

function firstTouch(over: Partial<Parameters<typeof mergeFirstTouch>[1]> = {}) {
  return mergeFirstTouch(null, {
    deviceId: DEVICE,
    installSource: "unknown",
    at: "2026-10-05T05:00:00.000Z",
    ...over,
  });
}

describe("paid-user identity + attribution loop", () => {
  it("A/B: fresh install first_open before login has device identity and no Firebase uid", () => {
    const row = firstTouch();
    assert.equal(row.deviceId, DEVICE);
    assert.equal(row.canonicalUserId, null);
    assert.equal(row.firebaseUid, null);
    assert.equal(row.attributionStatus, ATTRIBUTION_UNKNOWN);
  });

  it("C: attribution before login stores click ids without inferring from google_ads label", () => {
    const labeledOnly = firstTouch({ installSource: "google_ads" });
    assert.equal(labeledOnly.attributionStatus, ATTRIBUTION_UNKNOWN);
    assert.equal(isGoogleAdsAttributed(labeledOnly), false);

    const withGclid = firstTouch({
      installSource: "google_ads",
      gclid: "CjwKCAjw",
      campaignId: "23986249354",
    });
    assert.equal(withGclid.attributionStatus, GOOGLE_ADS_VERIFIED);
    assert.equal(isGoogleAdsAttributed(withGclid), true);
    assert.equal(withGclid.campaignId, "23986249354");
  });

  it("D: login stitching attaches canonical user and keeps first-touch gclid", () => {
    const before = firstTouch({ gclid: "gclid-1", campaignId: "23986249354", installSource: "google_ads" });
    const after = stitchCanonicalUser(before, UID);
    assert.equal(after.canonicalUserId, UID);
    assert.equal(after.firebaseUid, UID);
    assert.equal(after.gclid, "gclid-1");
    assert.equal(after.firstTouchAt, before.firstTouchAt);
  });

  it("E/N: RevenueCat identity sync is deterministic and refuses anonymous purchase", () => {
    assert.equal(isRevenueCatAnonymousId("$RCAnonymousID:abc"), true);
    assert.equal(requiredRevenueCatUserId(UID, "$RCAnonymousID:abc"), UID);
    assert.equal(shouldRefuseAnonymousPurchase(UID, "$RCAnonymousID:abc"), true);
    assert.equal(shouldRefuseAnonymousPurchase(UID, UID), false);
    assert.equal(shouldRefuseAnonymousPurchase(null, "$RCAnonymousID:abc"), true);
    assert.equal(shouldRefuseAnonymousPurchase(UID, "otherUidXXXXXXXXXXXX"), true);
  });

  it("F/G: WebView reload and app restart reuse the same device first-touch", () => {
    const first = firstTouch({ gclid: "gclid-1" });
    const reload = mergeFirstTouch(first, {
      deviceId: DEVICE,
      installSource: "google_ads",
      at: "2026-10-05T06:00:00.000Z",
    });
    assert.equal(reload.gclid, "gclid-1");
    assert.equal(reload.firstTouchAt, first.firstTouchAt);
    assert.equal(reload.lastTouchAt, "2026-10-05T06:00:00.000Z");
  });

  it("H/I: retry after failed preauth does not mark attribution delivered with empty click ids", () => {
    const failed = firstTouch();
    const retry = mergeFirstTouch(failed, {
      deviceId: DEVICE,
      gclid: "gclid-retry",
      at: "2026-10-05T05:01:00.000Z",
    });
    assert.equal(retry.gclid, "gclid-retry");
    assert.equal(retry.attributionStatus, GOOGLE_ADS_VERIFIED);
  });

  it("J/K: duplicate first_open / attribution never overwrite valid first-touch with null", () => {
    const first = firstTouch({ gclid: "gclid-1", gbraid: "gb-1", wbraid: "wb-1", campaignId: "23986249354" });
    const dup = mergeFirstTouch(first, {
      deviceId: DEVICE,
      gclid: null,
      gbraid: "",
      wbraid: undefined,
      campaignId: null,
      at: "2026-10-05T07:00:00.000Z",
    });
    assert.equal(dup.gclid, "gclid-1");
    assert.equal(dup.gbraid, "gb-1");
    assert.equal(dup.wbraid, "wb-1");
    assert.equal(dup.campaignId, "23986249354");
    assert.equal(dup.attributionStatus, GOOGLE_ADS_VERIFIED);
  });

  it("L/M/O: purchase under authenticated user joins subscription to canonical user", () => {
    const attr = stitchCanonicalUser(
      firstTouch({ gclid: "gclid-1", campaignId: "23986249354" }),
      UID,
    );
    const props = buildServerPurchaseSuccessProps({
      transactionId: "GPA.123",
      productId: "monthly",
      store: "play_store",
      providerEventId: "rc-evt-1",
      attribution: attr,
    });
    assert.equal(props.step, "purchase_success");
    assert.equal(props.source, "server");
    assert.equal(props.transaction_id, "GPA.123");
    assert.equal(props.gclid, "gclid-1");
    assert.equal(props.campaign_id, "23986249354");
    assert.equal(props.attribution_status, GOOGLE_ADS_VERIFIED);
  });

  it("P: subscription → attribution join answers campaign only when click id exists", () => {
    const attributed = stitchCanonicalUser(
      firstTouch({ gclid: "gclid-1", campaignId: "23986249354", installSource: "google_ads" }),
      UID,
    );
    assert.equal(campaignForAttributedPurchase(attributed), "23986249354");
    const unknown = stitchCanonicalUser(firstTouch({ installSource: "google_ads" }), UID);
    assert.equal(campaignForAttributedPurchase(unknown), null);
  });

  it("Q: missing attribution is explicitly ATTRIBUTION_UNKNOWN", () => {
    assert.equal(resolveAttributionStatus({}), ATTRIBUTION_UNKNOWN);
    assert.equal(hasSupportedClickId({}), false);
    const props = buildServerPurchaseSuccessProps({
      transactionId: "GPA.none",
      attribution: null,
    });
    assert.equal(props.attribution_status, ATTRIBUTION_UNKNOWN);
    assert.equal("gclid" in props, false);
  });

  it("R: Ads conversion prepare never uploads while paused and dedupes by transaction", () => {
    const attr = stitchCanonicalUser(
      firstTouch({ gclid: "gclid-1", campaignId: "23986249354" }),
      UID,
    );
    const paused = prepareAdsPurchaseConversion({
      transactionId: "GPA.123",
      conversionAt: "2026-10-05T08:00:00.000Z",
      attribution: attr,
      adsUploadEnabled: false,
    });
    assert.equal(paused.shouldUpload, false);
    assert.equal(paused.status, "blocked_ads_paused");
    assert.equal(paused.clickId, "gclid-1");
    assert.equal(paused.conversionAction, ADS_PURCHASE_CONVERSION_ACTION);

    const noClick = prepareAdsPurchaseConversion({
      transactionId: "GPA.124",
      conversionAt: "2026-10-05T08:00:00.000Z",
      attribution: stitchCanonicalUser(firstTouch({ installSource: "google_ads" }), UID),
      adsUploadEnabled: true,
    });
    assert.equal(noClick.shouldUpload, false);
    assert.equal(noClick.status, "skipped_no_click_id");
    assert.equal(adsConversionDedupeKey("GPA.123"), `GPA.123::${ADS_PURCHASE_CONVERSION_ACTION}`);
  });

  it("extracts click ids from ingest props without using install_source as proof", () => {
    const extracted = extractClickIdsFromProps({
      source: "google_ads",
      gclid: "gclid-1",
      campaign_id: "23986249354",
    });
    assert.equal(extracted.gclid, "gclid-1");
    assert.equal(extracted.installSource, "google_ads");
    assert.equal(resolveAttributionStatus(extracted), GOOGLE_ADS_VERIFIED);
  });

  it("organic install_source is OTHER_SOURCE_VERIFIED, google_ads without click id stays unknown", () => {
    assert.equal(firstTouch({ installSource: "organic" }).attributionStatus, OTHER_SOURCE_VERIFIED);
    assert.equal(firstTouch({ installSource: "google_ads" }).attributionStatus, ATTRIBUTION_UNKNOWN);
    const laterUnknown = mergeFirstTouch(firstTouch({ installSource: "organic", gclid: "gclid-1" }), {
      deviceId: DEVICE,
      installSource: "unknown",
      gclid: null,
      at: "2026-10-05T09:00:00.000Z",
    });
    assert.equal(laterUnknown.gclid, "gclid-1");
    assert.equal(laterUnknown.installSource, "organic");
    assert.equal(laterUnknown.attributionStatus, GOOGLE_ADS_VERIFIED);
    assert.equal(ATTRIBUTED, GOOGLE_ADS_VERIFIED);
  });
});
