import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request } from "express";
import { resolveRequestTimeoutMs } from "../request-timeout.js";

function mockReq(path: string): Request {
  return { originalUrl: path } as Request;
}

test("resolveRequestTimeoutMs uses 15s for /api/audio/stream GCS downloads", () => {
  const ms = resolveRequestTimeoutMs(mockReq("/api/audio/stream/twinkle-star"));
  assert.equal(ms, 15_000);
});

test("resolveRequestTimeoutMs keeps default 5s for unrelated routes", () => {
  const ms = resolveRequestTimeoutMs(mockReq("/api/routines/today"));
  assert.equal(ms, 5_000);
});
