import type { RuntimeTraceFrame } from "@workspace/learning-runtime";

export type InspectorTransportStatus = {
  online: boolean;
  offlineQueueDepth: number;
  lastEventAt: string | null;
  framesCaptured: number;
};

type Listener = () => void;

const MAX_FRAMES = 500;
const listeners = new Set<Listener>();

let frames: RuntimeTraceFrame[] = [];
let cursor = -1;
let paused = false;
let resumeBuffer: RuntimeTraceFrame[] = [];

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* isolate */
    }
  }
}

export function subscribeInspectorStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function pushInspectorFrame(frame: RuntimeTraceFrame): void {
  if (paused) {
    resumeBuffer.push(frame);
    if (resumeBuffer.length > MAX_FRAMES) {
      resumeBuffer = resumeBuffer.slice(-MAX_FRAMES);
    }
    notify();
    return;
  }
  frames.push(frame);
  if (frames.length > MAX_FRAMES) {
    frames = frames.slice(-MAX_FRAMES);
  }
  cursor = frames.length - 1;
  notify();
}

export function getInspectorFrames(): readonly RuntimeTraceFrame[] {
  return frames;
}

export function getInspectorCursor(): number {
  return cursor;
}

export function getInspectorActiveFrame(): RuntimeTraceFrame | null {
  if (cursor < 0 || cursor >= frames.length) return null;
  return frames[cursor] ?? null;
}

export function isInspectorPaused(): boolean {
  return paused;
}

export function getInspectorBufferedCount(): number {
  return resumeBuffer.length;
}

export function setInspectorCursor(index: number): void {
  if (!frames.length) {
    cursor = -1;
    notify();
    return;
  }
  cursor = Math.max(0, Math.min(frames.length - 1, index));
  notify();
}

export function inspectorStepForward(): void {
  setInspectorCursor(cursor + 1);
}

export function inspectorStepBackward(): void {
  setInspectorCursor(cursor - 1);
}

export function inspectorPause(): void {
  paused = true;
  notify();
}

export function inspectorResume(): void {
  paused = false;
  if (resumeBuffer.length) {
    for (const f of resumeBuffer) {
      frames.push(f);
    }
    if (frames.length > MAX_FRAMES) {
      frames = frames.slice(-MAX_FRAMES);
    }
    resumeBuffer = [];
    cursor = frames.length - 1;
  }
  notify();
}

export function clearInspectorFrames(): void {
  frames = [];
  resumeBuffer = [];
  cursor = -1;
  notify();
}

export function filterFrames(opts: {
  childId?: string;
  sessionId?: string | null;
}): RuntimeTraceFrame[] {
  return frames.filter((f) => {
    if (opts.childId && f.childId !== String(opts.childId)) return false;
    if (opts.sessionId != null && f.sessionId !== opts.sessionId) return false;
    return true;
  });
}

export function getInspectorTransportStatus(
  offlineQueueDepth = 0,
): InspectorTransportStatus {
  const last = frames[frames.length - 1];
  return {
    online: typeof navigator === "undefined" ? true : navigator.onLine !== false,
    offlineQueueDepth,
    lastEventAt: last?.at ?? null,
    framesCaptured: frames.length + resumeBuffer.length,
  };
}
