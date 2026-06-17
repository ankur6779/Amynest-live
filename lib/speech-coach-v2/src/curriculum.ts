import type { SpeechCoachV2AgeBand, SpeechCoachV2Exercise, SpeechCoachV2Phase } from "./types";

function exercisesForBand(band: SpeechCoachV2AgeBand): SpeechCoachV2Exercise[] {
  switch (band) {
    case "2-3":
      return [
        { id: "w-ball", kind: "single_word", prompt: "Say: ball", expected: "ball" },
        { id: "w-cat", kind: "single_word", prompt: "Say: cat", expected: "cat" },
        { id: "w-dog", kind: "single_word", prompt: "Say: dog", expected: "dog" },
        { id: "w-apple", kind: "single_word", prompt: "Say: apple", expected: "apple" },
        { id: "a-moo", kind: "animal_sound", prompt: "What does a cow say?", expected: "moo" },
        { id: "a-meow", kind: "animal_sound", prompt: "What does a cat say?", expected: "meow" },
        { id: "w-sun", kind: "single_word", prompt: "Say: sun", expected: "sun" },
        { id: "w-star", kind: "single_word", prompt: "Say: star", expected: "star" },
      ];
    case "4-5":
      return [
        { id: "p-water", kind: "phrase", prompt: "Say: I want water", expected: "I want water" },
        { id: "p-dog", kind: "phrase", prompt: "Say: I see a dog", expected: "I see a dog" },
        { id: "p-play", kind: "phrase", prompt: "Say: Can I play", expected: "Can I play" },
        { id: "p-happy", kind: "phrase", prompt: "Say: I am happy", expected: "I am happy" },
        { id: "p-book", kind: "phrase", prompt: "Say: Read my book", expected: "Read my book" },
        { id: "p-thank", kind: "phrase", prompt: "Say: Thank you Amy", expected: "Thank you Amy" },
      ];
    case "6-7":
      return [
        {
          id: "s-fruit",
          kind: "question_answer",
          prompt: "What is your favorite fruit?",
          expected: "My favorite fruit is",
          hint: "Start with: My favorite fruit is…",
        },
        {
          id: "s-day",
          kind: "sentence",
          prompt: "Tell me about your day in one sentence.",
          expected: "Today I",
          hint: "Start with: Today I…",
        },
        {
          id: "s-color",
          kind: "question_answer",
          prompt: "What color do you like best?",
          expected: "I like",
        },
        {
          id: "s-pet",
          kind: "sentence",
          prompt: "Do you have a pet? Tell me about it.",
          expected: "I have",
        },
        {
          id: "s-school",
          kind: "sentence",
          prompt: "What did you learn at school?",
          expected: "I learned",
        },
      ];
    case "8-10":
      return [
        {
          id: "c-friend",
          kind: "storytelling",
          prompt: "Describe your best friend.",
          expected: "My best friend",
        },
        {
          id: "c-zoo",
          kind: "conversation",
          prompt: "What would you do at the zoo?",
          expected: "At the zoo I would",
        },
        {
          id: "c-weekend",
          kind: "storytelling",
          prompt: "Tell me about your favorite weekend activity.",
          expected: "On the weekend I like to",
        },
        {
          id: "c-help",
          kind: "conversation",
          prompt: "How do you help at home?",
          expected: "I help by",
        },
        {
          id: "c-dream",
          kind: "storytelling",
          prompt: "What do you want to be when you grow up?",
          expected: "When I grow up I want to be",
        },
      ];
  }
}

/** Map child age in months to V2 curriculum band. */
export function ageBandFromMonths(totalMonths: number): SpeechCoachV2AgeBand {
  if (totalMonths < 48) return "2-3";
  if (totalMonths < 72) return "4-5";
  if (totalMonths < 96) return "6-7";
  return "8-10";
}

/** Speaking speed hint for Realtime session instructions. */
export function speakingSpeedForBand(band: SpeechCoachV2AgeBand): "very_slow" | "moderate" | "natural" {
  if (band === "2-3") return "very_slow";
  if (band === "4-5" || band === "6-7") return "moderate";
  return "natural";
}

/** Exercises selected for a given session phase. */
export function exercisesForPhase(
  band: SpeechCoachV2AgeBand,
  phase: SpeechCoachV2Phase,
  sessionSeed: number,
): SpeechCoachV2Exercise[] {
  const pool = exercisesForBand(band);
  const offset = sessionSeed % pool.length;

  switch (phase) {
    case "warm_up":
      return pool.slice(offset, offset + 2).concat(pool.slice(0, Math.max(0, 2 - (pool.length - offset))));
    case "repeat_after_amy":
      return pool.slice((offset + 1) % pool.length, (offset + 1) % pool.length + 3);
    case "guided_practice":
      return pool.slice((offset + 2) % pool.length, (offset + 2) % pool.length + 4);
    case "interactive_conversation":
      return pool.filter((e) => e.kind === "question_answer" || e.kind === "conversation" || e.kind === "storytelling").slice(0, 2);
    case "confidence_challenge":
      return [pool[(offset + pool.length - 1) % pool.length]!];
    case "celebration":
      return [];
    default:
      return pool.slice(0, 2);
  }
}

/** Full exercise list for a 10-minute session. */
export function buildSessionExercises(
  band: SpeechCoachV2AgeBand,
  sessionSeed: number,
): SpeechCoachV2Exercise[] {
  const phases: SpeechCoachV2Phase[] = [
    "warm_up",
    "repeat_after_amy",
    "guided_practice",
    "interactive_conversation",
    "confidence_challenge",
  ];
  const seen = new Set<string>();
  const out: SpeechCoachV2Exercise[] = [];
  for (const phase of phases) {
    for (const ex of exercisesForPhase(band, phase, sessionSeed)) {
      if (!seen.has(ex.id)) {
        seen.add(ex.id);
        out.push(ex);
      }
    }
  }
  return out;
}
