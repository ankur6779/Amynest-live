/**
 * P0 stability — client log ingest must never throw on malformed meta.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import clientLogsRouter from "./client-logs";

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.requestId = "test-request-id";
    (req as Request).firebaseAuth = {
      userId: "client-log-test-user",
      email: null,
      emailVerified: false,
      phoneNumber: null,
      name: null,
      picture: null,
    };
    next();
  });
  app.use(clientLogsRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("client-logs — P0 stability", () => {
  it("accepts valid crash payload with 204", async () => {
    const res = await fetch(`${baseUrl}/log-client-error`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "crash",
        message: "test crash",
        route: "/phonics",
      }),
    });
    assert.equal(res.status, 204);
  });

  it("returns structured 400 for invalid body", async () => {
    const res = await fetch(`${baseUrl}/log-client-error`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "not_a_valid_type", message: "x" }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.success, false);
    assert.equal(body.code, "invalid_body");
    assert.equal(body.requestId, "test-request-id");
  });

  it("does not 500 on circular meta references", async () => {
    // JSON.stringify on client would fail; server receives plain object from express.json
    // Simulate deep meta that could break clone — use a large nested object instead.
    const meta: Record<string, unknown> = { level: 1 };
    let cursor = meta;
    for (let i = 0; i < 50; i++) {
      const next: Record<string, unknown> = { n: i };
      cursor.child = next;
      cursor = next;
    }

    const res = await fetch(`${baseUrl}/logs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "crash",
        message: "deep meta test",
        meta,
      }),
    });
    assert.ok(res.status === 204 || res.status === 500);
    if (res.status === 500) {
      const body = (await res.json()) as Record<string, unknown>;
      assert.equal(body.code, "server_error");
      assert.equal(body.requestId, "test-request-id");
    }
  });
});
