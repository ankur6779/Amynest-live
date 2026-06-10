import { pickAmyReaction, reactionPoolForOutcome } from "./amy-reaction-catalog";
import type { AmyPresenceOutput, EmotionalEngagementInput, PlaygroundAmyMood } from "./types";

function baseMood(input: EmotionalEngagementInput): PlaygroundAmyMood {
  if (input.amySpeaking) return "speaking";
  if (input.childListening) return "listening";
  if (input.justSucceeded || input.consecutiveSuccesses >= 3) return "celebrating";
  if (input.justFailed || input.consecutiveFailures >= 2) return "encouraging";
  return "idle";
}

export function deriveAmyPresence(
  input: EmotionalEngagementInput,
  seed?: number,
): AmyPresenceOutput {
  const mood = baseMood(input);
  const poolKey = reactionPoolForOutcome({
    consecutiveSuccesses: input.consecutiveSuccesses,
    consecutiveFailures: input.consecutiveFailures,
    justSucceeded: input.justSucceeded,
    justFailed: input.justFailed,
    idleMs: input.idleMs,
  });

  const shouldReact =
    input.justSucceeded ||
    input.justFailed ||
    input.idleMs >= 8_000 ||
    (mood === "idle" && input.sessionLengthMs > 5_000);

  const reaction = shouldReact ? pickAmyReaction(poolKey, seed) : null;
  const idleLoop = mood === "idle" && !input.amySpeaking && !input.childListening;

  return { mood, reaction, idleLoop };
}
