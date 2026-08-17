import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getRedisConnectionEpoch,
  isRedisClosedError,
  isRedisConnectionEnded,
  redisReconnectDelayMs,
  resetRedisConnection,
} from "./redis.js";

test("ioredis retry delay never gives up (never returns null)", () => {
  for (const times of [1, 5, 30, 31, 100]) {
    const delay = redisReconnectDelayMs(times);
    assert.equal(typeof delay, "number");
    assert.ok(delay > 0);
    assert.ok(delay <= 5000);
  }
  assert.equal(redisReconnectDelayMs(1), 250);
  assert.equal(redisReconnectDelayMs(20), 5000);
  assert.equal(redisReconnectDelayMs(100), 5000);
});

test("ended Redis clients are the ones that must be recreated", () => {
  assert.equal(isRedisConnectionEnded("end"), true);
  assert.equal(isRedisConnectionEnded("close"), false);
  assert.equal(isRedisConnectionEnded("ready"), false);
  assert.equal(isRedisConnectionEnded("reconnecting"), false);
  assert.equal(isRedisConnectionEnded(undefined), false);
});

test("closed-connection errors match ioredis give-up messages", () => {
  assert.equal(isRedisClosedError(new Error("Connection is closed.")), true);
  assert.equal(isRedisClosedError(new Error("Stream isn't writeable and enableOfflineQueue is false")), true);
  assert.equal(isRedisClosedError(new Error("enableOfflineQueue is false")), true);
  assert.equal(isRedisClosedError(new Error("Command timed out")), false);
  assert.equal(isRedisClosedError(new Error("ECONNREFUSED")), false);
});

test("resetRedisConnection bumps the connection epoch so BullMQ queues recreate", () => {
  const before = getRedisConnectionEpoch();
  resetRedisConnection();
  assert.equal(getRedisConnectionEpoch(), before + 1);
});
