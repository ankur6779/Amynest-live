import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import analyticsPreauthRouter, { setPreauthIngestForTests } from "./analytics-preauth";
import { clearDistributedRateLimits } from "../lib/distributed-rate-limit";
import { shouldPersistFirstOpen } from "../services/analyticsIngestService";

if (process.env.NODE_ENV === "production") {
  throw new Error("analytics-preauth tests must not run with NODE_ENV=production");
}
process.env.AMYNEST_PREAUTH_TEST_LIMITS = "1";
process.env.PREAUTH_TEST_IP_MAX = "3";

const app = express();
app.use(express.json());
app.use(analyticsPreauthRouter);

const server = await new Promise<ReturnType<express.Express["listen"]>>((resolve) => {
  const srv = app.listen(0, () => resolve(srv));
});
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

let ipSeq = 0;
function isolatedIp(): string {
  ipSeq += 1;
  return `203.0.113.${ipSeq}`;
}

async function post(
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${baseUrl}/analytics/preauth-events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": isolatedIp(),
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

after(async () => {
  setPreauthIngestForTests(null);
  delete process.env.PREAUTH_TEST_IP_MAX;
  delete process.env.AMYNEST_PREAUTH_TEST_LIMITS;
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(() => {
  clearDistributedRateLimits();
  setPreauthIngestForTests(null);
});

describe("unsigned preauth-events route (no Firebase auth)", () => {
  it("rejects missing device id without requiring authentication", async () => {
    const res = await post({
      platform: "android",
      events: [{ name: "first_open", props: { cold: true } }],
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, "missing_device_id");
  });

  it("rejects invalid payload without requiring authentication", async () => {
    const res = await post(
      { events: [] },
      { "x-amynest-device-id": "valid-device-id-0001" },
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, "invalid_body");
  });

  it("rejects a purchase on the unsigned path", async () => {
    const res = await post(
      {
        platform: "android",
        events: [{ name: "purchase_success", props: { source: "client" } }],
      },
      { "x-amynest-device-id": "valid-device-id-0003" },
    );
    assert.equal(res.status, 202);
    const body = (await res.json()) as { accepted?: number; rejectedPreauthPolicy?: number };
    assert.equal(body.accepted, 0);
    assert.equal(body.rejectedPreauthPolicy, 1);
  });

  it("acknowledges an allowlisted event", async () => {
    setPreauthIngestForTests(async () => ({
      received: 1,
      accepted: 1,
      rejected: 0,
      byReason: { unknown_event: 0, invalid_props: 0, too_large: 0 },
      rejectedPreauthPolicy: 0,
    }));
    const res = await post(
      { platform: "android", events: [{ name: "first_open", props: { cold: true } }] },
      { "x-amynest-device-id": "valid-device-id-0004" },
    );
    assert.equal(res.status, 202);
    const body = (await res.json()) as { ok?: boolean; ack?: boolean; accepted?: number };
    assert.equal(body.ok, true);
    assert.equal(body.ack, true);
    assert.equal(body.accepted, 1);
  });

  it("keeps a duplicate first_open acknowledgement at accepted 0", async () => {
    assert.equal(shouldPersistFirstOpen("first_open", false), true);
    assert.equal(shouldPersistFirstOpen("first_open", true), false);
    assert.equal(shouldPersistFirstOpen("app_open", true), true);
    setPreauthIngestForTests(async () => ({
      received: 1,
      accepted: 0,
      rejected: 0,
      byReason: { unknown_event: 0, invalid_props: 0, too_large: 0 },
      rejectedPreauthPolicy: 0,
    }));
    const res = await post(
      { platform: "android", events: [{ name: "first_open", props: { cold: true } }] },
      { "x-amynest-device-id": "valid-device-id-0005" },
    );
    assert.equal(res.status, 202);
    const body = (await res.json()) as { accepted?: number };
    assert.equal(body.accepted, 0);
  });

  it("rate-limits a single client IP without lowering the production ceiling", async () => {
    const ip = isolatedIp();
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await post(
        { platform: "android", events: [{ name: "app_open" }] },
        { "x-forwarded-for": ip },
      );
      statuses.push(res.status);
    }
    assert.deepEqual(statuses.slice(0, 3), [400, 400, 400]);
    assert.equal(statuses[3], 429);
    assert.equal(process.env.PREAUTH_TEST_IP_MAX, "3");
  });
});
