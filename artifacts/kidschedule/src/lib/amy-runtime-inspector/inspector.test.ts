import { beforeEach, describe, expect, it } from "vitest";
import {
  buildLearningEvent,
  learningItemEvent,
} from "@workspace/learning-events";
import { createLearningRuntime } from "@workspace/learning-runtime";
import {
  clearInspectorFrames,
  getInspectorActiveFrame,
  getInspectorCursor,
  getInspectorFrames,
  inspectorPause,
  inspectorResume,
  inspectorStepBackward,
  pushInspectorFrame,
  setInspectorCursor,
} from "./trace-store";
import { replayTraceFrames } from "./time-travel";
import { isAmyRuntimeInspectorBuildEnabled } from "./enabled";

describe("amy-runtime-inspector store", () => {
  beforeEach(() => {
    clearInspectorFrames();
  });

  it("is build-enabled only in DEV", () => {
    expect(isAmyRuntimeInspectorBuildEnabled()).toBe(Boolean(import.meta.env.DEV));
  });

  it("captures frames and supports pause / step / resume", () => {
    const runtime = createLearningRuntime();
    runtime.setTracer((frame) => pushInspectorFrame(frame));

    runtime.processEvent(
      buildLearningEvent(
        learningItemEvent("learning.item_heard", {
          childId: 9,
          module: "discovery_worlds",
          entityId: "lion",
        }),
        { seq: 1 },
      ),
    );
    expect(getInspectorFrames().length).toBe(1);

    inspectorPause();
    runtime.processEvent(
      buildLearningEvent(
        learningItemEvent("learning.item_recognized", {
          childId: 9,
          module: "discovery_worlds",
          entityId: "lion",
          confidence: 90,
        }),
        { seq: 2 },
      ),
    );
    expect(getInspectorFrames().length).toBe(1);

    inspectorResume();
    expect(getInspectorFrames().length).toBe(2);

    setInspectorCursor(0);
    expect(getInspectorActiveFrame()?.event.seq).toBe(1);
    inspectorStepBackward();
    expect(getInspectorCursor()).toBe(0);
  });

  it("replays a session through a fresh runtime", () => {
    const runtime = createLearningRuntime();
    runtime.setTracer((frame) => pushInspectorFrame(frame));
    for (let i = 0; i < 3; i++) {
      runtime.processEvent(
        buildLearningEvent(
          learningItemEvent("learning.item_recognized", {
            childId: 11,
            module: "discovery_worlds",
            entityId: `item-${i}`,
            confidence: 90,
          }),
          { seq: i + 1 },
        ),
      );
    }
    const result = replayTraceFrames("child", { childId: "11" });
    expect(result.frames.length).toBe(3);
    expect(result.decisions.length).toBe(3);
  });
});
