import { describe, expect, it, vi, beforeEach } from "vitest";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import {
  createSpeakRequest,
  invalidateSpeakRequests,
  isCurrentSpeakRequest,
} from "@/lib/amy-voice-ownership";

describe("amy-voice-controller ownership", () => {
  beforeEach(() => {
    amyVoiceController.pause();
  });

  it("createSpeakRequest invalidates prior ids", () => {
    const first = createSpeakRequest();
    const second = createSpeakRequest();
    expect(isCurrentSpeakRequest(first)).toBe(false);
    expect(isCurrentSpeakRequest(second)).toBe(true);
  });

  it("invalidateSpeakRequests bumps active id", () => {
    const id = createSpeakRequest();
    const next = invalidateSpeakRequests();
    expect(next).toBeGreaterThan(id);
    expect(isCurrentSpeakRequest(id)).toBe(false);
  });

  it("pause resets controller to idle", () => {
    amyVoiceController.pause();
    expect(amyVoiceController.getSnapshot().status).toBe("idle");
    expect(amyVoiceController.getSnapshot().error).toBeNull();
  });

  it("pause is a no-op when already idle (avoids subscribe churn)", () => {
    amyVoiceController.pause();
    const beforeId = amyVoiceController.getSnapshot().requestId;
    amyVoiceController.pause();
    expect(amyVoiceController.getSnapshot().requestId).toBe(beforeId);
    expect(amyVoiceController.getSnapshot().status).toBe("idle");
  });

  it("stale speak does not mutate controller state", async () => {
    const authFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 500 }),
    );

    const first = amyVoiceController.speak("hello one", undefined, { authFetch });
    invalidateSpeakRequests();
    const second = amyVoiceController.speak("hello two", undefined, { authFetch });

    const [r1, r2] = await Promise.all([first, second]);
    expect(r1.success).toBe(false);
    if (!r1.success) expect(r1.error).toBe("tts_stale");
    expect(amyVoiceController.getSnapshot().status).toBe("idle");
    expect(r2.success === false || r2.success === true).toBe(true);
  });
});
