import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getAppVersionPolicy,
  getAppVersionPolicyCacheSeconds,
} from "./appVersionPolicyService";

const ENV_KEYS = [
  "APP_VERSION_POLICY_JSON",
  "APP_IOS_MINIMUM_VERSION",
  "APP_IOS_LATEST_VERSION",
  "APP_IOS_FORCE_UPDATE",
  "APP_IOS_STORE_URL",
  "APP_ANDROID_MINIMUM_VERSION",
  "APP_ANDROID_LATEST_VERSION",
  "APP_ANDROID_FORCE_UPDATE",
  "APP_ANDROID_STORE_URL",
  "APP_VERSION_POLICY_CACHE_SECONDS",
] as const;

const previousEnv = new Map<string, string | undefined>();
for (const key of ENV_KEYS) previousEnv.set(key, process.env[key]);

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = previousEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("builds app version policy from centralized environment config", () => {
  process.env.APP_IOS_MINIMUM_VERSION = "1.2.0";
  process.env.APP_IOS_LATEST_VERSION = "1.3.0";
  process.env.APP_IOS_FORCE_UPDATE = "true";
  process.env.APP_IOS_STORE_URL = "https://apps.apple.com/app/amynest-ai/id123";
  process.env.APP_ANDROID_MINIMUM_VERSION = "1.4.0";
  process.env.APP_ANDROID_LATEST_VERSION = "1.5.0";
  process.env.APP_ANDROID_STORE_URL =
    "https://play.google.com/store/apps/details?id=com.amynest.app";

  const policy = getAppVersionPolicy();

  assert.equal(policy.ios.minimumVersion, "1.2.0");
  assert.equal(policy.ios.latestVersion, "1.3.0");
  assert.equal(policy.ios.forceUpdate, true);
  assert.equal(policy.android.minimumVersion, "1.4.0");
  assert.equal(policy.android.latestVersion, "1.5.0");
});

test("clamps public cache seconds to production-safe range", () => {
  process.env.APP_VERSION_POLICY_CACHE_SECONDS = "10";
  assert.equal(getAppVersionPolicyCacheSeconds(), 60);

  process.env.APP_VERSION_POLICY_CACHE_SECONDS = "999";
  assert.equal(getAppVersionPolicyCacheSeconds(), 300);
});

test("rejects invalid policy schema", () => {
  process.env.APP_VERSION_POLICY_JSON = JSON.stringify({
    ios: {
      minimumVersion: "1.two.0",
      latestVersion: "1.3.0",
      forceUpdate: true,
      storeUrl: "https://apps.apple.com/app/amynest-ai",
      message: "Update required.",
    },
    android: {
      minimumVersion: "1.2.0",
      latestVersion: "1.3.0",
      forceUpdate: true,
      storeUrl: "https://play.google.com/store/apps/details?id=com.amynest.app",
      message: "Update required.",
    },
  });

  assert.throws(() => getAppVersionPolicy());
});

test("rejects ambiguous leading-zero versions", () => {
  process.env.APP_VERSION_POLICY_JSON = JSON.stringify({
    ios: {
      minimumVersion: "01.2.0",
      latestVersion: "1.3.0",
      forceUpdate: true,
      storeUrl: "https://apps.apple.com/app/amynest-ai",
      message: "Update required.",
    },
    android: {
      minimumVersion: "1.2.0",
      latestVersion: "1.3.0",
      forceUpdate: true,
      storeUrl: "https://play.google.com/store/apps/details?id=com.amynest.app",
      message: "Update required.",
    },
  });

  assert.throws(() => getAppVersionPolicy());
});

test("rejects non-store HTTPS URLs", () => {
  process.env.APP_VERSION_POLICY_JSON = JSON.stringify({
    ios: {
      minimumVersion: "1.2.0",
      latestVersion: "1.3.0",
      forceUpdate: true,
      storeUrl: "https://example.com/app/amynest-ai",
      message: "Update required.",
    },
    android: {
      minimumVersion: "1.2.0",
      latestVersion: "1.3.0",
      forceUpdate: true,
      storeUrl: "https://play.google.com/store/apps/details?id=com.amynest.app",
      message: "Update required.",
    },
  });

  assert.throws(() => getAppVersionPolicy());
});
