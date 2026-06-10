import { useMemo } from "react";
import {
  computeIdleMs,
  deriveAmyPresence,
  type AmyPresenceOutput,
} from "@workspace/math-playground-engagement";
import type { PlaygroundEngagementState } from "@workspace/math-playground";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import type { PlaygroundAmyMood } from "@workspace/math-playground-engagement";

function moodToAmy3D(mood: PlaygroundAmyMood): Amy3DState {
  switch (mood) {
    case "speaking":
      return "speaking";
    case "listening":
      return "listening";
    case "celebrating":
      return "celebrating";
    case "encouraging":
      return "encouraging";
    default:
      return "idle";
  }
}

export interface AmyPresenceInput {
  engagement?: PlaygroundEngagementState;
  amySpeaking?: boolean;
  childListening?: boolean;
  justSucceeded?: boolean;
  justFailed?: boolean;
  reactionSeed?: number;
}

export function usePlaygroundAmyPresence(input: AmyPresenceInput): {
  presence: AmyPresenceOutput;
  amy3dState: Amy3DState;
} {
  const presence = useMemo(() => {
    const engagement = input.engagement;
    const now = Date.now();
    const idleMs = engagement ? computeIdleMs(engagement, now) : 0;
    const sessionLengthMs = engagement
      ? now - engagement.sessionStartedAt
      : 0;

    return deriveAmyPresence(
      {
        consecutiveSuccesses: engagement?.consecutiveSuccesses ?? 0,
        consecutiveFailures: engagement?.consecutiveFailures ?? 0,
        sessionLengthMs,
        idleMs,
        justSucceeded: input.justSucceeded,
        justFailed: input.justFailed,
        amySpeaking: input.amySpeaking,
        childListening: input.childListening,
      },
      input.reactionSeed,
    );
  }, [
    input.engagement,
    input.amySpeaking,
    input.childListening,
    input.justSucceeded,
    input.justFailed,
    input.reactionSeed,
  ]);

  return {
    presence,
    amy3dState: moodToAmy3D(presence.mood),
  };
}
