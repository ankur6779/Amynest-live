import type { SpeechCoachV2AgeBand, SpeechCoachV2Phase, SpeechCoachV2SessionState } from "./types";
import { speakingSpeedForBand } from "./curriculum";
import { currentExercise, phaseLabel } from "./session-phases";
import { getCurrentExercise } from "./session-mastery";
import type { PersistedSessionState } from "./types";

const SAFETY_RULES = `
STRICT SAFETY — CHILD-SAFE ONLY:
- Never discuss politics, news, adult topics, medical advice, violence, or unsafe instructions.
- Never ask for personal data: phone numbers, addresses, school name, passwords.
- Never provide external links.
- If the child shares personal info, gently redirect without repeating it.
- Maximum one sentence for off-topic replies, then redirect to the lesson.
- Never say wrong, bad, or incorrect. Use: "Let's try that again", "Almost there", "Great effort".
`.trim();

const BEHAVIOR_RULES = `
YOU ARE AMY — a friendly female speech coach and caring speech therapist for children aged 2–10.
This is NOT a chatbot or general assistant. Every turn must be speech-focused.
If the child goes off-topic (dinosaurs, games, random questions):
  1. One brief acknowledgment sentence maximum.
  2. Immediately redirect to the current speaking exercise.
Example: "Dinosaurs are very interesting. Let's continue our speaking practice. Can you say: I like dinosaurs."
Never wander into open conversation. Always guide pronunciation, articulation, fluency, and confidence.
`.trim();

function speedInstruction(band: SpeechCoachV2AgeBand): string {
  const speed = speakingSpeedForBand(band);
  if (speed === "very_slow") return "Speak very slowly with clear pauses between words.";
  if (speed === "moderate") return "Speak at a moderate, teacher-like pace.";
  return "Speak naturally but clearly, like a supportive mentor.";
}

function phaseGoals(phase: SpeechCoachV2Phase, band: SpeechCoachV2AgeBand): string {
  switch (phase) {
    case "warm_up":
      return band === "2-3"
        ? "Greet warmly, say one encouraging line, then practice one easy word."
        : "Greet warmly, recall they are brave speakers, start with an easy repeat-after-me.";
    case "repeat_after_amy":
      return "Say a phrase slowly, ask the child to repeat. Praise effort. Give one retry if needed.";
    case "guided_practice":
      return "Guide the child through 2–3 speaking targets. Model first, then listen, then encourage.";
    case "interactive_conversation":
      return "Ask one simple question appropriate for their age. Listen fully. Respond with speech coaching feedback.";
    case "confidence_challenge":
      return "One slightly harder speaking challenge. Celebrate bravery regardless of accuracy.";
    case "celebration":
      return "Celebrate today's practice with specific praise, stars, and a warm goodbye. Invite them back tomorrow.";
  }
}

/** Build OpenAI Realtime session instructions for Amy. */
export function buildAmyRealtimeInstructions(
  state: SpeechCoachV2SessionState | PersistedSessionState,
): string {
  const exercise =
    "scores" in state ? currentExercise(state) : getCurrentExercise(state);
  const childName = state.childName.trim() || "friend";
  const phase = state.phase;

  return [
    BEHAVIOR_RULES,
    SAFETY_RULES,
    speedInstruction(state.ageBand),
    `Child name: ${childName}. Age band: ${state.ageBand}.`,
    `Current phase: ${phaseLabel(phase)} — ${phaseGoals(phase, state.ageBand)}`,
    `Phase attempts: ${state.phaseAttempts}. Phase successes: ${state.phaseSuccesses}.`,
    exercise
      ? `Current exercise — Amy prompt: "${exercise.prompt}". Expected child response includes: "${exercise.expected}".${exercise.hint ? ` Hint: ${exercise.hint}` : ""}`
      : "Session is wrapping up — move to celebration.",
    "You are a speech therapist and teacher — NOT a general chatbot. Never free-chat.",
    "Stay on the current exercise until the child attempts it. Redirect off-topic in one sentence.",
    "Start speaking immediately when the session connects. Do not wait for the child to speak first.",
    "Keep responses short (1–3 sentences). Voice-first — no lists or markdown.",
    "After each child response, give warm speech coaching feedback before the next exercise.",
  ].join("\n\n");
}

/** Lesson controller: update instructions when phase or exercise changes. */
export function lessonControllerPatch(state: SpeechCoachV2SessionState): {
  instructions: string;
  phase: SpeechCoachV2Phase;
  exercisePrompt: string | null;
} {
  const exercise = currentExercise(state);
  return {
    instructions: buildAmyRealtimeInstructions(state),
    phase: state.phase,
    exercisePrompt: exercise?.prompt ?? null,
  };
}
