import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  getPhonicsSessionSecret,
  resetPhonicsSessionSecretCacheForTests,
  resolvePhonicsSessionSecret,
} from "./phonicsSessionSecret.js";

describe("phonicsSessionSecret", () => {
  const env = { ...process.env };

  beforeEach(() => {
    resetPhonicsSessionSecretCacheForTests();
  });

  afterEach(() => {
    process.env = { ...env };
    resetPhonicsSessionSecretCacheForTests();
  });

  it("uses SESSION_SECRET when 32+ chars", () => {
    process.env.SESSION_SECRET = "a".repeat(32);
    delete process.env.DATABASE_URL;
    const r = resolvePhonicsSessionSecret();
    assert.equal(r.source, "session_secret");
    assert.equal(r.secret.length, 32);
  });

  it("derives from DATABASE_URL when explicit secret missing", () => {
    delete process.env.SESSION_SECRET;
    process.env.DATABASE_URL = "postgres://user:pass@host/db";
    process.env.NODE_ENV = "production";
    const r = resolvePhonicsSessionSecret();
    assert.equal(r.source, "derived");
    assert.equal(r.secret.length, 64);
  });

  it("getPhonicsSessionSecret caches result", () => {
    process.env.SESSION_SECRET = "b".repeat(40);
    const a = getPhonicsSessionSecret();
    process.env.SESSION_SECRET = "c".repeat(40);
    const b = getPhonicsSessionSecret();
    assert.equal(a, b);
  });
});
