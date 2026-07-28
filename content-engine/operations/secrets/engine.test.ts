import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../../config/index.js";
import { maskSecret, redactSecretsFromText, validateSecrets } from "./engine.js";

describe("secrets engine", () => {
  it("masks secrets and never requires them in permissive local mode", () => {
    assert.equal(maskSecret("abcdefghij"), "ab******ij");
    const report = validateSecrets({
      config: loadDefaultConfig(),
      env: {},
      environment: "local",
      mode: "permissive",
    });
    assert.equal(report.ok, true);
    assert.equal(report.missingRequired.length, 0);
  });

  it("requires YouTube secrets in strict production when youtube publishing is enabled", () => {
    const config = {
      ...loadDefaultConfig(),
      publishingProvider: "youtube" as const,
      opsNotificationChannels: ["webhook"] as const,
    };
    const report = validateSecrets({
      config,
      env: { WEBHOOK_URL: "https://example.test/hook" },
      environment: "production",
      mode: "strict",
    });
    assert.equal(report.ok, false);
    assert.ok(report.missingRequired.includes("YOUTUBE_CLIENT_ID"));
    assert.ok(report.diagnostics.every((d) => !d.maskedValue || d.maskedValue.includes("*")));
  });

  it("redacts secret values from text", () => {
    const env = { OPENAI_API_KEY: "sk-secret-value-12345" };
    const redacted = redactSecretsFromText("key=sk-secret-value-12345", env);
    assert.equal(redacted.includes("sk-secret-value-12345"), false);
    assert.match(redacted, /\*/);
  });
});
