import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import {
  STATIC_AUDIO_CACHE_CONTROL,
  STATIC_AUDIO_PLACEHOLDER_CACHE_CONTROL,
  serveStaticAudioBuffer,
} from "../staticAudioServe.js";

function mockRes() {
  const headers = new Map<string, string>();
  let statusCode = 200;
  let body: Buffer | undefined;
  const res = {
    setHeader(k: string, v: string) {
      headers.set(k.toLowerCase(), v);
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    end(buf?: Buffer) {
      if (buf) body = buf;
    },
  } as unknown as Response;
  return { res, headers, get statusCode() { return statusCode; }, get body() { return body; } };
}

describe("staticAudioServe placeholder cache policy", () => {
  it("does not mark placeholders as immutable CDN cacheable", () => {
    const { res, headers } = mockRes();
    const buf = Buffer.alloc(256, 0xff);
    serveStaticAudioBuffer({ headers: {} } as Request, res, "abc".padEnd(32, "0"), buf, "memory", {
      staticSource: "placeholder",
    });
    assert.equal(headers.get("cache-control"), STATIC_AUDIO_PLACEHOLDER_CACHE_CONTROL);
    assert.equal(headers.get("cdn-cache-control"), STATIC_AUDIO_PLACEHOLDER_CACHE_CONTROL);
    assert.equal(headers.get("x-amynest-static-source"), "placeholder");
    assert.match(headers.get("etag") ?? "", /-placeholder"$/);
  });

  it("keeps immutable cache for real assets", () => {
    const { res, headers } = mockRes();
    const buf = Buffer.alloc(4000, 0x11);
    const hash = "a".repeat(32);
    serveStaticAudioBuffer({ headers: {} } as Request, res, hash, buf, "gcs", {
      staticSource: "asset",
    });
    assert.equal(headers.get("cache-control"), STATIC_AUDIO_CACHE_CONTROL);
    assert.equal(headers.get("x-amynest-static-source"), "asset");
    assert.equal(headers.get("etag"), `"${hash}"`);
  });
});
