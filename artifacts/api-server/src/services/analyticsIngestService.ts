/**
 * Validates and persists product analytics events into the unified
 * analytics_events spine. Every event is checked against
 * @workspace/analytics-taxonomy; malformed events are dropped and counted
 * for data-quality monitoring.
 *
 * Pure measurement — this path never influences routine generation.
 */
import { db, analyticsEventsTable, type InsertAnalyticsEvent } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import {
  validateAnalyticsEvent,
  ANALYTICS_MAX_PROPS_BYTES,
} from "@workspace/analytics-taxonomy";
import { logger } from "../lib/logger";
import {
  analyticsSpineColumnsReady,
  applyServerIdentity,
  isUniqueViolation,
  pickSpineProps,
  purchaseDedupeKey,
  scrubServerAnalyticsProps,
  spineColumnsFromProps,
  transactionIdOf,
} from "./analyticsSpine";

export type RawAnalyticsEvent = {
  name: string;
  props?: Record<string, unknown>;
  sessionId?: string;
  clientTs?: string;
  platform?: string;
  appVersion?: string;
  /** Client idempotency key. Retries with the same id are acknowledged once. */
  eventId?: string;
};

export type AnalyticsIngestContext = {
  userId: string;
  platform?: string;
  appVersion?: string;
  /** Header device id. Never taken from a client-claimed user id. */
  deviceId?: string | null;
};

export type AnalyticsIngestSummary = {
  received: number;
  accepted: number;
  rejected: number;
  duplicates: number;
  acceptedEventIds: string[];
  duplicateEventIds: string[];
  droppedEventIds: string[];
  byReason: { unknown_event: number; invalid_props: number; too_large: number };
};

/**
 * In-memory data-quality tally. Cheap, process-local, and good enough for
 * launch-stage monitoring (mirrors the client-logs buffer pattern). Surfaced
 * via the admin analytics readout.
 */
const quality = {
  since: Date.now(),
  accepted: 0,
  rejectedUnknownEvent: 0,
  rejectedInvalidProps: 0,
  rejectedTooLarge: 0,
  unknownEventNames: new Map<string, number>(),
};

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toDateOrNull(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function numericChildId(props: Record<string, unknown>): number | null {
  const v = props["childId"];
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}

function noteDropped(summary: AnalyticsIngestSummary, eventId: string | undefined): void {
  if (eventId) summary.droppedEventIds.push(eventId);
}

function noteDuplicate(summary: AnalyticsIngestSummary, eventId: string | undefined): void {
  summary.duplicates += 1;
  if (eventId) summary.duplicateEventIds.push(eventId);
}

async function eventIdExists(eventId: string, columnsReady: boolean): Promise<boolean> {
  if (columnsReady) {
    const byColumn = await db
      .select({ id: analyticsEventsTable.id })
      .from(analyticsEventsTable)
      .where(eq(analyticsEventsTable.eventId, eventId))
      .limit(1);
    if (byColumn.length > 0) return true;
  }
  const byProps = await db.execute(sql`
    SELECT id FROM analytics_events
    WHERE props->>'event_id' = ${eventId}
    LIMIT 1
  `);
  return byProps.rows.length > 0;
}

async function findPurchaseDuplicate(
  eventName: string,
  props: Record<string, unknown>,
): Promise<{ id: number; props: Record<string, unknown> } | null> {
  if (!purchaseDedupeKey(eventName, props)) return null;
  const txn = transactionIdOf(props);
  if (!txn) return null;
  const rows = await db
    .select({
      id: analyticsEventsTable.id,
      props: analyticsEventsTable.props,
    })
    .from(analyticsEventsTable)
    .where(
      and(
        eq(analyticsEventsTable.eventName, eventName),
        sql`${analyticsEventsTable.props}->>'transaction_id' = ${txn}`,
      ),
    )
    .limit(5);
  for (const row of rows) {
    const stored = (row.props ?? {}) as Record<string, unknown>;
    if (eventName === "subscription_funnel_event" && stored.step !== "purchase_success") {
      continue;
    }
    return { id: row.id, props: stored };
  }
  return null;
}

export async function ingestAnalyticsEvents(
  events: RawAnalyticsEvent[],
  ctx: AnalyticsIngestContext,
): Promise<AnalyticsIngestSummary> {
  const summary: AnalyticsIngestSummary = {
    received: events.length,
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    acceptedEventIds: [],
    duplicateEventIds: [],
    droppedEventIds: [],
    byReason: { unknown_event: 0, invalid_props: 0, too_large: 0 },
  };

  const columnsReady = await analyticsSpineColumnsReady();
  const rows: Array<{ row: InsertAnalyticsEvent; eventId?: string }> = [];
  let skipFirstOpen = false;
  if (events.some((ev) => ev.name === "first_open")) {
    const existing = await db
      .select({ id: analyticsEventsTable.id })
      .from(analyticsEventsTable)
      .where(
        and(
          eq(analyticsEventsTable.userId, ctx.userId),
          eq(analyticsEventsTable.eventName, "first_open"),
        ),
      )
      .limit(1);
    skipFirstOpen = existing.length > 0;
  }

  for (const ev of events) {
    const eventId = ev.eventId?.trim().slice(0, 64) || undefined;
    if (ev.name === "first_open" && skipFirstOpen) {
      noteDuplicate(summary, eventId);
      continue;
    }
    if (eventId && (await eventIdExists(eventId, columnsReady))) {
      noteDuplicate(summary, eventId);
      continue;
    }

    const rawProps = scrubServerAnalyticsProps(ev.props ?? {});

    let serializedSize = 0;
    try {
      serializedSize = JSON.stringify(rawProps).length;
    } catch {
      serializedSize = ANALYTICS_MAX_PROPS_BYTES + 1;
    }
    if (serializedSize > ANALYTICS_MAX_PROPS_BYTES) {
      summary.rejected++;
      summary.byReason.too_large++;
      quality.rejectedTooLarge++;
      noteDropped(summary, eventId);
      continue;
    }

    const result = validateAnalyticsEvent(ev.name, rawProps);
    if (!result.valid) {
      summary.rejected++;
      noteDropped(summary, eventId);
      if (result.reason === "unknown_event") {
        summary.byReason.unknown_event++;
        quality.rejectedUnknownEvent++;
        bump(quality.unknownEventNames, String(ev.name).slice(0, 64));
      } else {
        summary.byReason.invalid_props++;
        quality.rejectedInvalidProps++;
      }
      continue;
    }

    const merged = applyServerIdentity(
      { ...result.props, ...pickSpineProps(rawProps) },
      { userId: ctx.userId, deviceId: ctx.deviceId, eventId },
    );
    if (purchaseDedupeKey(result.name, merged) && merged.source !== "server" && !merged.source) {
      merged.source = "client";
    }

    const purchase = await findPurchaseDuplicate(result.name, merged);
    if (purchase) {
      const incomingServer = merged.source === "server";
      const storedServer = purchase.props.source === "server";
      if (incomingServer && !storedServer) {
        await db
          .update(analyticsEventsTable)
          .set({ props: { ...purchase.props, ...merged, source: "server" } })
          .where(eq(analyticsEventsTable.id, purchase.id));
      }
      noteDuplicate(summary, eventId);
      continue;
    }

    const spine = spineColumnsFromProps(merged, {
      userId: ctx.userId,
      deviceId: ctx.deviceId,
      eventId,
    });
    const base: InsertAnalyticsEvent = {
      userId: ctx.userId,
      childId: numericChildId(merged),
      eventName: result.name,
      eventCategory: result.category,
      sessionId: ev.sessionId?.slice(0, 128) ?? null,
      props: merged,
      platform: (ev.platform ?? ctx.platform)?.slice(0, 32) ?? null,
      appVersion: (ev.appVersion ?? ctx.appVersion)?.slice(0, 32) ?? null,
      clientTs: toDateOrNull(ev.clientTs),
    };
    rows.push({
      eventId,
      row: columnsReady ? { ...base, ...spine } : base,
    });
    if (result.name === "first_open") skipFirstOpen = true;
  }

  if (rows.length > 0) {
    const CHUNK = 50;
    let insertError: unknown = null;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      try {
        await db.insert(analyticsEventsTable).values(chunk.map((item) => item.row));
        summary.accepted += chunk.length;
        quality.accepted += chunk.length;
        for (const item of chunk) {
          if (item.eventId) summary.acceptedEventIds.push(item.eventId);
        }
      } catch (err) {
        insertError = err;
        for (const item of chunk) {
          try {
            await db.insert(analyticsEventsTable).values(item.row);
            summary.accepted += 1;
            quality.accepted += 1;
            if (item.eventId) summary.acceptedEventIds.push(item.eventId);
          } catch (rowErr) {
            if (isUniqueViolation(rowErr)) {
              noteDuplicate(summary, item.eventId);
              continue;
            }
            summary.rejected += 1;
            logger.warn(
              { err: rowErr, evt: "analytics.row_insert_failed", eventName: item.row.eventName, userId: ctx.userId },
              "analytics single-row insert failed",
            );
          }
        }
      }
    }
    if (summary.accepted === 0 && summary.duplicates === 0 && insertError) {
      logger.error(
        { err: insertError, evt: "analytics.ingest_failed", userId: ctx.userId, batchSize: rows.length },
        "analytics ingest insert failed for entire batch",
      );
      throw insertError;
    }
  }

  return summary;
}

export type AnalyticsQualitySnapshot = {
  sinceIso: string;
  accepted: number;
  rejected: { unknownEvent: number; invalidProps: number; tooLarge: number };
  invalidRate: number;
  topUnknownEventNames: Array<{ name: string; count: number }>;
};

export function getAnalyticsQuality(): AnalyticsQualitySnapshot {
  const rejected =
    quality.rejectedUnknownEvent +
    quality.rejectedInvalidProps +
    quality.rejectedTooLarge;
  const total = quality.accepted + rejected;
  const topUnknownEventNames = [...quality.unknownEventNames.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    sinceIso: new Date(quality.since).toISOString(),
    accepted: quality.accepted,
    rejected: {
      unknownEvent: quality.rejectedUnknownEvent,
      invalidProps: quality.rejectedInvalidProps,
      tooLarge: quality.rejectedTooLarge,
    },
    invalidRate: total === 0 ? 0 : Math.round((rejected / total) * 1000) / 1000,
    topUnknownEventNames,
  };
}

/** Test/maintenance helper: reset the in-memory data-quality tally. */
export function resetAnalyticsQuality(): void {
  quality.since = Date.now();
  quality.accepted = 0;
  quality.rejectedUnknownEvent = 0;
  quality.rejectedInvalidProps = 0;
  quality.rejectedTooLarge = 0;
  quality.unknownEventNames.clear();
}
