import type { TopicHistoryEntry } from "../types/index.js";

/** Pluggable topic-usage history for the rotation engine. */
export interface HistoryStore {
  getEntries(): TopicHistoryEntry[];
  record(entry: TopicHistoryEntry): void;
  recordMany(entries: TopicHistoryEntry[]): void;
  clear(): void;
}

/** In-memory history used by Phase 1 (no DB dependency). */
export class InMemoryHistoryStore implements HistoryStore {
  private entries: TopicHistoryEntry[];

  constructor(seed: TopicHistoryEntry[] = []) {
    this.entries = seed.map((e) => ({ ...e }));
  }

  getEntries(): TopicHistoryEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  record(entry: TopicHistoryEntry): void {
    this.entries.push({ ...entry });
  }

  recordMany(entries: TopicHistoryEntry[]): void {
    for (const entry of entries) this.record(entry);
  }

  clear(): void {
    this.entries = [];
  }
}

export function daysBetweenUtc(fromIsoDate: string, toIsoDate: string): number {
  const from = Date.parse(`${fromIsoDate}T00:00:00.000Z`);
  const to = Date.parse(`${toIsoDate}T00:00:00.000Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    throw new Error(`Invalid date(s): ${fromIsoDate}, ${toIsoDate}`);
  }
  return Math.floor((to - from) / (24 * 60 * 60 * 1000));
}
