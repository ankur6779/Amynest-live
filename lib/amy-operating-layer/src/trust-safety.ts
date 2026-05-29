import type { ProactiveAmyMessage } from "./types.js";

const GUILT_PATTERNS = [
  /\byou failed\b/i,
  /\byou're failing\b/i,
  /\byou should have\b/i,
  /\bbad parent\b/i,
  /\byou're behind\b/i,
  /\bdon't worry\b.*\bbut you\b/i,
];

const OVERCONFIDENCE_PATTERNS = [
  /\bwill definitely\b/i,
  /\bguaranteed\b/i,
  /\balways will\b/i,
  /\b100%\s+sure\b/i,
];

export function applyTrustFilter(msg: ProactiveAmyMessage): ProactiveAmyMessage {
  let body = msg.body;

  for (const p of GUILT_PATTERNS) {
    body = body.replace(p, "there's room to adjust");
  }
  for (const p of OVERCONFIDENCE_PATTERNS) {
    body = body.replace(p, "may");
  }

  if (!body.includes("may") && !body.includes("might") && msg.urgency === "high") {
    body = body.replace(/\.$/, "") + " — this is a prediction, not a certainty.";
  }

  return { ...msg, body };
}

export function formatObservationVsPrediction(
  text: string,
  kind: "observation" | "prediction",
): string {
  if (kind === "observation") return `[Observed] ${text}`;
  return `[Predicted — may not happen] ${text}`;
}

export function trustGuidelinesForPrompt(): string {
  return `
TRUST & SAFETY (mandatory):
- Distinguish observations ("I see that…") from predictions ("It looks like… might happen").
- Never use guilt-inducing language. Never say the parent failed.
- Express uncertainty when predicting ("may", "might", "based on patterns").
- Never claim medical certainty. Suggest professionals only for safety-critical topics.
- If data is limited, say so honestly.
`.trim();
}
