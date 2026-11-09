import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canLinkAnonymousDevice } from "../anonymousDeviceService.js";

describe("canLinkAnonymousDevice", () => {
  it("allows link when presented token matches stored anonymous token", () => {
    assert.deepEqual(
      canLinkAnonymousDevice({
        storedPushToken: "fcm-tablet-install",
        presentedPushToken: "fcm-tablet-install",
      }),
      { ok: true },
    );
  });

  it("trims whitespace before comparing", () => {
    assert.deepEqual(
      canLinkAnonymousDevice({
        storedPushToken: "  fcm-a  ",
        presentedPushToken: "fcm-a",
      }),
      { ok: true },
    );
  });

  it("blocks planted attacker FCM under a shared deviceId (token mismatch)", () => {
    assert.deepEqual(
      canLinkAnonymousDevice({
        storedPushToken: "attacker-phone-fcm",
        presentedPushToken: "victim-tablet-fcm",
      }),
      { ok: false, reason: "token_mismatch" },
    );
  });

  it("requires a presented token", () => {
    assert.deepEqual(
      canLinkAnonymousDevice({
        storedPushToken: "fcm-tablet-install",
        presentedPushToken: "   ",
      }),
      { ok: false, reason: "missing_token" },
    );
    assert.deepEqual(
      canLinkAnonymousDevice({
        storedPushToken: "fcm-tablet-install",
        presentedPushToken: null,
      }),
      { ok: false, reason: "missing_token" },
    );
  });

  it("requires a stored token", () => {
    assert.deepEqual(
      canLinkAnonymousDevice({
        storedPushToken: "",
        presentedPushToken: "fcm-tablet-install",
      }),
      { ok: false, reason: "missing_stored" },
    );
  });
});

describe("anonymous push link wiring", () => {
  it("requires matching push token on auto-link and /push/link-device", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const service = readFileSync(join(dir, "../anonymousDeviceService.ts"), "utf8");
    const push = readFileSync(join(dir, "../../routes/push.ts"), "utf8");
    const index = readFileSync(join(dir, "../../routes/index.ts"), "utf8");

    assert.match(service, /requirePushToken/);
    assert.match(service, /canLinkAnonymousDevice/);
    assert.match(service, /token_mismatch/);

    assert.match(
      push,
      /linkAnonymousDeviceToUser\(deviceIdHeader,\s*userId,\s*\{\s*requirePushToken:\s*token/,
    );
    assert.match(push, /token:\s*z\.string\(\)\.trim\(\)\.min\(1\)\.max\(512\)/);
    assert.match(
      push,
      /linkAnonymousDeviceToUser\(parsed\.data\.deviceId,\s*userId,\s*\{\s*requirePushToken:\s*parsed\.data\.token/,
    );
    assert.match(push, /pushAnonymousPublicRouter/);
    assert.match(index, /pushAnonymousPublicRouter/);
  });
});
