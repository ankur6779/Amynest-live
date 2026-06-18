import { describe, expect, it } from "vitest";
import {
  OPENAI_REALTIME_CALLS_URL,
  resolveOpenAiRealtimeCallsUrl,
} from "@/lib/openai-realtime-webrtc";

describe("openai-realtime-webrtc", () => {
  it("always resolves browser calls URL to public OpenAI endpoint", () => {
    expect(resolveOpenAiRealtimeCallsUrl(null)).toBe(OPENAI_REALTIME_CALLS_URL);
    expect(resolveOpenAiRealtimeCallsUrl("https://proxy.internal/v1/realtime/calls")).toBe(
      OPENAI_REALTIME_CALLS_URL,
    );
    expect(resolveOpenAiRealtimeCallsUrl("https://api.openai.com/v1/realtime/calls")).toBe(
      OPENAI_REALTIME_CALLS_URL,
    );
  });
});
