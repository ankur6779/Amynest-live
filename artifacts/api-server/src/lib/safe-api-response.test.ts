import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Response } from "express";
import {
  sanitizePublicErrorMessage,
  sendStructuredApiError,
} from "./safe-api-response.js";

describe("safe-api-response", () => {
  it("sanitizes Drizzle failed query messages in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      assert.equal(
        sanitizePublicErrorMessage("Failed query: select * from users"),
        "Something went wrong. Please try again.",
      );
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("sendStructuredApiError returns standard envelope", () => {
    let status = 0;
    let body: Record<string, unknown> = {};
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(payload: Record<string, unknown>) {
        body = payload;
      },
    } as unknown as Response;

    sendStructuredApiError(res, 500, {
      code: "server_error",
      message: "test failure",
      requestId: "req-123",
      details: { childId: 1 },
    });

    assert.equal(status, 500);
    assert.equal(body.success, false);
    assert.equal(body.error, "server_error");
    assert.equal(body.code, "server_error");
    assert.equal(body.message, "test failure");
    assert.equal(body.requestId, "req-123");
    assert.deepEqual(body.details, { childId: 1 });
    assert.equal(typeof body.timestamp, "string");
  });
});
