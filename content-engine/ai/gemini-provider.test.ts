import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GeminiProvider } from "./gemini-provider.js";

describe("GeminiProvider", () => {
  it("reports unhealthy without API key", async () => {
    const provider = new GeminiProvider({
      apiKey: "",
      apiKeyEnv: "MISSING_GEMINI_FOR_TEST",
    });
    const health = await provider.health();
    assert.equal(health.ok, false);
    assert.equal(provider.id, "gemini");
    assert.equal(provider.supportsJSON(), true);
  });

  it("generates text via generateContent", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '{"hook":"hi","voiceScript":"hello"}' }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30,
          },
          modelVersion: "gemini-3.6-flash",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-3.6-flash",
      fetchImpl,
    });
    const result = await provider.generate({
      systemPrompt: "sys",
      userPrompt: "user",
      responseFormat: "json",
    });
    assert.equal(result.provider, "gemini");
    assert.match(result.text, /voiceScript/);
    assert.equal(result.usage.totalTokens, 30);
  });

  it("falls back to secondary model on recoverable failure", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (input) => {
      calls += 1;
      const url = String(input);
      if (url.includes("gemini-3.6-flash")) {
        return new Response("unavailable", { status: 503 });
      }
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "fallback-ok" }] } }],
        }),
        { status: 200 },
      );
    };
    const provider = new GeminiProvider({
      apiKey: "test-key",
      model: "gemini-3.6-flash",
      fallbackModel: "gemini-3.1-flash-lite",
      fetchImpl,
    });
    const result = await provider.generate({
      systemPrompt: "sys",
      userPrompt: "user",
      responseFormat: "text",
    });
    assert.equal(result.text, "fallback-ok");
    assert.ok(calls >= 2);
  });
});
