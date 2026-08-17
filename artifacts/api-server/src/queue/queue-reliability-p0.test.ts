import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isApiQueueBootstrapComplete,
  markApiQueueBootstrapComplete,
} from "./bootstrap.js";
import {
  isJobRecordPersistenceBlocked,
  JobRecordPersistenceError,
} from "./job-results.js";

test("isApiQueueBootstrapComplete tracks bootstrap gate", () => {
  markApiQueueBootstrapComplete();
  assert.equal(isApiQueueBootstrapComplete(), true);
});

test("JobRecordPersistenceError carries code", () => {
  const blocked = new JobRecordPersistenceError("job_records_disabled", "blocked");
  assert.equal(blocked.code, "job_records_disabled");
  const redisDown = new JobRecordPersistenceError("redis_unavailable", "Connection is closed.");
  assert.equal(redisDown.code, "redis_unavailable");
});

test("isJobRecordPersistenceBlocked reflects admin ops flag", () => {
  assert.equal(typeof isJobRecordPersistenceBlocked(), "boolean");
});
