/**
 * Persistent Golden Script queue — one run consumes exactly one golden.
 * Never regenerate consumed scripts. Never skip silently.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { allGoldenSeeds } from "../../golden-scripts/seeds.js";
import { buildGoldenScript } from "../../golden-scripts/build.js";
import type { GoldenScript } from "../../golden-scripts/types.js";
import type {
  FactoryProductionRecord,
  FactoryProductionStatus,
  GoldenQueueState,
} from "./types.js";

const QUEUE_FILE = "golden-factory-queue.json";

export function defaultQueuePath(dataDir: string): string {
  return join(dataDir, "content-factory", QUEUE_FILE);
}

/**
 * Bootstrap: mark golden-001..013 as historically consumed so automation
 * starts at golden-014 (013 already produced/uploaded before factory).
 */
export function createInitialQueueState(options?: {
  maxGoldenNum?: number;
  nextGoldenNum?: number;
  historicalThrough?: number;
}): GoldenQueueState {
  const maxGoldenNum = options?.maxGoldenNum ?? allGoldenSeeds().length;
  const historicalThrough = options?.historicalThrough ?? 13;
  const nextGoldenNum = options?.nextGoldenNum ?? historicalThrough + 1;
  const now = new Date().toISOString();
  const consumed: GoldenQueueState["consumed"] = {};
  for (let n = 1; n <= historicalThrough; n++) {
    const id = `golden-${String(n).padStart(3, "0")}`;
    consumed[id] = {
      status: n === 13 ? "PUBLISHED" : "PUBLISHED",
      updatedAt: now,
      note:
        n === 13
          ? "Pre-factory production (audio-fixed upload _gLsFmfA888)"
          : "Pre-factory historical — reserved; do not regenerate",
      youtubeVideoId: n === 13 ? "_gLsFmfA888" : undefined,
    };
  }
  return {
    version: "1.0.0",
    nextGoldenNum,
    maxGoldenNum,
    consumed,
    productions: [],
    updatedAt: now,
  };
}

export function loadQueue(path: string): GoldenQueueState {
  if (!existsSync(path)) {
    const state = createInitialQueueState();
    saveQueue(path, state);
    return state;
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as GoldenQueueState;
  if (!raw.version || !raw.nextGoldenNum) {
    throw new Error(`Invalid golden factory queue at ${path}`);
  }
  return raw;
}

export function saveQueue(path: string, state: GoldenQueueState): void {
  mkdirSync(dirname(path), { recursive: true });
  state.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(state, null, 2) + "\n");
}

export function peekNextGolden(state: GoldenQueueState): {
  goldenNum: number;
  goldenScriptId: string;
  script: GoldenScript;
} {
  let n = state.nextGoldenNum;
  while (n <= state.maxGoldenNum) {
    const id = `golden-${String(n).padStart(3, "0")}`;
    const prior = state.consumed[id];
    if (prior?.status === "PUBLISHED") {
      n += 1;
      continue;
    }
    if (prior?.status === "FAILED") {
      throw new Error(
        `Queue blocked on FAILED ${id}: ${prior.note ?? "fix production — do not skip; resume/fix before advancing"}`,
      );
    }
    const inFlight = prior && !["QUEUED", "PUBLISHED", "FAILED"].includes(prior.status);
    if (inFlight) {
      throw new Error(
        `Queue blocked on in-flight ${id} status=${prior!.status} runId=${prior!.runId ?? "n/a"}`,
      );
    }
    const seed = allGoldenSeeds()[n - 1];
    if (!seed) {
      throw new Error(`No golden seed for number ${n}`);
    }
    const script = buildGoldenScript(seed, n);
    if (script.id !== id) {
      throw new Error(`Expected ${id}, got ${script.id}`);
    }
    return { goldenNum: n, goldenScriptId: id, script };
  }
  throw new Error("Golden queue exhausted — no remaining scripts");
}

export function findProductionByIdempotency(
  state: GoldenQueueState,
  key: string,
): FactoryProductionRecord | undefined {
  return state.productions.find((p) => p.idempotencyKey === key);
}

export function upsertProduction(
  state: GoldenQueueState,
  record: FactoryProductionRecord,
): GoldenQueueState {
  const idx = state.productions.findIndex((p) => p.runId === record.runId);
  if (idx >= 0) state.productions[idx] = record;
  else state.productions.push(record);

  state.consumed[record.goldenScriptId] = {
    status: record.status,
    updatedAt: new Date().toISOString(),
    youtubeVideoId: record.youtubeVideoId,
    runId: record.runId,
    note: record.failureReason,
  };

  // Advance cursor only after PUBLISHED
  if (record.status === "PUBLISHED" && record.goldenNum >= state.nextGoldenNum) {
    state.nextGoldenNum = record.goldenNum + 1;
  }

  return state;
}

export function markStatus(
  state: GoldenQueueState,
  runId: string,
  status: FactoryProductionStatus,
  patch: Partial<FactoryProductionRecord> = {},
): GoldenQueueState {
  const rec = state.productions.find((p) => p.runId === runId);
  if (!rec) throw new Error(`Unknown runId ${runId}`);
  Object.assign(rec, patch, { status });
  return upsertProduction(state, rec);
}

export function summarizeQueue(state: GoldenQueueState): {
  nextGoldenNum: number;
  nextId: string;
  publishedCount: number;
  failedCount: number;
  queuedRemaining: number;
} {
  const publishedCount = Object.values(state.consumed).filter(
    (c) => c.status === "PUBLISHED",
  ).length;
  const failedCount = Object.values(state.consumed).filter(
    (c) => c.status === "FAILED",
  ).length;
  return {
    nextGoldenNum: state.nextGoldenNum,
    nextId: `golden-${String(state.nextGoldenNum).padStart(3, "0")}`,
    publishedCount,
    failedCount,
    queuedRemaining: Math.max(0, state.maxGoldenNum - state.nextGoldenNum + 1),
  };
}
