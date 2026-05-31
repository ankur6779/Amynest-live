import { coachGoalCategoryId } from "@workspace/coach-journey";

export interface CoachQuestionRef {
  id: string;
  prompt: string;
  type: "single" | "multi";
  options: string[];
}

export interface AmyUnderstandingView {
  bullets: string[];
  closingLine: string;
  focusAreas: string[];
}

const AGE_PHRASES: Record<string, string> = {
  "0–2 years": "Your child is under 2 years old",
  "2–4 years": "Your child is in the toddler and preschool years (2–4)",
  "5–7 years": "Your child is about 5–7 years old",
  "8–10 years": "Your child is in the 8–10 year range",
  "10+ years (tween/teen)": "Your child is a tween or teen (10+)",
  "Adult (parent self-care)": "You're focusing on your own wellbeing as a parent",
};

const SEVERITY_PHRASES: Record<string, string> = {
  "Mild – occasional": "This is mild and happens occasionally",
  "Moderate – frequent": "This is moderate and happens fairly often",
  "Severe – daily struggle": "This feels like a daily struggle right now",
};

const FREQUENCY_PHRASES: Record<string, string> = {
  Daily: "This comes up several times a week",
  Weekly: "This comes up from time to time",
  Rare: "This happens once in a while",
};

const OPTION_PHRASES: Record<string, string> = {
  Denied: "saying no often sets things off",
  Hunger: "hunger is a common trigger",
  Tired: "tiredness plays a big role",
  Home: "it mostly happens at home",
  Public: "public situations are especially hard",
  Short: "shorter trips are more manageable",
  Long: "long trips are the hardest",
  Calm: "your child is usually calm during travel",
  Restless: "restlessness is the biggest concern",
  Hitting: "hitting is the main concern",
  Throwing: "throwing things is the main concern",
  Shouting: "shouting is the main concern",
  Ignore: "your child often ignores instructions",
  Argue: "arguments are common",
  Refuse: "refusal is the main pattern",
  Anger: "anger comes up most often",
  Fear: "fear is the dominant emotion",
  Sadness: "sadness is what shows up most",
  Fast: "your child calms down relatively quickly",
  Slow: "it takes a while to calm down",
  "<1h": "screen time is under an hour a day",
  "1-3h": "screen time is around 1–3 hours a day",
  ">3h": "screen time is more than 3 hours a day",
  Yes: "yes",
  No: "not yet",
};

const DEFAULT_FOCUS_AREAS = [
  "Understanding triggers",
  "Building emotional regulation",
  "Reducing conflict",
  "Creating consistency",
  "Strengthening connection",
];

const FOCUS_BY_CATEGORY: Record<string, string[]> = {
  behavior: [
    "Understanding meltdown triggers",
    "Building emotional regulation",
    "Reducing power struggles",
    "Creating calm routines",
    "Strengthening connection",
  ],
  "toddler-behavior": [
    "Understanding toddler triggers",
    "Staying calm in the moment",
    "Reducing tantrum intensity",
    "Building predictable routines",
    "Reconnecting after hard moments",
  ],
  sleep: [
    "Understanding sleep barriers",
    "Building a calming bedtime rhythm",
    "Reducing night-time stress",
    "Creating consistency",
    "Helping your child feel secure",
  ],
  eating: [
    "Understanding mealtime resistance",
    "Reducing food battles",
    "Building positive routines",
    "Supporting independence",
    "Staying calm at the table",
  ],
  "screen-focus": [
    "Understanding screen habits",
    "Setting clearer boundaries",
    "Building off-screen engagement",
    "Reducing daily battles",
    "Creating sustainable limits",
  ],
  "special-situations": [
    "Understanding travel triggers",
    "Building emotional regulation on the go",
    "Reducing conflict in stressful moments",
    "Creating small predictable rituals",
    "Strengthening connection during change",
  ],
  "for-you": [
    "Recognising your stress signals",
    "Recovering after hard moments",
    "Building sustainable self-care",
    "Staying calm under pressure",
    "Protecting your energy",
  ],
};

function naturalizeOption(value: string): string {
  const trimmed = value.trim();
  if (OPTION_PHRASES[trimmed]) return OPTION_PHRASES[trimmed]!;
  if (trimmed.endsWith(")")) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function phraseForAnswer(question: CoachQuestionRef, value: string | string[]): string | null {
  if (question.id === "ageGroup") {
    return AGE_PHRASES[String(value)] ?? `Your child's age range is ${value}`;
  }
  if (question.id === "severity") {
    return SEVERITY_PHRASES[String(value)] ?? null;
  }
  if (question.id === "common_frequency") {
    return FREQUENCY_PHRASES[String(value)] ?? `This happens ${naturalizeOption(String(value))}`;
  }
  if (question.id === "triggers" && Array.isArray(value)) {
    if (value.length === 0) return null;
    const parts = value.map((v) => naturalizeOption(v));
    if (parts.length === 1) return `A main trigger is ${parts[0]}`;
    return `Main triggers include ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  }
  if (question.id === "routine") {
    return `Your current approach: ${naturalizeOption(String(value))}`;
  }
  if (question.id === "goalRefinement") {
    return `What matters most right now: ${naturalizeOption(String(value))}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const parts = value.map((v) => naturalizeOption(v));
    return parts.length === 1
      ? capitalizeFirst(parts[0]!)
      : capitalizeFirst(`${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`);
  }

  const str = String(value);
  const natural = naturalizeOption(str);

  if (question.id === "trigger") return capitalizeFirst(`${natural} is a main trigger`);
  if (question.id === "location") return capitalizeFirst(`${natural}`);
  if (question.id === "distance") {
    return str === "Long"
      ? "Long trips are the hardest"
      : "Shorter trips are more manageable";
  }
  if (question.id === "child_behavior") {
    return str === "Restless"
      ? "Restlessness is the biggest concern"
      : "Your child is usually calm in this situation";
  }
  if (question.id === "behavior") return capitalizeFirst(`${natural} is the behaviour you're seeing most`);
  if (question.id === "target") return capitalizeFirst(`It's mostly directed at ${natural}`);
  if (question.id === "response") return capitalizeFirst(`Your child tends to ${natural}`);
  if (question.id === "emotion_type") return capitalizeFirst(`${natural} comes up most often`);
  if (question.id === "recovery_time") {
    return str === "Slow"
      ? "It takes a while for your child to calm down"
      : "Your child can calm down relatively quickly";
  }
  if (question.id === "situation") return capitalizeFirst(`It shows up most during ${natural}`);
  if (question.id === "reaction") return capitalizeFirst(`The reaction often involves ${natural}`);

  if (/^\d/.test(str) && str.includes("(")) return null;

  return capitalizeFirst(natural);
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function closingForGoal(goalTitle: string, categoryId: string): string {
  if (categoryId === "for-you") {
    return "We'll start with small, practical steps that fit real life — one supportive action at a time.";
  }
  const topic = goalTitle.toLowerCase();
  return `We'll start with small actions that reduce stress and build progress around ${topic}.`;
}

export function buildAmyUnderstandingView(input: {
  goalId: string;
  goalTitle: string;
  questions: CoachQuestionRef[];
  answers: Record<string, string | string[]>;
}): AmyUnderstandingView {
  const bullets: string[] = [];
  const seen = new Set<string>();

  for (const q of input.questions) {
    const raw = input.answers[q.id];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === "string" && raw.length === 0) continue;
    if (Array.isArray(raw) && raw.length === 0) continue;
    const phrase = phraseForAnswer(q, raw);
    if (!phrase || seen.has(phrase)) continue;
    seen.add(phrase);
    bullets.push(phrase);
  }

  if (bullets.length === 0) {
    bullets.push(`You're working on ${input.goalTitle.toLowerCase()}`);
  }

  const categoryId = coachGoalCategoryId(input.goalId);
  const focusAreas = FOCUS_BY_CATEGORY[categoryId] ?? DEFAULT_FOCUS_AREAS;

  return {
    bullets: bullets.slice(0, 6),
    closingLine: closingForGoal(input.goalTitle, categoryId),
    focusAreas,
  };
}
