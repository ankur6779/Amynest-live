import { describe, expect, it } from "vitest";
import {
  TALKING_AMY_ECHO_RATE,
  isTalkingAmyEchoPlaying,
  playTalkingAmyEcho,
  stopTalkingAmyEcho,
} from "./talking-amy-echo";
import { getTalkingAmyMode } from "./talking-amy-modes";

describe("talking-amy-echo", () => {
  it("rejects empty blobs", async () => {
    const result = await playTalkingAmyEcho(new Blob([], { type: "audio/webm" }));
    expect(result).toEqual({ ok: false, error: "echo_empty_blob" });
  });

  it("exposes chipmunk base preset rate for legacy callers", () => {
    expect(TALKING_AMY_ECHO_RATE).toBe(getTalkingAmyMode("chipmunk").voice.playbackRate);
    expect(TALKING_AMY_ECHO_RATE).toBe(1.35);
  });

  it("stop clears playing state", () => {
    stopTalkingAmyEcho();
    expect(isTalkingAmyEchoPlaying()).toBe(false);
  });

  it("accepts a mode id without throwing on tiny blobs", async () => {
    const result = await playTalkingAmyEcho(new Blob([1], { type: "audio/webm" }), {
      mode: "robot",
    });
    expect(result.ok).toBe(false);
  });
});
