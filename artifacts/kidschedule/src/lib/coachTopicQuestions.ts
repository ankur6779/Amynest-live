import rawData from "./coachTopicQuestions.json";

export type AdaptedQuestionType = "single" | "multi";

export interface AdaptedQuestion {
  id: string;
  prompt: string;
  type: AdaptedQuestionType;
  options: string[];
}

interface RawQuestion {
  id: string;
  type: "select" | "multi" | "slider" | "boolean" | "time" | "text" | "number";
  options?: string[];
  range?: [number, number];
}

interface RawData {
  meta: { version: string; totalTopics: number };
  common: RawQuestion[];
  topics: Record<string, RawQuestion[]>;
}

const data = rawData as RawData;

const TOPIC_TO_GOAL: Record<string, string> = {
  tantrums: "manage-tantrums",
  aggression: "handle-aggression",
  defiance: "reduce-defiance",
  emotional_regulation: "emotional-regulation",
  separation_anxiety: "separation-anxiety",
  screen_balance: "balance-screen-time",
  mobile_addiction: "reduce-mobile-addiction",
  focus_span: "improve-focus-span",
  youtube_overuse: "reduce-shorts-overuse",
  instant_gratification: "reduce-instant-gratification",
  independent_eating: "encourage-independent-eating",
  fussy_eating: "navigate-fussy-eating",
  junk_food: "stop-junk-food-craving",
  meal_behavior: "improve-mealtime-behavior",
  sleep_pattern: "improve-sleep-patterns",
  bedtime_resistance: "fix-bedtime-resistance",
  night_waking: "stop-night-waking",
  late_sleeping: "reduce-late-sleeping",
  concentration: "boost-concentration",
  study_discipline: "build-study-discipline",
  learning_interest: "increase-learning-interest",
  homework_resistance: "reduce-homework-resistance",
  growth_mindset: "develop-growth-mindset",
  grandparent_interference: "manage-grandparents-interference",
  parent_alignment: "align-parenting-between-parents",
  working_parent_guilt: "handle-working-parent-guilt",
  family_rules: "set-consistent-family-rules",
  toddler_tantrums: "toddler-tantrums",
  biting_hitting: "hitting-biting",
  no_phase: "no-phase",
  public_meltdown: "public-meltdowns",
  whining: "whining-and-clinginess",
  potty_training: "potty-training-readiness",
  self_dressing: "self-dressing",
  sibling_rivalry: "sibling-rivalry",
  sharing: "sharing-turn-taking",
  new_baby_adjustment: "new-baby-adjustment",
  travel: "travel-with-kids",
  doctor_visit: "hospital-doctor-visit",
  daycare_transition: "daycare-school-transition",
  moving_home: "moving-houses",
  child_obesity: "child-obesity-management",
  immunity: "boost-immunity",
  dental: "dental-health",
  burnout: "parent-burnout",
  parent_sleep: "improve-own-sleep",
  overwhelm: "manage-overwhelm",
};

const GOAL_TO_TOPIC: Record<string, string> = Object.fromEntries(
  Object.entries(TOPIC_TO_GOAL).map(([topic, goal]) => [goal, topic]),
);

function humanizeId(id: string): string {
  const cleaned = id.replace(/_/g, " ").replace(/\b(\w)/g, (_, c: string) => c.toUpperCase());
  return cleaned;
}

const PROMPT_OVERRIDES: Record<string, string> = {
  trigger: "Main trigger kya hota hai?",
  location: "Yeh kahaan hota hai?",
  behavior: "Konsa behavior most common hai?",
  target: "Kis pe nikalta hai?",
  response: "Bachcha kaise react karta hai?",
  instruction_type: "Kis tarah ke instructions me?",
  emotion_type: "Konsi emotion sabse zyada aati hai?",
  recovery_time: "Calm hone me kitna time?",
  situation: "Kis situation me hota hai?",
  reaction: "Reaction kaisa hota hai?",
  daily_usage: "Daily screen time kitna?",
  device: "Konsa device sabse zyada?",
  usage_time: "Kab use karta hai?",
  withdrawal: "Phone hatane par reaction?",
  duration: "Kitni der chalta hai?",
  distractions: "Kya distract karta hai? (multi)",
  content_type: "Kya dekhta hai?",
  control: "Parental control hai?",
  delay_tolerance: "Wait kar pata hai?",
  dependency: "Kitna dependent hai?",
  motor_skill: "Hath/spoon ka use kaisa?",
  food_refusal: "Konsi cheez refuse karta hai? (multi)",
  meal_time: "Ek meal me kitna time?",
  frequency_junk: "Junk food kitni baar?",
  craving_trigger: "Craving ka main reason?",
  family_meal: "Family ke saath khata hai?",
  bedtime: "Sleep time kya hai?",
  wake_time: "Wake-up time kya hai?",
  delay_reason: "Bedtime delay ka reason?",
  routine_exist: "Bedtime routine fixed hai?",
  cause: "Main cause kya hai?",
  sleep_time: "Aksar kab sota hai?",
  screen_before_sleep: "Sleep se pehle screen?",
  focus_duration: "Focus span normally?",
  task_type: "Kis task me focus kam hota?",
  routine: "Study routine fixed hai?",
  motivation: "Motivation level kaisa?",
  interest_level: "Learning me interest (1=Low, 5=High)?",
  preferred_subject: "Pasandida subject?",
  reason: "Main reason kya?",
  parent_help: "Aap help karte ho?",
  failure_response: "Fail hone par reaction?",
  confidence: "Confidence level (1=Low, 5=High)?",
  nap_count: "Din me kitne naps?",
  feeding_type: "Feeding type?",
  conflict_type: "Conflict kis baat pe?",
  frequency: "Yeh kitni baar hota hai?",
  disagreement_area: "Disagreement kis baat pe?",
  communication: "Communication kaisa?",
  time_with_child: "Bachche ke saath time?",
  guilt_level: "Guilt level (1=Low, 5=High)?",
  rules_defined: "Family rules clear hain?",
  consistency: "Rules me consistency?",
  intensity: "Intensity (1=Low, 5=High)?",
  frequency_no: "'No' kab bolta hai?",
  context: "Kis context me?",
  readiness: "Potty training readiness?",
  accidents: "Accidents kitne?",
  skill_level: "Self-dressing skill?",
  interest: "Interest hai is me?",
  conflict_frequency: "Conflict kitni baar?",
  sharing_level: "Sharing kar pata hai?",
  conflict: "Conflict hota hai?",
  attention_shift: "Aapka attention kis pe?",
  distance: "Travel distance?",
  child_behavior: "Travel ke time behavior?",
  fear_level: "Fear level (1=Low, 5=High)?",
  previous_experience: "Pichhla experience kaisa?",
  adjustment: "Adjustment kaisa hua?",
  crying: "Rota hai daycare jaate?",
  stress_level: "Stress level (1=Low, 5=High)?",
  support: "Support system?",
  activity_level: "Physical activity?",
  diet_quality: "Diet quality?",
  illness_frequency: "Beemar kitni baar?",
  nutrition: "Nutrition kaisi?",
  brushing: "Brushing kitni baar?",
  sugar_intake: "Sugar intake?",
  energy_level: "Energy level (1=Low, 5=High)?",
  sleep_hours: "Aap kitne ghante sote ho?",
  interruptions: "Sleep interruptions?",
  task_load: "Task load kitna?",
  common_frequency: "Yeh kitni baar hota hai?",
};

function sliderOptions(range: [number, number]): string[] {
  const [min, max] = range;
  const out: string[] = [];
  for (let i = min; i <= max; i++) {
    if (i === min) out.push(`${i} (Low)`);
    else if (i === max) out.push(`${i} (High)`);
    else out.push(String(i));
  }
  return out;
}

const TIME_BUCKETS = [
  "Before 8 PM",
  "8–9 PM",
  "9–10 PM",
  "10–11 PM",
  "After 11 PM",
];

function adaptQuestion(raw: RawQuestion, idPrefix = ""): AdaptedQuestion | null {
  const id = idPrefix + raw.id;
  const prompt = PROMPT_OVERRIDES[id] ?? PROMPT_OVERRIDES[raw.id] ?? `${humanizeId(raw.id)}?`;

  if (raw.type === "select") {
    if (!raw.options || raw.options.length === 0) return null;
    return { id, prompt, type: "single", options: raw.options };
  }
  if (raw.type === "multi") {
    if (!raw.options || raw.options.length === 0) return null;
    return { id, prompt, type: "multi", options: raw.options };
  }
  if (raw.type === "boolean") {
    return { id, prompt, type: "single", options: ["Yes", "No"] };
  }
  if (raw.type === "slider") {
    const range = raw.range ?? [1, 5];
    return { id, prompt, type: "single", options: sliderOptions(range) };
  }
  if (raw.type === "time") {
    return { id, prompt, type: "single", options: TIME_BUCKETS };
  }
  // Skip text and number — no UI support and child_age is already covered by ageGroup.
  return null;
}

/**
 * Returns topic-specific questions for a given app goal id, or null if the
 * topic is not mapped (caller should fall back to the generic question set).
 *
 * The returned list does NOT include ageGroup / severity — those remain the
 * generic upstream questions in ai-coach.tsx. We only inject the JSON's
 * `frequency` from `common` and the topic's own questions.
 */
export function getTopicQuestions(goalId: string): AdaptedQuestion[] | null {
  const topicKey = GOAL_TO_TOPIC[goalId];
  if (!topicKey) return null;
  const raws = data.topics[topicKey];
  if (!raws || raws.length === 0) return null;

  const out: AdaptedQuestion[] = [];

  // Add the common `frequency` question (skip child_age and severity — already
  // covered by the existing ageGroup and severity questions).
  for (const c of data.common) {
    if (c.id === "child_age" || c.id === "severity") continue;
    const adapted = adaptQuestion(c, "common_");
    if (adapted) out.push(adapted);
  }

  // Add topic-specific questions.
  for (const q of raws) {
    const adapted = adaptQuestion(q);
    if (adapted) out.push(adapted);
  }

  return out;
}

export function hasTopicQuestions(goalId: string): boolean {
  return GOAL_TO_TOPIC[goalId] !== undefined && (data.topics[GOAL_TO_TOPIC[goalId]!]?.length ?? 0) > 0;
}
