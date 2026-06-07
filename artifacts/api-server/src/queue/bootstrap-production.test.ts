import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertProductionQueueConfig,
  getQueueMode,
  isProductionDeployment,
  isBullMqActive,
  markRedisBootstrapResult,
  resetQueueBootstrapStateForTests,
} from "./mode.js";

test("getQueueMode returns memory in non-production when worker disabled", () => {
  const prevNode = process.env.NODE_ENV;
  const prevWorker = process.env.WORKER_ENABLED;
  const prevAmy = process.env.AMYNEST_ENV;
  process.env.NODE_ENV = "development";
  process.env.AMYNEST_ENV = "development";
  process.env.WORKER_ENABLED = "false";
  resetQueueBootstrapStateForTests();
  try {
    assert.equal(isProductionDeployment(), false);
    assert.equal(getQueueMode(), "memory");
  } finally {
    process.env.NODE_ENV = prevNode;
    process.env.WORKER_ENABLED = prevWorker;
    if (prevAmy === undefined) delete process.env.AMYNEST_ENV;
    else process.env.AMYNEST_ENV = prevAmy;
  }
});

test("assertProductionQueueConfig throws when worker disabled in production", () => {
  const prevNode = process.env.NODE_ENV;
  const prevWorker = process.env.WORKER_ENABLED;
  const prevAmy = process.env.AMYNEST_ENV;
  process.env.NODE_ENV = "production";
  process.env.AMYNEST_ENV = "production";
  process.env.WORKER_ENABLED = "false";
  resetQueueBootstrapStateForTests();
  try {
    assert.throws(() => assertProductionQueueConfig(), /WORKER_ENABLED=true/);
  } finally {
    process.env.NODE_ENV = prevNode;
    process.env.WORKER_ENABLED = prevWorker;
    if (prevAmy === undefined) delete process.env.AMYNEST_ENV;
    else process.env.AMYNEST_ENV = prevAmy;
  }
});

test("getQueueMode throws in production when worker disabled", () => {
  const prevNode = process.env.NODE_ENV;
  const prevWorker = process.env.WORKER_ENABLED;
  const prevAmy = process.env.AMYNEST_ENV;
  process.env.NODE_ENV = "production";
  process.env.AMYNEST_ENV = "production";
  process.env.WORKER_ENABLED = "false";
  resetQueueBootstrapStateForTests();
  try {
    assert.throws(() => getQueueMode(), /WORKER_ENABLED=true/);
  } finally {
    process.env.NODE_ENV = prevNode;
    process.env.WORKER_ENABLED = prevWorker;
    if (prevAmy === undefined) delete process.env.AMYNEST_ENV;
    else process.env.AMYNEST_ENV = prevAmy;
  }
});

test("production resolves bullmq after successful redis bootstrap ping", () => {
  const prevNode = process.env.NODE_ENV;
  const prevWorker = process.env.WORKER_ENABLED;
  const prevAmy = process.env.AMYNEST_ENV;
  const prevRedis = process.env.REDIS_URL;
  process.env.NODE_ENV = "production";
  process.env.AMYNEST_ENV = "production";
  process.env.WORKER_ENABLED = "true";
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
  resetQueueBootstrapStateForTests();
  try {
    markRedisBootstrapResult(true);
    assert.equal(getQueueMode(), "bullmq");
    assert.equal(isBullMqActive(), true);
    assert.doesNotThrow(() => assertProductionQueueConfig());
  } finally {
    process.env.NODE_ENV = prevNode;
    process.env.WORKER_ENABLED = prevWorker;
    if (prevAmy === undefined) delete process.env.AMYNEST_ENV;
    else process.env.AMYNEST_ENV = prevAmy;
    if (prevRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prevRedis;
    resetQueueBootstrapStateForTests();
  }
});

test("undefined bootstrap in production returns memory until ping completes", () => {
  const prevNode = process.env.NODE_ENV;
  const prevWorker = process.env.WORKER_ENABLED;
  const prevAmy = process.env.AMYNEST_ENV;
  const prevRedis = process.env.REDIS_URL;
  process.env.NODE_ENV = "production";
  process.env.AMYNEST_ENV = "production";
  process.env.WORKER_ENABLED = "true";
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
  resetQueueBootstrapStateForTests();
  try {
    assert.equal(getQueueMode(), "memory");
    assert.equal(isBullMqActive(), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    process.env.WORKER_ENABLED = prevWorker;
    if (prevAmy === undefined) delete process.env.AMYNEST_ENV;
    else process.env.AMYNEST_ENV = prevAmy;
    if (prevRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prevRedis;
    resetQueueBootstrapStateForTests();
  }
});

test("marking bootstrap failed without ping throws on subsequent getQueueMode in production", () => {
  const prevNode = process.env.NODE_ENV;
  const prevWorker = process.env.WORKER_ENABLED;
  const prevAmy = process.env.AMYNEST_ENV;
  const prevRedis = process.env.REDIS_URL;
  process.env.NODE_ENV = "production";
  process.env.AMYNEST_ENV = "production";
  process.env.WORKER_ENABLED = "true";
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
  resetQueueBootstrapStateForTests();
  try {
    markRedisBootstrapResult(false);
    assert.throws(() => getQueueMode(), /Redis ping failed in production/);
  } finally {
    process.env.NODE_ENV = prevNode;
    process.env.WORKER_ENABLED = prevWorker;
    if (prevAmy === undefined) delete process.env.AMYNEST_ENV;
    else process.env.AMYNEST_ENV = prevAmy;
    if (prevRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prevRedis;
    resetQueueBootstrapStateForTests();
  }
});
