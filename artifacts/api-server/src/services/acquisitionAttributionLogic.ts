export const ATTRIBUTION_UNKNOWN = "ATTRIBUTION_UNKNOWN" as const;
export const GOOGLE_ADS_VERIFIED = "GOOGLE_ADS_VERIFIED" as const;
export const OTHER_SOURCE_VERIFIED = "OTHER_SOURCE_VERIFIED" as const;
/** @deprecated Use GOOGLE_ADS_VERIFIED. Kept so older rows still parse. */
export const ATTRIBUTED = GOOGLE_ADS_VERIFIED;
export const ADS_PURCHASE_CONVERSION_ACTION = "7665026069";

export type AttributionStatus =
  | typeof GOOGLE_ADS_VERIFIED
  | typeof OTHER_SOURCE_VERIFIED
  | typeof ATTRIBUTION_UNKNOWN;

export type ClickIds = {
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  campaignId?: string | null;
};

export type AttributionRecord = {
  deviceId: string;
  canonicalUserId: string | null;
  firebaseUid: string | null;
  installSource: string;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  campaignId: string | null;
  firstTouchAt: string;
  lastTouchAt: string;
  sourceMetadata: Record<string, unknown>;
  attributionStatus: AttributionStatus;
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed.slice(0, 128) : null;
}

export function isRevenueCatAnonymousId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("$RCAnonymousID:");
}

export function isCanonicalUserId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.length >= 8 && !id.startsWith("device:") && !isRevenueCatAnonymousId(id);
}

export function hasSupportedClickId(input: ClickIds): boolean {
  return Boolean(clean(input.gclid) || clean(input.gbraid) || clean(input.wbraid));
}

export function resolveAttributionStatus(
  input: ClickIds & { installSource?: string | null },
): AttributionStatus {
  if (hasSupportedClickId(input)) return GOOGLE_ADS_VERIFIED;
  const source = (input.installSource ?? "").trim();
  if (source && source !== "unknown" && source !== "google_ads") {
    return OTHER_SOURCE_VERIFIED;
  }
  return ATTRIBUTION_UNKNOWN;
}

/** google_ads label without a click id is NOT attributed. */
export function isGoogleAdsAttributed(record: Pick<AttributionRecord, "attributionStatus" | "gclid" | "gbraid" | "wbraid">): boolean {
  return record.attributionStatus === GOOGLE_ADS_VERIFIED && hasSupportedClickId(record);
}

export function campaignForAttributedPurchase(record: AttributionRecord): string | null {
  if (!isGoogleAdsAttributed(record)) return null;
  return clean(record.campaignId);
}

export function mergeFirstTouch(
  existing: AttributionRecord | null,
  incoming: {
    deviceId: string;
    canonicalUserId?: string | null;
    firebaseUid?: string | null;
    installSource?: string | null;
    gclid?: string | null;
    gbraid?: string | null;
    wbraid?: string | null;
    campaignId?: string | null;
    sourceMetadata?: Record<string, unknown>;
    at: string;
  },
): AttributionRecord {
  const gclid = clean(incoming.gclid) ?? existing?.gclid ?? null;
  const gbraid = clean(incoming.gbraid) ?? existing?.gbraid ?? null;
  const wbraid = clean(incoming.wbraid) ?? existing?.wbraid ?? null;
  const campaignId = clean(incoming.campaignId) ?? existing?.campaignId ?? null;
  const installSource = preferInstallSource(incoming.installSource, existing?.installSource);
  const clickIds = { gclid, gbraid, wbraid, campaignId, installSource };
  return {
    deviceId: incoming.deviceId || existing?.deviceId || "",
    canonicalUserId: isCanonicalUserId(incoming.canonicalUserId)
      ? incoming.canonicalUserId!
      : existing?.canonicalUserId ?? null,
    firebaseUid: isCanonicalUserId(incoming.firebaseUid)
      ? incoming.firebaseUid!
      : existing?.firebaseUid ?? null,
    installSource,
    gclid,
    gbraid,
    wbraid,
    campaignId,
    firstTouchAt: existing?.firstTouchAt ?? incoming.at,
    lastTouchAt: incoming.at,
    sourceMetadata: {
      ...(existing?.sourceMetadata ?? {}),
      ...(incoming.sourceMetadata ?? {}),
    },
    attributionStatus: resolveAttributionStatus(clickIds),
  };
}

function preferInstallSource(incoming?: string | null, existing?: string | null): string {
  const next = incoming?.trim() || "";
  const prev = existing?.trim() || "";
  if (prev && prev !== "unknown") return prev;
  if (next) return next;
  return prev || "unknown";
}

export function stitchCanonicalUser(
  record: AttributionRecord,
  canonicalUserId: string,
  firebaseUid = canonicalUserId,
): AttributionRecord {
  if (!isCanonicalUserId(canonicalUserId)) return record;
  return {
    ...record,
    canonicalUserId,
    firebaseUid: isCanonicalUserId(firebaseUid) ? firebaseUid : record.firebaseUid,
  };
}

export function extractClickIdsFromProps(props: Record<string, unknown> | undefined): ClickIds & { installSource?: string } {
  const p = props ?? {};
  const str = (key: string): string | null =>
    typeof p[key] === "string" ? (p[key] as string) : null;
  return {
    gclid: str("gclid"),
    gbraid: str("gbraid"),
    wbraid: str("wbraid"),
    campaignId: str("campaign_id") ?? str("campaignId"),
    installSource: str("source") ?? str("install_source") ?? undefined,
  };
}

export function shouldRefuseAnonymousPurchase(
  persistedCanonicalUserId: string | null,
  currentRevenueCatAppUserId: string | null,
): boolean {
  if (!isCanonicalUserId(persistedCanonicalUserId)) return true;
  if (!currentRevenueCatAppUserId || isRevenueCatAnonymousId(currentRevenueCatAppUserId)) return true;
  return currentRevenueCatAppUserId !== persistedCanonicalUserId;
}

export function requiredRevenueCatUserId(
  persistedCanonicalUserId: string | null,
  currentRevenueCatAppUserId: string | null,
): string | null {
  if (!isCanonicalUserId(persistedCanonicalUserId)) return null;
  if (
    currentRevenueCatAppUserId === persistedCanonicalUserId &&
    !isRevenueCatAnonymousId(currentRevenueCatAppUserId)
  ) {
    return persistedCanonicalUserId;
  }
  return persistedCanonicalUserId;
}

export function adsConversionDedupeKey(transactionId: string, conversionAction = ADS_PURCHASE_CONVERSION_ACTION): string {
  return `${transactionId.trim()}::${conversionAction}`;
}

export function prepareAdsPurchaseConversion(input: {
  transactionId: string;
  conversionAt: string;
  attribution: AttributionRecord | null;
  valueMicros?: string;
  currency?: string;
  adsUploadEnabled?: boolean;
}): {
  status: "prepared" | "skipped_no_click_id" | "duplicate" | "blocked_ads_paused";
  clickId: string | null;
  clickIdType: "gclid" | "gbraid" | "wbraid" | null;
  conversionAction: string;
  transactionId: string;
  conversionAt: string;
  currency: string;
  valueMicros: string | null;
  shouldUpload: boolean;
} {
  const clickId = clean(input.attribution?.gclid)
    ? { id: clean(input.attribution?.gclid), type: "gclid" as const }
    : clean(input.attribution?.gbraid)
      ? { id: clean(input.attribution?.gbraid), type: "gbraid" as const }
      : clean(input.attribution?.wbraid)
        ? { id: clean(input.attribution?.wbraid), type: "wbraid" as const }
        : { id: null, type: null };
  if (!clickId.id || !input.attribution || !isGoogleAdsAttributed(input.attribution)) {
    return {
      status: "skipped_no_click_id",
      clickId: null,
      clickIdType: null,
      conversionAction: ADS_PURCHASE_CONVERSION_ACTION,
      transactionId: input.transactionId,
      conversionAt: input.conversionAt,
      currency: input.currency ?? "INR",
      valueMicros: input.valueMicros ?? null,
      shouldUpload: false,
    };
  }
  if (input.adsUploadEnabled !== true) {
    return {
      status: "blocked_ads_paused",
      clickId: clickId.id,
      clickIdType: clickId.type,
      conversionAction: ADS_PURCHASE_CONVERSION_ACTION,
      transactionId: input.transactionId,
      conversionAt: input.conversionAt,
      currency: input.currency ?? "INR",
      valueMicros: input.valueMicros ?? null,
      shouldUpload: false,
    };
  }
  return {
    status: "prepared",
    clickId: clickId.id,
    clickIdType: clickId.type,
    conversionAction: ADS_PURCHASE_CONVERSION_ACTION,
    transactionId: input.transactionId,
    conversionAt: input.conversionAt,
    currency: input.currency ?? "INR",
    valueMicros: input.valueMicros ?? null,
    shouldUpload: true,
  };
}

export function buildServerPurchaseSuccessProps(input: {
  transactionId: string;
  productId?: string;
  store?: string;
  providerEventId?: string;
  attribution?: AttributionRecord | null;
}): Record<string, string> {
  const attribution = input.attribution;
  const status = attribution ? attribution.attributionStatus : ATTRIBUTION_UNKNOWN;
  return {
    step: "purchase_success",
    source: "server",
    platform: "server",
    transaction_id: input.transactionId,
    ...(input.productId ? { product_id: input.productId } : {}),
    ...(input.store ? { store: input.store } : {}),
    ...(input.providerEventId ? { event_key: input.providerEventId } : {}),
    attribution_status: status,
    ...(attribution?.gclid ? { gclid: attribution.gclid } : {}),
    ...(attribution?.gbraid ? { gbraid: attribution.gbraid } : {}),
    ...(attribution?.wbraid ? { wbraid: attribution.wbraid } : {}),
    ...(attribution?.campaignId && status === GOOGLE_ADS_VERIFIED
      ? { campaign_id: attribution.campaignId }
      : {}),
    ...(attribution?.installSource ? { install_source: attribution.installSource } : {}),
  };
}
