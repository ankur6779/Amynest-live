import { processSessionFeedback } from "../feedbackEngine.js";
import type { LearningProfile, SessionFeedbackInput } from "../types-v2.js";
import type { RealtimeEvent } from "./types.js";
import { moduleToSkill, updateSkillFromOutcome } from "../learningProfileEngine.js";

export type StreamFlushPayload = {
  childId: string;
  profile: LearningProfile;
  engagementDelta: number;
};

export type StreamProcessorOptions = {
  debounceMs?: number;
  onFlush: (payload: StreamFlushPayload) => void | Promise<void>;
};

/**
 * Debounced streaming feedback — adapts confidence/engagement on each event,
 * persists profile in batches (not per tap).
 */
export class RealtimeStreamProcessor {
  private pendingProfile: LearningProfile | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private readonly onFlush: StreamProcessorOptions["onFlush"];

  constructor(options: StreamProcessorOptions) {
    this.debounceMs = options.debounceMs ?? 2_000;
    this.onFlush = options.onFlush;
  }

  onEvent(event: RealtimeEvent, profile: LearningProfile): LearningProfile {
    let next = { ...profile };

    switch (event.type) {
      case "CONTENT_COMPLETED":
        next = updateSkillFromOutcome(
          next,
          moduleToSkill(event.moduleId),
          {
            success: event.metadata?.correct !== false,
            skipped: false,
          },
          "fast",
        );
        next = bumpEngagement(next, event.metadata?.correct !== false ? 6 : -4);
        break;
      case "CONTENT_SKIPPED":
        next = updateSkillFromOutcome(
          next,
          moduleToSkill(event.moduleId),
          { success: false, skipped: true },
          "fast",
        );
        next = bumpEngagement(next, -8);
        break;
      case "USER_IDLE":
      case "SESSION_PAUSED":
        next = bumpEngagement(next, -5);
        break;
      case "RAPID_INTERACTION":
        next = bumpEngagement(next, 2);
        break;
      default:
        break;
    }

    this.pendingProfile = next;
    this.scheduleFlush(event.childId);
    return next;
  }

  /** Full session chunk flush (end of activity burst). */
  flushSessionFeedback(
    profile: LearningProfile,
    input: SessionFeedbackInput,
  ): LearningProfile {
    const result = processSessionFeedback(profile, input, { difficultyRamp: "fast" });
    this.pendingProfile = result.profile;
    this.scheduleFlush(input.childId);
    return result.profile;
  }

  async flushNow(childId: string): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.pendingProfile) return;
    const profile = this.pendingProfile;
    this.pendingProfile = null;
    await this.onFlush({ childId, profile, engagementDelta: 0 });
  }

  private scheduleFlush(childId: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.flushNow(childId);
    }, this.debounceMs);
  }
}

function bumpEngagement(profile: LearningProfile, delta: number): LearningProfile {
  const score = Math.max(
    0,
    Math.min(100, profile.behavior.engagementScore + delta),
  );
  return {
    ...profile,
    behavior: { ...profile.behavior, engagementScore: score },
  };
}
