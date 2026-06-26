import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import appVersionAnalyticsRouter from "./app-version-analytics";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", appVersionAnalyticsRouter);
  return app;
}

async function withServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = createTestApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("test server did not bind to a TCP port");
    }
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
  }
}

const event = {
  eventId: "v1:force_update_displayed:test-event",
  name: "force_update_displayed",
  clientTs: new Date().toISOString(),
  sessionId: "session_test",
  platform: "android",
  installedVersion: "1.0.0",
  minimumVersion: "1.1.0",
  latestVersion: "1.2.0",
  forceUpdate: true,
  updateType: "hard",
};

test("public app version analytics endpoint accepts anonymous events and dedupes event IDs", async () => {
  await withServer(async (baseUrl) => {
    const first = await fetch(`${baseUrl}/api/app-version-analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [event] }),
    });
    assert.equal(first.status, 202);
    assert.deepEqual(await first.json(), { ok: true, accepted: 1, duplicate: 0 });

    const second = await fetch(`${baseUrl}/api/app-version-analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [event] }),
    });
    assert.equal(second.status, 202);
    assert.deepEqual(await second.json(), { ok: true, accepted: 0, duplicate: 1 });
  });
});

test("public app version analytics endpoint rejects unknown event names", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/app-version-analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [{ ...event, eventId: "v1:unknown:test", name: "unknown" }] }),
    });
    assert.equal(response.status, 400);
  });
});
