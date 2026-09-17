import { beforeEach, describe, expect, it, vi } from "vitest";

const streamTtsToObjectUrl = vi.fn();

vi.mock("@/lib/amy-voice-stream-player", () => ({
  streamTtsToObjectUrl: (...args: unknown[]) => streamTtsToObjectUrl(...args),
}));

vi.mock("@/lib/amy-voice-api-backoff", () => ({
  isApiBackoffActive: () => false,
  recordApiBackoffFailure: vi.fn(),
  resetApiBackoff: vi.fn(),
  waitForApiBackoff: vi.fn(),
}));

vi.mock("@/lib/amy-voice-circuit", () => ({
  shouldSkipLiveTtsApi: () => false,
}));

vi.mock("@/lib/static-audio", () => ({
  isCatalogPhrase: () => false,
  logDynamicTtsViolation: vi.fn(),
}));

describe("generateTts live stream URL", () => {
  beforeEach(() => {
    streamTtsToObjectUrl.mockReset();
  });

  it("plays the streamed blob instead of racing /api/tts/audio/:key", async () => {
    streamTtsToObjectUrl.mockResolvedValue({
      ok: true,
      url: "blob:http://localhost/tts-live",
      cacheKey: "a".repeat(64),
      cached: false,
    });
    const { generateTts } = await import("./tts-playback");
    const result = await generateTts(vi.fn(), { text: "Hello, this is an Amy audio test." });
    expect(result.success).toBe(true);
    expect(result.audioUrl).toBe("blob:http://localhost/tts-live");
    expect(result.cacheKey).toHaveLength(64);
  });
});
