import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../config/index.js";
import { ContentEngineError } from "./errors.js";
import { MockProvider } from "./mock-provider.js";
import { ProviderRegistry } from "./registry.js";

describe("AI provider registry", () => {
  it("registers mock openai and future providers", () => {
    const registry = new ProviderRegistry({ config: loadDefaultConfig() });
    assert.equal(registry.get("mock").id, "mock");
    assert.equal(registry.get("openai").id, "openai");
    assert.equal(registry.get("future").id, "future");
    assert.equal(registry.get("mock").supportsJSON(), true);
  });

  it("supports provider switching via config", () => {
    const config = { ...loadDefaultConfig(), scriptProvider: "mock" as const };
    const registry = new ProviderRegistry({ config });
    assert.equal(registry.resolvePrimary(config).id, "mock");
  });

  it("MockProvider returns deterministic JSON and can fail for retry tests", async () => {
    const ok = new MockProvider();
    const result = await ok.generate({
      systemPrompt: "sys",
      userPrompt: 'title: "Calm Nights"',
      responseFormat: "json",
      metadata: {
        title: "Calm Nights",
        category: "Sleep",
        ageGroup: "1-3y",
        cta: "Try AmyNest",
        language: "en-IN",
        duration: "30",
      },
    });
    const json = JSON.parse(result.text);
    assert.equal(typeof json.hook, "string");
    assert.equal(json.titles.alternates.length, 5);

    const flaky = new MockProvider({ failTimes: 1 });
    await assert.rejects(
      () =>
        flaky.generate({
          systemPrompt: "sys",
          userPrompt: "user",
          responseFormat: "json",
        }),
      (err: unknown) =>
        err instanceof ContentEngineError && err.code === "PROVIDER_UNAVAILABLE",
    );
    const recovered = await flaky.generate({
      systemPrompt: "sys",
      userPrompt: "user",
      responseFormat: "json",
      metadata: { title: "Recovered" },
    });
    assert.ok(recovered.text.includes("Recovered"));
  });
});
