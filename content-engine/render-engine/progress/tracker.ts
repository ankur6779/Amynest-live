import type {
  RenderProgressEvent,
  RenderProgressStage,
} from "../../types/render-package.js";

export type ProgressListener = (event: RenderProgressEvent) => void;

export class ProgressTracker {
  private readonly listeners = new Set<ProgressListener>();
  private readonly log: RenderProgressEvent[] = [];

  on(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(
    stage: RenderProgressStage,
    progress: number,
    message: string,
    details?: RenderProgressEvent["details"],
  ): RenderProgressEvent {
    const event: RenderProgressEvent = {
      stage,
      progress: clamp01(progress),
      message,
      at: new Date().toISOString(),
      details,
    };
    this.log.push(event);
    for (const listener of this.listeners) listener(event);
    return event;
  }

  getLog(): RenderProgressEvent[] {
    return this.log.map((e) => ({ ...e, details: e.details ? { ...e.details } : undefined }));
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
