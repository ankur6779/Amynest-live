import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  OPENAI_CHAT_MODEL_DEFAULTS,
  isGpt5FamilyModel,
  openAiChatTemperatureField,
  resolveOpenAiChatModel,
  resolveOpenAiChatModelCatalog,
} from "./openai-model-catalog.js";
import { resolveBirthSkyModelCatalog } from "./birth-sky/ai-model-router.js";

const ENV_KEYS = [
  "OPENAI_CHAT_MODEL",
  "OPENAI_CHAT_MODEL_FAST",
  "OPENAI_CHAT_MODEL_REASONING",
  "OPENAI_CHAT_MODEL_LEGACY",
] as const;

describe("OpenAI chat model catalog", () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  before(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
  });

  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  after(() => {
    for (const key of ENV_KEYS) {
      const prev = saved[key];
      if (prev === undefined) delete process.env[key];
      else process.env[key] = prev;
    }
  });

  it("defaults fast / reasoning / legacy independently", () => {
    const catalog = resolveOpenAiChatModelCatalog();
    assert.equal(catalog.fast, OPENAI_CHAT_MODEL_DEFAULTS.fast);
    assert.equal(catalog.reasoning, OPENAI_CHAT_MODEL_DEFAULTS.reasoning);
    assert.equal(catalog.legacy, OPENAI_CHAT_MODEL_DEFAULTS.legacy);
    assert.equal(resolveOpenAiChatModel("fast"), "gpt-5-mini");
    assert.equal(resolveOpenAiChatModel("reasoning"), "gpt-5");
    assert.equal(resolveOpenAiChatModel("legacy"), "gpt-4o-mini");
  });

  it("does not let OPENAI_CHAT_MODEL collapse Birth Sky FAST and REASONING", () => {
    process.env.OPENAI_CHAT_MODEL = "gpt-4o-mini";
    const catalog = resolveOpenAiChatModelCatalog();
    assert.equal(catalog.fast, "gpt-5-mini");
    assert.equal(catalog.reasoning, "gpt-5");
    assert.equal(catalog.legacy, "gpt-4o-mini");
    const birthSky = resolveBirthSkyModelCatalog();
    assert.equal(birthSky.fast, "gpt-5-mini");
    assert.equal(birthSky.reasoning, "gpt-5");
  });

  it("honours per-tier env overrides without cross-talk", () => {
    process.env.OPENAI_CHAT_MODEL_FAST = "gpt-5-mini-override";
    process.env.OPENAI_CHAT_MODEL_REASONING = "gpt-5-override";
    process.env.OPENAI_CHAT_MODEL_LEGACY = "gpt-4o-mini-override";
    const catalog = resolveOpenAiChatModelCatalog();
    assert.equal(catalog.fast, "gpt-5-mini-override");
    assert.equal(catalog.reasoning, "gpt-5-override");
    assert.equal(catalog.legacy, "gpt-4o-mini-override");
  });

  it("uses OPENAI_CHAT_MODEL only as a deprecated LEGACY alias", () => {
    process.env.OPENAI_CHAT_MODEL = "gpt-4o-mini-legacy-alias";
    assert.equal(resolveOpenAiChatModel("legacy"), "gpt-4o-mini-legacy-alias");
    assert.equal(resolveOpenAiChatModel("fast"), "gpt-5-mini");
  });

  it("prefers OPENAI_CHAT_MODEL_LEGACY over deprecated OPENAI_CHAT_MODEL", () => {
    process.env.OPENAI_CHAT_MODEL = "gpt-4o-mini-alias";
    process.env.OPENAI_CHAT_MODEL_LEGACY = "gpt-4o-mini-explicit";
    assert.equal(resolveOpenAiChatModel("legacy"), "gpt-4o-mini-explicit");
  });
});

describe("openAiChatTemperatureField (GPT-5 compatibility)", () => {
  it("omits temperature for gpt-5-mini even when 0.7 is requested", () => {
    const request = {
      model: "gpt-5-mini",
      ...openAiChatTemperatureField("gpt-5-mini", 0.7),
    };
    assert.equal(request.temperature, undefined);
    assert.equal("temperature" in request, false);
  });

  it("omits temperature for gpt-5 even when 0.7 is requested", () => {
    const request = {
      model: "gpt-5",
      ...openAiChatTemperatureField("gpt-5", 0.7),
    };
    assert.equal(request.temperature, undefined);
    assert.equal("temperature" in request, false);
  });

  it("preserves temperature for gpt-4o-mini", () => {
    const request = {
      model: "gpt-4o-mini",
      ...openAiChatTemperatureField("gpt-4o-mini", 0.7),
    };
    assert.equal(request.temperature, 0.7);
  });

  it("omits temperature when the caller did not set one", () => {
    const request = {
      model: "gpt-4o-mini",
      ...openAiChatTemperatureField("gpt-4o-mini", undefined),
    };
    assert.equal(request.temperature, undefined);
    assert.equal("temperature" in request, false);
  });

  it("classifies GPT-5 family ids including dotted variants", () => {
    assert.equal(isGpt5FamilyModel("gpt-5-mini"), true);
    assert.equal(isGpt5FamilyModel("gpt-5"), true);
    assert.equal(isGpt5FamilyModel("GPT-5-mini"), true);
    assert.equal(isGpt5FamilyModel("gpt-5.4-mini"), true);
    assert.equal(isGpt5FamilyModel("gpt-4o-mini"), false);
    assert.equal(isGpt5FamilyModel("gpt-4o"), false);
  });

  it("omits temperature on Birth Sky FAST (gpt-5-mini) and REASONING (gpt-5)", () => {
    const prevFast = process.env.OPENAI_CHAT_MODEL_FAST;
    const prevReasoning = process.env.OPENAI_CHAT_MODEL_REASONING;
    delete process.env.OPENAI_CHAT_MODEL_FAST;
    delete process.env.OPENAI_CHAT_MODEL_REASONING;
    try {
      const catalog = resolveBirthSkyModelCatalog();
      assert.equal(catalog.fast, "gpt-5-mini");
      assert.equal(catalog.reasoning, "gpt-5");

      const fastRequest = {
        model: catalog.fast,
        max_completion_tokens: 500,
        ...openAiChatTemperatureField(catalog.fast, 0.7),
      };
      const reasoningRequest = {
        model: catalog.reasoning,
        max_completion_tokens: 500,
        ...openAiChatTemperatureField(catalog.reasoning, 0.7),
      };

      assert.equal(fastRequest.temperature, undefined);
      assert.equal("temperature" in fastRequest, false);
      assert.equal(reasoningRequest.temperature, undefined);
      assert.equal("temperature" in reasoningRequest, false);
    } finally {
      if (prevFast === undefined) delete process.env.OPENAI_CHAT_MODEL_FAST;
      else process.env.OPENAI_CHAT_MODEL_FAST = prevFast;
      if (prevReasoning === undefined) delete process.env.OPENAI_CHAT_MODEL_REASONING;
      else process.env.OPENAI_CHAT_MODEL_REASONING = prevReasoning;
    }
  });
});
