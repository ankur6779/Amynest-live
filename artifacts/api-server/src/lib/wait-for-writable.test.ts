import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import http from "node:http";
import net from "node:net";
import { describe, it } from "node:test";
import { ResponseClosedError, waitForWritableDrain } from "./wait-for-writable.js";

type FakeRes = EventEmitter & {
  writableEnded: boolean;
  destroyed: boolean;
};

function makeFakeRes(): FakeRes {
  const ee = new EventEmitter() as FakeRes;
  ee.writableEnded = false;
  ee.destroyed = false;
  return ee;
}

describe("waitForWritableDrain", () => {
  it("resolves on drain when the response stays open", async () => {
    const res = makeFakeRes();
    const pending = waitForWritableDrain(res);
    queueMicrotask(() => res.emit("drain"));
    await pending;
  });

  it("rejects immediately when the response is already destroyed", async () => {
    const res = makeFakeRes();
    res.destroyed = true;
    await assert.rejects(() => waitForWritableDrain(res), ResponseClosedError);
  });

  it("rejects on close without ever emitting drain (TTS abort hang)", async () => {
    const res = makeFakeRes();
    const pending = waitForWritableDrain(res);
    queueMicrotask(() => {
      res.destroyed = true;
      res.emit("close");
    });
    await assert.rejects(() => pending, (err: unknown) => {
      assert.ok(err instanceof ResponseClosedError);
      assert.equal((err as Error).message, "response_closed");
      return true;
    });
  });

  it("rejects when write-after-abort returns false and drain never fires (real HTTP)", async () => {
    let handlerDone!: (err?: Error) => void;
    const handlerFinished = new Promise<void>((resolve, reject) => {
      handlerDone = (err) => (err ? reject(err) : resolve());
    });

    const server = http.createServer((req, res) => {
      void (async () => {
        try {
          res.writeHead(200, { "Transfer-Encoding": "chunked" });
          res.write(Buffer.alloc(1024, 1));
          await new Promise((r) => setTimeout(r, 200));
          assert.equal(res.destroyed, true);
          const ok = res.write(Buffer.alloc(64 * 1024, 2));
          assert.equal(ok, false);
          await assert.rejects(() => waitForWritableDrain(res), ResponseClosedError);
          handlerDone();
        } catch (err) {
          handlerDone(err instanceof Error ? err : new Error(String(err)));
        }
      })();
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as net.AddressInfo;

    const sock = net.connect(port, "127.0.0.1");
    await new Promise<void>((resolve) => sock.once("connect", () => resolve()));
    sock.write("GET / HTTP/1.1\r\nHost: x\r\n\r\n");
    sock.once("data", () => sock.destroy());

    await handlerFinished;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
