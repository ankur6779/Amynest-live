import { describe, expect, it } from "vitest";
import {
  isForcePromptVisibilityModeActive,
  resetChatPlatformRemoteConfigForTests,
} from "@/lib/chat-platform/remote-config";

describe("ChatPlatform remote config expiry", () => {
  it("ignores force mode after expiresAt", () => {
    resetChatPlatformRemoteConfigForTests({
      chatPlatformVisibilityProtection: true,
      forcePromptVisibilityMode: true,
      forcePromptVisibilityModeExpiresAt: "2020-01-01T00:00:00Z",
    });
    expect(isForcePromptVisibilityModeActive(undefined, Date.parse("2026-01-01T00:00:00Z"))).toBe(
      false,
    );
  });

  it("keeps force mode active before expiresAt", () => {
    resetChatPlatformRemoteConfigForTests({
      chatPlatformVisibilityProtection: true,
      forcePromptVisibilityMode: true,
      expiresAt: "2030-01-01T00:00:00Z",
    });
    expect(isForcePromptVisibilityModeActive(undefined, Date.parse("2026-01-01T00:00:00Z"))).toBe(
      true,
    );
  });
});
