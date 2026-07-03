/**
 * Validates and persists product analytics events into the unified
 * analytics_events spine. Every event is checked against
 * @workspace/analytics-taxonomy; malformed events are dropped and counted
 * for data-quality monitoring.
 *
 * Pure measurement — this path never influences routine generation.
 */
import { db, analyticsEventsTable, type InsertAnalyticsEvent } from "@workspace/db";
import {
  validateAnalyticsEvent,
  ANALYTICS_MAX_PROPS_BYTES,
} from "@workspace/analytics-taxonomy";
import { logger } from "../lib/logger";

export type RawAnalyticsEvent = {
  name: string;
  props?: Record<string, unknown>;
  sessionId?: string;
  clientTs?: string;
  platform?: string;
  appVersion?: string;
};

export type AnalyticsIngestContext = {
  userId: string;
  platform?: string;
  appVersion?: string;
};

export type AnalyticsIngestSummary = {
  received: number;
  accepted: number;
  rejected: number;
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

export async function ingestAnalyticsEvents(
  events: RawAnalyticsEvent[],
  ctx: AnalyticsIngestContext,
): Promise<AnalyticsIngestSummary> {
  const summary: AnalyticsIngestSummary = {
    received: events.length,
    accepted: 0,
    rejected: 0,
    byReason: { unknown_event: 0, invalid_props: 0, too_large: 0 },
  };

  const rows: InsertAnalyticsEvent[] = [];

  for (const ev of events) {
    const rawProps = ev.props ?? {};

    // Guard against oversized payloads before schema validation.
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
      continue;
    }

    const result = validateAnalyticsEvent(ev.name, rawProps);
    if (!result.valid) {
      summary.rejected++;
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

    rows.push({
      userId: ctx.userId,
      childId: numericChildId(result.props),
      eventName: result.name,
      eventCategory: result.category,
      sessionId: ev.sessionId?.slice(0, 128) ?? null,
      props: result.props,
      platform: (ev.platform ?? ctx.platform)?.slice(0, 32) ?? null,
      appVersion: (ev.appVersion ?? ctx.appVersion)?.slice(0, 32) ?? null,
      clientTs: toDateOrNull(ev.clientTs),
    });
  }

  if (rows.length > 0) {
    const CHUNK = 50;
    let insertError: unknown = null;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      try {
        await db.insert(analyticsEventsTable).values(chunk);
        summary.accepted += chunk.length;
        quality.accepted += chunk.length;
      } catch (err) {
        insertError = err;
        for (const row of chunk) {
          try {
            await db.insert(analyticsEventsTable).values(row);
            summary.accepted += 1;
            quality.accepted += 1;
          } catch (rowErr) {
            summary.rejected += 1;
            logger.warn(
              { err: rowErr, evt: "analytics.row_insert_failed", eventName: row.eventName, userId: ctx.userId },
              "analytics single-row insert failed",
            );
          }
        }
      }
    }
    if (summary.accepted === 0 && insertError) {
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
