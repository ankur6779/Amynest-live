/**
 * Launch security guards — static checks that critical routes stay wired correctly.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

function readSource(name: string): string {
  return readFileSync(join(__dir, name), "utf8");
}

describe("Launch security guards — route wiring", () => {
  it("environment context uses canAccessChild for childId lookups", () => {
    const src = readSource("environment.ts");
    assert.match(src, /canAccessChild\(childIdParam, userId\)/);
    assert.doesNotMatch(src, /where\(eq\(childrenTable\.id, childIdParam\)\)/);
  });

  it("static-audio POST missing is on authenticated router only", () => {
    const staticAudio = readSource("static-audio.ts");
    const routes = readSource("index.ts");
    assert.match(staticAudio, /export const staticAudioAuthRouter/);
    assert.match(staticAudio, /staticAudioAuthRouter\.post\("\/static-audio\/missing"/);
    assert.doesNotMatch(staticAudio, /staticAudioPublicRouter\.post\("\/static-audio\/missing"/);
    assert.match(routes, /router\.use\(requireAuth\)/);
    assert.match(routes, /router\.use\(staticAudioAuthRouter\)/);
  });

  it("audio-warmup enqueue uses userId not uid", () => {
    const src = readSource("audio-warmup.ts");
    assert.match(src, /getAuth\(req\)\?\.userId/);
    assert.doesNotMatch(src, /getAuth\(req\)\?\.uid/);
  });

  it("auth whoami is disabled in production unless ENABLE_AUTH_DEBUG", () => {
    const src = readSource("auth-debug.ts");
    assert.match(src, /ENABLE_AUTH_DEBUG/);
    assert.match(src, /NODE_ENV === "production"/);
  });

  it("CORS uses explicit origin allowlist", () => {
    const app = readFileSync(join(__dir, "../app.ts"), "utf8");
    assert.match(app, /resolveCorsOrigin/);
    assert.doesNotMatch(app, /origin:\s*true/);
  });

  it("check-reset-email uses distributed rate limiting", () => {
    const src = readSource("auth.ts");
    assert.match(src, /checkDistributedRateLimit/);
    assert.match(src, /auth-check-reset/);
  });

  it("realtime debug routes mount after requireAuth with guard", () => {
    const routes = readSource("index.ts");
    const authIdx = routes.indexOf("router.use(requireAuth)");
    const guardIdx = routes.indexOf("router.use(realtimeDebugGuard)");
    const debugIdx = routes.indexOf("router.use(speechCoachV2DebugRouter)");
    assert.ok(authIdx >= 0);
    assert.ok(guardIdx > authIdx);
    assert.ok(debugIdx > guardIdx);
  });
});
