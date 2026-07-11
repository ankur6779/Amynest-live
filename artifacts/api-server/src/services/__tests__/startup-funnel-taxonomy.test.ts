import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  classifyStartupFunnelEvent,
  startupFunnelBatchBodySchema,
} from "@workspace/analytics-taxonomy";

describe("startup-funnel taxonomy", () => {
  it("classifies failure events", () => {
    assert.equal(classifyStartupFunnelEvent("auth_timeout"), "failure");
    assert.equal(classifyStartupFunnelEvent("login_screen_visible"), "milestone");
  });

  it("validates ingest batch payload", () => {
    const parsed = startupFunnelBatchBodySchema.safeParse({
      events: [
        {
          event_name: "app_open",
          session_id: "session-12345678",
          install_id: "install-12345678",
          device_id: "device-12345678",
          elapsed_ms: 1200,
          platform: "android",
        },
      ],
    });
    assert.equal(parsed.success, true);
  });

  it("validates child journey forensics events", () => {
    const parsed = startupFunnelBatchBodySchema.safeParse({
      events: [
        {
          event_name: "child_age_view",
          session_id: "session-12345678",
          install_id: "install-12345678",
          device_id: "device-12345678",
          elapsed_ms: 0,
          platform: "android",
          meta: {
            child_age_group: "3_5_years",
            auth_provider: "google.com",
          },
        },
      ],
    });
    assert.equal(parsed.success, true);
  });

  it("rejects unknown event names", () => {
    const parsed = startupFunnelBatchBodySchema.safeParse({
      events: [
        {
          event_name: "not_a_real_event",
          session_id: "session-12345678",
          install_id: "install-12345678",
          device_id: "device-12345678",
        },
      ],
    });
    assert.equal(parsed.success, false);
  });
});
