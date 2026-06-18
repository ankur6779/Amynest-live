import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCTION_REALTIME_MODEL_DEFAULT,
  isRetiredPreviewRealtimeModel,
  resolveSpeechCoachV2RealtimeModel,
} from "./speechCoachV2RealtimeService.js";

describe("speechCoachV2RealtimeService model resolution", () => {
  it("rejects preview models", () => {
    assert.equal(isRetiredPreviewRealtimeModel("gpt-4o-realtime-preview-2024-12-17"), true);
    assert.equal(isRetiredPreviewRealtimeModel("gpt-realtime"), false);
    assert.equal(isRetiredPreviewRealtimeModel("gpt-realtime-2"), false);
  });

  it("falls back to GA default for preview env", () => {
    assert.equal(
      resolveSpeechCoachV2RealtimeModel("gpt-4o-realtime-preview-2024-12-17"),
      PRODUCTION_REALTIME_MODEL_DEFAULT,
    );
  });

  it("uses explicit GA model from env", () => {
    assert.equal(resolveSpeechCoachV2RealtimeModel("gpt-realtime"), "gpt-realtime");
    assert.equal(resolveSpeechCoachV2RealtimeModel("gpt-realtime-2"), "gpt-realtime-2");
  });

  it("defaults when env empty", () => {
    assert.equal(resolveSpeechCoachV2RealtimeModel(""), PRODUCTION_REALTIME_MODEL_DEFAULT);
    assert.equal(resolveSpeechCoachV2RealtimeModel(undefined), PRODUCTION_REALTIME_MODEL_DEFAULT);
  });
});
