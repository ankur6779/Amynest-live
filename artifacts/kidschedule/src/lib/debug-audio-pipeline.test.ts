import { describe, expect, it, beforeEach } from "vitest";
import {
  isDebugAudioPipelineEnabled,
  logAudioPipeline,
  getAudioPipelineEvents,
  resetAudioPipelineDebugForTests,
} from "@/lib/debug-audio-pipeline";

describe("debug-audio-pipeline", () => {
  beforeEach(() => {
    resetAudioPipelineDebugForTests();
    localStorage.removeItem("DEBUG_AUDIO_PIPELINE");
  });

  it("is disabled by default", () => {
    expect(isDebugAudioPipelineEnabled()).toBe(false);
    logAudioPipeline("noop");
    expect(getAudioPipelineEvents()).toHaveLength(0);
  });

  it("records events when localStorage flag is set", () => {
    localStorage.setItem("DEBUG_AUDIO_PIPELINE", "true");
    expect(isDebugAudioPipelineEnabled()).toBe(true);
    logAudioPipeline("test_event", { paragraphIdx: 2, lessonId: "lesson-a" });
    const events = getAudioPipelineEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("test_event");
    expect(events[0]?.paragraphIdx).toBe(2);
  });
});
