import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange, TimelineEvent } from "../types.js";
import { ANALYTICS_NOISE_FILTER, rowNum } from "../sqlHelpers.js";

const WATCH_EVENTS = [
  { name: "device_registered", label: "Install spike" },
  { name: "first_open", label: "First open spike" },
  { name: "routine_generated", label: "Routine generation shift" },
  { name: "error_captured", label: "Error spike" },
  { name: "upgrade_completed", label: "Purchase activity" },
] as const;

export async function computeExecutiveTimeline(range: GrowthTimeRange): Promise<TimelineEvent[]> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();
  const prevStart = range.previousStart.toISOString();
  const prevEnd = range.previousEnd.toISOString();

  const events: TimelineEvent[] = [];

  for (const watch of WATCH_EVENTS) {
    const res = await db.execute(sql`
      WITH current_hourly AS (
        SELECT date_trunc('hour', server_ts) AS hour, count(*)::int AS cnt
        FROM analytics_events
        WHERE event_name = ${watch.name}
          AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
          AND ${ANALYTICS_NOISE_FILTER}
        GROUP BY 1
      ),
      prior AS (
        SELECT count(*)::float AS total FROM analytics_events
        WHERE event_name = ${watch.name}
          AND server_ts >= ${prevStart}::timestamptz AND server_ts <= ${prevEnd}::timestamptz
          AND ${ANALYTICS_NOISE_FILTER}
      ),
      window_hours AS (
        SELECT greatest(1, extract(epoch FROM (${end}::timestamptz - ${start}::timestamptz)) / 3600)::float AS h
      )
      SELECT ch.hour, ch.cnt,
        (SELECT total FROM prior) / (SELECT h FROM window_hours) AS expected_per_hour
      FROM current_hourly ch
      ORDER BY ch.cnt DESC
      LIMIT 3
    `);

    for (const row of res.rows) {
      const r = row as Record<string, unknown>;
      const cnt = rowNum(r, "cnt");
      const expected = Number(r.expected_per_hour ?? 0);
      if (cnt < 3) continue;
      const ratio = expected > 0 ? cnt / expected : cnt;
      const hour = r.hour as Date | string;
      const ts = hour instanceof Date ? hour.toISOString() : String(hour);
      const timeLabel = new Date(ts).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      if (watch.name === "error_captured" && cnt >= 2) {
        events.push({
          timestamp: ts,
          label: `${timeLabel} — Crash / error increase detected`,
          severity: cnt >= 5 ? "critical" : "warning",
          detail: `${cnt} errors in hour bucket.`,
        });
      } else if (watch.name === "routine_generated" && ratio < 0.6 && cnt >= 3) {
        events.push({
          timestamp: ts,
          label: `${timeLabel} — Routine generation dropped`,
          severity: "warning",
          detail: `${cnt} routines vs ~${Math.round(expected)} expected hourly baseline.`,
        });
      } else if (ratio >= 1.8) {
        events.push({
          timestamp: ts,
          label: `${timeLabel} — ${watch.label}`,
          severity: watch.name === "upgrade_completed" ? "positive" : "info",
          detail: `${cnt} events (${Math.round(ratio * 100)}% of hourly baseline).`,
        });
      }
    }
  }

  const recoveryRes = await db.execute(sql`
    SELECT date_trunc('hour', server_ts) AS hour, count(*)::int AS cnt
    FROM analytics_events
    WHERE event_name = 'app_open'
      AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
    GROUP BY 1
    ORDER BY hour DESC
    LIMIT 5
  `);
  const opens = recoveryRes.rows.map((row) => rowNum(row as Record<string, unknown>, "cnt"));
  if (opens.length >= 3 && opens[0]! > opens[2]! * 1.2) {
    const lastHour = (recoveryRes.rows[0] as Record<string, unknown>).hour;
    const ts = lastHour instanceof Date ? lastHour.toISOString() : String(lastHour);
    const timeLabel = new Date(ts).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    events.push({
      timestamp: ts,
      label: `${timeLabel} — Recovery observed`,
      severity: "positive",
      detail: "App opens trending up in recent hourly buckets.",
    });
  }

  return events
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(0, 20);
}
