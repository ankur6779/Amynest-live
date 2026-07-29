import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COACH_GATEWAY_TIMEOUT_MS } from "@workspace/coach-journey";
import { resolveTimeoutMs } from "./request-timeout.js";

describe("resolveTimeoutMs", () => {
  it("uses the short default for ordinary API routes", () => {
    assert.equal(resolveTimeoutMs({ originalUrl: "/api/me" }), 5000);
    assert.equal(resolveTimeoutMs({ originalUrl: "/api/children?x=1" }), 5000);
  });

  it("extends birth-sky create/recompute/regenerate past ephemeris compute", () => {
    assert.equal(
      resolveTimeoutMs({ originalUrl: "/api/birth-sky/create" }),
      COACH_GATEWAY_TIMEOUT_MS,
    );
    assert.equal(
      resolveTimeoutMs({
        originalUrl: "/api/birth-sky/profiles/abc/recompute",
      }),
      COACH_GATEWAY_TIMEOUT_MS,
    );
    assert.equal(
      resolveTimeoutMs({
        originalUrl: "/api/birth-sky/profiles/abc/regenerate?force=1",
      }),
      COACH_GATEWAY_TIMEOUT_MS,
    );
  });

  it("keeps coach and other long-running prefixes on the long timeout", () => {
    assert.equal(
      resolveTimeoutMs({ originalUrl: "/api/coach/generate" }),
      COACH_GATEWAY_TIMEOUT_MS,
    );
    assert.equal(
      resolveTimeoutMs({ originalUrl: "/api/ai/chat" }),
      COACH_GATEWAY_TIMEOUT_MS,
    );
  });

  it("keeps health probes on the dedicated probe timeout", () => {
    assert.equal(resolveTimeoutMs({ originalUrl: "/api/healthz/tts" }), 15_000);
  });
});
