/**
 * Durable acquisition registry. Best-effort: missing table (migration not
 * applied) must not break analytics or billing.
 */
import { db, userAcquisitionAttributionTable, adsConversionUploadLedgerTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  type AttributionRecord,
  type AttributionStatus,
  ATTRIBUTION_UNKNOWN,
  GOOGLE_ADS_VERIFIED,
  OTHER_SOURCE_VERIFIED,
  extractClickIdsFromProps,
  mergeFirstTouch,
  prepareAdsPurchaseConversion,
  stitchCanonicalUser,
} from "./acquisitionAttributionLogic";

function parseAttributionStatus(value: string): AttributionStatus {
  if (value === GOOGLE_ADS_VERIFIED || value === "ATTRIBUTED") return GOOGLE_ADS_VERIFIED;
  if (value === OTHER_SOURCE_VERIFIED) return OTHER_SOURCE_VERIFIED;
  return ATTRIBUTION_UNKNOWN;
}

function toRecord(row: {
  deviceId: string;
  canonicalUserId: string | null;
  firebaseUid: string | null;
  installSource: string;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  campaignId: string | null;
  firstTouchAt: Date;
  lastTouchAt: Date;
  sourceMetadata: Record<string, unknown> | null;
  attributionStatus: string;
}): AttributionRecord {
  return {
    deviceId: row.deviceId,
    canonicalUserId: row.canonicalUserId,
    firebaseUid: row.firebaseUid,
    installSource: row.installSource,
    gclid: row.gclid,
    gbraid: row.gbraid,
    wbraid: row.wbraid,
    campaignId: row.campaignId,
    firstTouchAt: row.firstTouchAt.toISOString(),
    lastTouchAt: row.lastTouchAt.toISOString(),
    sourceMetadata: row.sourceMetadata ?? {},
    attributionStatus: parseAttributionStatus(row.attributionStatus),
  };
}

async function persist(record: AttributionRecord): Promise<void> {
  await db
    .insert(userAcquisitionAttributionTable)
    .values({
      deviceId: record.deviceId,
      canonicalUserId: record.canonicalUserId,
      firebaseUid: record.firebaseUid,
      installSource: record.installSource,
      gclid: record.gclid,
      gbraid: record.gbraid,
      wbraid: record.wbraid,
      campaignId: record.campaignId,
      firstTouchAt: new Date(record.firstTouchAt),
      lastTouchAt: new Date(record.lastTouchAt),
      sourceMetadata: record.sourceMetadata,
      attributionStatus: record.attributionStatus,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userAcquisitionAttributionTable.deviceId,
      set: {
        canonicalUserId: record.canonicalUserId,
        firebaseUid: record.firebaseUid,
        installSource: record.installSource,
        gclid: record.gclid,
        gbraid: record.gbraid,
        wbraid: record.wbraid,
        campaignId: record.campaignId,
        lastTouchAt: new Date(record.lastTouchAt),
        sourceMetadata: record.sourceMetadata,
        attributionStatus: record.attributionStatus,
        updatedAt: new Date(),
      },
    });
}

export async function recordPreauthAttribution(
  deviceId: string,
  events: Array<{ name: string; props?: Record<string, unknown> }>,
): Promise<AttributionRecord | null> {
  try {
    const existingRows = await db
      .select()
      .from(userAcquisitionAttributionTable)
      .where(eq(userAcquisitionAttributionTable.deviceId, deviceId))
      .limit(1);
    let current = existingRows[0] ? toRecord(existingRows[0]) : null;
    const now = new Date().toISOString();
    let touched = false;
    for (const ev of events) {
      if (ev.name !== "first_open" && ev.name !== "install_source") continue;
      touched = true;
      const ids = extractClickIdsFromProps(ev.props);
      current = mergeFirstTouch(current, {
        deviceId,
        installSource: ids.installSource,
        gclid: ids.gclid,
        gbraid: ids.gbraid,
        wbraid: ids.wbraid,
        campaignId: ids.campaignId,
        sourceMetadata: { lastEvent: ev.name },
        at: now,
      });
    }
    if (!touched) return current;
    if (!current) {
      current = mergeFirstTouch(null, { deviceId, at: now });
    }
    await persist(current);
    return current;
  } catch (err) {
    logger.warn({ err, evt: "attribution.preauth_persist_failed" }, "attribution persist skipped");
    return null;
  }
}

export async function stitchAcquisitionAttribution(
  deviceId: string,
  canonicalUserId: string,
): Promise<AttributionRecord | null> {
  try {
    const existingRows = await db
      .select()
      .from(userAcquisitionAttributionTable)
      .where(eq(userAcquisitionAttributionTable.deviceId, deviceId))
      .limit(1);
    const now = new Date().toISOString();
    const base = existingRows[0]
      ? toRecord(existingRows[0])
      : mergeFirstTouch(null, { deviceId, at: now });
    const stitched = stitchCanonicalUser(base, canonicalUserId);
    await persist(stitched);
    return stitched;
  } catch (err) {
    logger.warn({ err, evt: "attribution.stitch_failed" }, "attribution stitch skipped");
    return null;
  }
}

export async function lookupAcquisitionAttribution(input: {
  canonicalUserId?: string | null;
  deviceId?: string | null;
}): Promise<AttributionRecord | null> {
  try {
    const clauses = [];
    if (input.canonicalUserId) {
      clauses.push(eq(userAcquisitionAttributionTable.canonicalUserId, input.canonicalUserId));
      clauses.push(eq(userAcquisitionAttributionTable.firebaseUid, input.canonicalUserId));
    }
    if (input.deviceId) {
      clauses.push(eq(userAcquisitionAttributionTable.deviceId, input.deviceId));
    }
    if (clauses.length === 0) return null;
    const rows = await db
      .select()
      .from(userAcquisitionAttributionTable)
      .where(or(...clauses))
      .limit(1);
    return rows[0] ? toRecord(rows[0]) : null;
  } catch (err) {
    logger.warn({ err, evt: "attribution.lookup_failed" }, "attribution lookup skipped");
    return null;
  }
}

export async function recordPreparedAdsConversion(input: {
  transactionId: string;
  conversionAt: Date;
  attribution: AttributionRecord | null;
  valueMicros?: string;
  currency?: string;
  canonicalUserId?: string | null;
  eventName?: string;
}): Promise<{ status: string; shouldUpload: false }> {
  const prepared = prepareAdsPurchaseConversion({
    transactionId: input.transactionId,
    conversionAt: input.conversionAt.toISOString(),
    attribution: input.attribution,
    valueMicros: input.valueMicros,
    currency: input.currency,
    adsUploadEnabled: false,
  });
  try {
    await db
      .insert(adsConversionUploadLedgerTable)
      .values({
        transactionId: prepared.transactionId,
        conversionAction: prepared.conversionAction,
        clickId: prepared.clickId,
        clickIdType: prepared.clickIdType,
        conversionAt: input.conversionAt,
        currency: prepared.currency,
        valueMicros: prepared.valueMicros,
        status: prepared.status,
        canonicalUserId: input.canonicalUserId ?? input.attribution?.canonicalUserId ?? null,
        eventName: input.eventName ?? "purchase",
        eventTime: input.conversionAt,
        gclid: input.attribution?.gclid ?? null,
        gbraid: input.attribution?.gbraid ?? null,
        wbraid: input.attribution?.wbraid ?? null,
        campaignId: input.attribution?.campaignId ?? null,
        source: "revenuecat_webhook",
        dedupeKey: `${prepared.transactionId}::${prepared.conversionAction}`,
        uploadStatus: "blocked_ads_paused",
        uploadAttempts: 0,
      })
      .onConflictDoNothing();
  } catch (err) {
    logger.warn({ err, evt: "ads_conversion.prepare_failed" }, "ads conversion ledger skipped");
  }
  return { status: prepared.status, shouldUpload: false };
}
