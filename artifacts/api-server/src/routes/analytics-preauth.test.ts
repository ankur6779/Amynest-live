import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import analyticsPreauthRouter from "./analytics-preauth";

const app = express();
app.use(express.json());
app.use(analyticsPreauthRouter);

const server = await new Promise<ReturnType<express.Express["listen"]>>((resolve) => {
  const srv = app.listen(0, () => resolve(srv));
});
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("unsigned preauth-events route (no Firebase auth)", () => {
  it("rejects missing device id without requiring authentication", async () => {
    const res = await fetch(`${baseUrl}/analytics/preauth-events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        platform: "android",
        events: [{ name: "first_open", props: { cold: true } }],
      }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, "missing_device_id");
  });

  it("rejects invalid payload without requiring authentication", async () => {
    const res = await fetch(`${baseUrl}/analytics/preauth-events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-amynest-device-id": "valid-device-id-0001",
      },
      body: JSON.stringify({ events: [] }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, "invalid_body");
  });

  it("rejects a malformed body without authentication error", async () => {
    const res = await fetch(`${baseUrl}/analytics/preauth-events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-amynest-device-id": "valid-device-id-0002",
      },
      body: JSON.stringify({ notEvents: true }),
    });
    assert.equal(res.status, 400);
    const text = await res.text();
    assert.doesNotMatch(text, /Authentication required/i);
    assert.doesNotMatch(text, /unauthorized/i);
  });
});
