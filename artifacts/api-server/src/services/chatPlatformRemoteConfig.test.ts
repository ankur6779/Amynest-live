import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getChatPlatformRemoteConfig,
  recordChatPlatformPromptHiddenFailure,
  resetChatPlatformFailureWindowForTests,
} from "./chatPlatformRemoteConfig.js";

describe("chatPlatformRemoteConfig", () => {
  beforeEach(() => {
    resetChatPlatformFailureWindowForTests();
    delete process.env.REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE;
    delete process.env.REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE_EXPIRES_AT;
    delete process.env.REMOTE_CONFIG_CHAT_PROMPT_FAILURE_THRESHOLD;
    delete process.env.REMOTE_CONFIG_CHAT_PLATFORM_VISIBILITY_PROTECTION;
  });

  it("defaults visibility protection on and force mode off", () => {
    const config = getChatPlatformRemoteConfig();
    assert.equal(config.chatPlatformVisibilityProtection, true);
    assert.equal(config.forcePromptVisibilityMode, false);
    assert.equal(config.forceModeReason, "none");
    assert.equal(config.forcePromptVisibilityModeExpiresAt, null);
  });

  it("enables force mode when manual env override is set", () => {
    process.env.REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE = "true";
    const config = getChatPlatformRemoteConfig();
    assert.equal(config.forcePromptVisibilityMode, true);
    assert.equal(config.forceModeReason, "manual");
  });

  it("auto-enables force mode when telemetry threshold exceeded", () => {
    process.env.REMOTE_CONFIG_CHAT_PROMPT_FAILURE_THRESHOLD = "3";
    recordChatPlatformPromptHiddenFailure();
    recordChatPlatformPromptHiddenFailure();
    const mid = getChatPlatformRemoteConfig();
    assert.equal(mid.forcePromptVisibilityMode, false);

    recordChatPlatformPromptHiddenFailure();
    const config = getChatPlatformRemoteConfig();
    assert.equal(config.forcePromptVisibilityMode, true);
    assert.equal(config.forceModeReason, "telemetry_threshold");
    assert.equal(config.failuresInWindow, 3);
  });

  it("expires manual force mode after expiresAt", () => {
    process.env.REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE = "true";
    process.env.REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE_EXPIRES_AT = "2020-01-01T00:00:00Z";
    const config = getChatPlatformRemoteConfig(Date.parse("2026-01-01T00:00:00Z"));
    assert.equal(config.forcePromptVisibilityMode, false);
    assert.equal(config.forceModeReason, "expired");
    assert.equal(config.expiresAt, "2020-01-01T00:00:00.000Z");
  });

  it("keeps manual force mode active before expiresAt", () => {
    process.env.REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE = "true";
    process.env.REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE_EXPIRES_AT = "2030-01-01T00:00:00Z";
    const config = getChatPlatformRemoteConfig(Date.parse("2026-01-01T00:00:00Z"));
    assert.equal(config.forcePromptVisibilityMode, true);
    assert.equal(config.forceModeReason, "manual");
  });
});
