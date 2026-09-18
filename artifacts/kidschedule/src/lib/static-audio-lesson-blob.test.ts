import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackObjectUrlMock = vi.fn();
const createMock = vi.fn((url: string) => ({ src: url }) as HTMLAudioElement);

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    trackObjectUrl: (...args: unknown[]) => trackObjectUrlMock(...args),
    create: (...args: unknown[]) => createMock(args[0] as string),
    getCached: vi.fn(),
  },
}));

vi.mock("@/lib/amy-voice-audio-diag", () => ({
  isAmyVoiceAudioDebugEnabled: () => false,
  logAmyVoiceDiag: vi.fn(),
}));

import { fetchStaticAudioObjectUrl } from "./static-audio";
import { looksLikeMpegAudioBytes } from "./amy-voice-audio-start";

function mpegBytes(size = 800): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes[0] = 0xff;
  bytes[1] = 0xf3;
  bytes[2] = 0xc4;
  return bytes;
}

describe("fetchStaticAudioObjectUrl", () => {
  const originalFetch = globalThis.fetch;
  const originalCreate = URL.createObjectURL;
  const created: string[] = [];

  beforeEach(() => {
    trackObjectUrlMock.mockReset();
    createMock.mockClear();
    created.length = 0;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      const url = `blob:static-${blob.size}`;
      created.push(url);
      return url;
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreate;
  });

  it("returns a blob URL and does not revoke via trackObjectUrl", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(mpegBytes(), {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
          "x-amynest-static-source": "asset",
        },
      }),
    ) as unknown as typeof fetch;

    const url = await fetchStaticAudioObjectUrl("https://www.amynest.in/api/static-audio/843c97985463d0b69dfb8ff6288be61d.mp3");
    expect(url).toBe("blob:static-800");
    expect(trackObjectUrlMock).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/static-audio/843c97985463d0b69dfb8ff6288be61d.mp3"),
      expect.objectContaining({ method: "GET" }),
    );
    const init = vi.mocked(globalThis.fetch).mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string> | undefined)?.Range).toBeUndefined();
  });

  it("keeps MPEG bytes even when Web Audio decode would fail", async () => {
    expect(looksLikeMpegAudioBytes(mpegBytes())).toBe(true);
    expect(looksLikeMpegAudioBytes(new Uint8Array([0x00, 0x01, 0x02]))).toBe(false);
    expect(looksLikeMpegAudioBytes(new Uint8Array([0x49, 0x44, 0x33]))).toBe(true);
  });
});
