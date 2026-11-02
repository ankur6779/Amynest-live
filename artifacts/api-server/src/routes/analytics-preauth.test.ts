import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";

process.env.AMYNEST_ENV = "development";
process.env.NODE_ENV = "test";
delete process.env.REDIS_URL;

import analyticsPreauthRouter from "./analytics-preauth";
import { clearDistributedRateLimits } from "../lib/distributed-rate-limit";
import { setPreauthPersistenceForTests } from "../services/preauthAnalyticsService";
import type { AnalyticsIngestSummary, RawAnalyticsEvent } from "../services/analyticsIngestService";

const app = express();
app.use(express.json());
app.use(analyticsPreauthRouter);

const server = await new Promise<ReturnType<express.Express["listen"]>>((resolve) => {
  const srv = app.listen(0, () => resolve(srv));
});
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

function summary(partial: Partial<AnalyticsIngestSummary> = {}): AnalyticsIngestSummary {
  return {
    received: 0,
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    acceptedEventIds: [],
    duplicateEventIds: [],
    droppedEventIds: [],
    byReason: { unknown_event: 0, invalid_props: 0, too_large: 0 },
    ...partial,
  };
}

let persisted: RawAnalyticsEvent[] = [];

before(() => {
  setPreauthPersistenceForTests(
    async (events: RawAnalyticsEvent[]) => {
      persisted = events;
      return summary({
        received: events.length,
        accepted: events.length,
        acceptedEventIds: events.map((event) => event.eventId ?? "accepted"),
      });
    },
    async () => null,
  );
});

after(async () => {
  setPreauthPersistenceForTests(null, null);
  clearDistributedRateLimits();
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

async function post(deviceId: string | null, body: unknown): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (deviceId) headers["x-amynest-device-id"] = deviceId;
  return fetch(`${baseUrl}/analytics/preauth-events`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("unsigned preauth-events route (no Firebase auth)", { concurrency: 1 }, () => {
  it("rejects missing device id without requiring authentication", async () => {
    clearDistributedRateLimits();
    const res = await post(null, {
      platform: "android",
      events: [{ name: "first_open", props: { cold: true } }],
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, "missing_device_id");
  });

  it("rejects invalid payload without requiring authentication", async () => {
    clearDistributedRateLimits();
    const res = await post("valid-device-id-0001", { events: [] });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, "invalid_body");
  });

  it("rejects a malformed body without authentication error", async () => {
    clearDistributedRateLimits();
    const res = await post("valid-device-id-0002", { notEvents: true });
    assert.equal(res.status, 400);
    const text = await res.text();
    assert.doesNotMatch(text, /Authentication required/i);
    assert.doesNotMatch(text, /unauthorized/i);
  });

  it("accepts an allowlisted event and does not persist a child id", async () => {
    clearDistributedRateLimits();
    persisted = [];
    const res = await post("accepted-device-0001", {
      events: [
        {
          name: "first_open",
          eventId: "evt-accept-01",
          props: { cold: true, childId: 7, child_name: "Ava" },
        },
      ],
    });
    assert.equal(res.status, 202);
    const body = (await res.json()) as { ok?: boolean; ack?: boolean; accepted?: number; duplicates?: number };
    assert.equal(body.ok, true);
    assert.equal(body.ack, true);
    assert.equal(body.accepted, 1);
    assert.equal(body.duplicates, 0);
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0]?.name, "first_open");
    assert.equal("childId" in (persisted[0]?.props ?? {}), false);
    assert.equal("child_name" in (persisted[0]?.props ?? {}), false);
  });

  it("returns a duplicate summary without writing a second row", async () => {
    clearDistributedRateLimits();
    setPreauthPersistenceForTests(async () => {
      return summary({
        received: 1,
        accepted: 0,
        duplicates: 1,
        duplicateEventIds: ["evt-duplicate"],
      });
    }, async () => null);
    const res = await post("duplicate-device-001", {
      events: [{ name: "first_open", eventId: "evt-duplicate" }],
    });
    assert.equal(res.status, 202);
    const body = (await res.json()) as { duplicates?: number; duplicateEventIds?: string[]; accepted?: number };
    assert.equal(body.accepted, 0);
    assert.equal(body.duplicates, 1);
    assert.deepEqual(body.duplicateEventIds, ["evt-duplicate"]);
  });

  it("rejects an event outside the pre-auth allowlist", async () => {
    clearDistributedRateLimits();
    persisted = [];
    setPreauthPersistenceForTests(async (events) => {
      persisted = events;
      return summary({ received: events.length, accepted: events.length });
    }, async () => null);
    const res = await post("rejected-device-0001", {
      events: [{ name: "purchase_success", eventId: "evt-reject-01", props: { childId: 3 } }],
    });
    assert.equal(res.status, 202);
    const body = (await res.json()) as { accepted?: number; rejectedPreauthPolicy?: number };
    assert.equal(body.accepted, 0);
    assert.equal(body.rejectedPreauthPolicy, 1);
    assert.equal(persisted.length, 0);
  });

  it("rate limits the device bucket without changing the production max", async () => {
    clearDistributedRateLimits();
    const deviceId = "rate-limit-device-001";
    let lastStatus = 0;
    let lastError = "";
    for (let i = 0; i < 31; i += 1) {
      const res = await post(deviceId, { events: [] });
      lastStatus = res.status;
      const body = (await res.json()) as { error?: string };
      lastError = body.error ?? "";
      if (i < 30) {
        assert.equal(res.status, 400);
        assert.equal(body.error, "invalid_body");
      }
    }
    assert.equal(lastStatus, 429);
    assert.equal(lastError, "rate_limited");
  });
});
