import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getWorkerHealthSnapshot,
  markMemoryDrainActive,
  markWorkerIdle,
  clearWorkerIdleReason,
} from "../worker/worker-health.js";

test("worker health fails when idle", async () => {
  markWorkerIdle("WORKER_ENABLED=false");
  const health = await getWorkerHealthSnapshot();
  assert.equal(health.ok, false);
  assert.ok(health.reasons.includes("WORKER_ENABLED=false"));
  clearWorkerIdleReason();
});

test("worker health ok for dev memory drain mode", async () => {
  const prevWorker = process.env.WORKER_ENABLED;
  const prevRedis = process.env.REDIS_URL;
  process.env.WORKER_ENABLED = "true";
  delete process.env.REDIS_URL;
  clearWorkerIdleReason();
  markMemoryDrainActive(true);
  try {
    const health = await getWorkerHealthSnapshot();
    assert.equal(health.memoryDrainActive, true);
    assert.equal(health.ok, true);
  } finally {
    if (prevWorker === undefined) delete process.env.WORKER_ENABLED;
    else process.env.WORKER_ENABLED = prevWorker;
    if (prevRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prevRedis;
    markMemoryDrainActive(false);
    clearWorkerIdleReason();
  }
});
