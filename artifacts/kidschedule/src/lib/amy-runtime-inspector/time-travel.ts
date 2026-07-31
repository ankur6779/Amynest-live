import {
  createLearningRuntime,
  type LearningDecision,
  type RuntimeTraceFrame,
} from "@workspace/learning-runtime";
import {
  filterFrames,
  getInspectorActiveFrame,
  getInspectorCursor,
  getInspectorFrames,
  setInspectorCursor,
} from "./trace-store";

export type TimeTravelMode = "event" | "session" | "child";

export type TimeTravelReplayResult = {
  mode: TimeTravelMode;
  frames: RuntimeTraceFrame[];
  decisions: LearningDecision[];
  startedAt: string | null;
  endedAt: string | null;
};

/**
 * Navigate cursor to a specific historical frame (view-only time travel).
 */
export function jumpToFrame(frameId: string): boolean {
  const frames = getInspectorFrames();
  const idx = frames.findIndex((f) => f.id === frameId);
  if (idx < 0) return false;
  setInspectorCursor(idx);
  return true;
}

/**
 * Replay recorded frames through a fresh runtime (does not mutate live runtime).
 * Useful to verify deterministic decisions for a session/child.
 */
export function replayTraceFrames(
  mode: TimeTravelMode,
  opts?: { childId?: string; sessionId?: string | null },
): TimeTravelReplayResult {
  const active = getInspectorActiveFrame();
  const childId = opts?.childId ?? active?.childId;
  const sessionId =
    mode === "session"
      ? (opts?.sessionId ?? active?.sessionId ?? null)
      : undefined;

  let source: RuntimeTraceFrame[];
  if (mode === "event") {
    source = active ? [active] : [];
  } else if (mode === "session") {
    source = filterFrames({ childId, sessionId: sessionId ?? null });
  } else {
    source = filterFrames({ childId });
  }

  const runtime = createLearningRuntime();
  const decisions: LearningDecision[] = [];
  for (const frame of source) {
    const { decision } = runtime.processEvent(frame.event, frame.snapshots);
    if (decision.ruleId !== "runtime.ignore_echo") {
      decisions.push(decision);
    }
  }

  return {
    mode,
    frames: source,
    decisions,
    startedAt: source[0]?.at ?? null,
    endedAt: source[source.length - 1]?.at ?? null,
  };
}

export function getTimeTravelPosition(): {
  index: number;
  total: number;
  frame: RuntimeTraceFrame | null;
} {
  const frames = getInspectorFrames();
  const index = getInspectorCursor();
  return {
    index,
    total: frames.length,
    frame: getInspectorActiveFrame(),
  };
}
