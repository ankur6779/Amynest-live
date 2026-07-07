import { sql } from "drizzle-orm";
import type { GrowthTimeRange } from "./types.js";

/** Exclude server-side device header noise from user-centric metrics. */
export const ANALYTICS_NOISE_FILTER = sql`event_name != 'device_header_missing'`;

export function rangeFilter(column: ReturnType<typeof sql>, range: GrowthTimeRange) {
  return sql`${column} >= ${range.start.toISOString()}::timestamptz AND ${column} <= ${range.end.toISOString()}::timestamptz`;
}

export function previousRangeFilter(column: ReturnType<typeof sql>, range: GrowthTimeRange) {
  return sql`${column} >= ${range.previousStart.toISOString()}::timestamptz AND ${column} <= ${range.previousEnd.toISOString()}::timestamptz`;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function pctRate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function toNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function rowNum(row: Record<string, unknown>, key: string): number {
  return toNum(row[key]);
}
