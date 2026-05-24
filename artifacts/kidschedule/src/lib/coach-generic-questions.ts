/** Category-aware fallback questions when a goal has no topic-specific schema. */

export interface CoachGenericQuestionSet {
  triggers: string[];
  routine: string[];
  goalRefinement: string[];
}

const DEFAULT: CoachGenericQuestionSet = {
  triggers: [
    "Hunger or tiredness",
    "Transitions or changes",
    "Being told 'no'",
    "Boredom",
    "Sibling conflict",
    "School/social stress",
    "Inconsistent rules",
    "Sensory overload",
  ],
  routine: [
    "No clear routine yet",
    "I try but it's inconsistent",
    "Strict rules, lots of pushback",
    "Trying gentle parenting",
    "Just starting to figure it out",
  ],
  goalRefinement: [
    "Reduce frequency",
    "Stay calm myself",
    "Build my child's skills",
    "Long-term healthy pattern",
  ],
};

const BY_CATEGORY: Partial<Record<string, CoachGenericQuestionSet>> = {
  "infant-problems": {
    triggers: [
      "Hunger or feeding",
      "Overtired",
      "Overstimulation",
      "Teething or discomfort",
      "Growth spurts",
      "Routine change",
    ],
    routine: [
      "No fixed routine yet",
      "Trying but inconsistent",
      "Following wake windows",
      "Co-sleeping or contact naps",
      "Still figuring it out",
    ],
    goalRefinement: [
      "More sleep for baby",
      "Less crying / fussiness",
      "Feel confident as a parent",
      "Build a sustainable routine",
    ],
  },
  "toddler-behavior": DEFAULT,
  behavior: DEFAULT,
  "screen-focus": {
    triggers: [
      "Boredom",
      "Habit / autopilot",
      "Peer or sibling influence",
      "Parent uses screens too",
      "Transitions or waiting times",
      "No clear limits set",
    ],
    routine: [
      "No screen rules yet",
      "Limits exist but not enforced",
      "Strict bans with meltdowns",
      "Using timers / earned time",
      "Just starting to set limits",
    ],
    goalRefinement: [
      "Reduce daily screen time",
      "Better focus off-screen",
      "Fewer battles over devices",
      "Long-term healthy digital habits",
    ],
  },
  eating: {
    triggers: [
      "Texture or taste refusal",
      "Snacking instead of meals",
      "Picky eating phases",
      "Power struggles at table",
      "Junk food availability",
      "Rushed or distracted meals",
    ],
    routine: [
      "No meal structure yet",
      "Inconsistent meal times",
      "Short-order cooking",
      "Family meals sometimes",
      "Trying new approach",
    ],
    goalRefinement: [
      "More variety accepted",
      "Calmer mealtimes",
      "Healthier choices",
      "Independent eating skills",
    ],
  },
  sleep: {
    triggers: [
      "Overtiredness",
      "Screen before bed",
      "Inconsistent bedtime",
      "Anxiety or fear",
      "Room environment",
      "Naps affecting night sleep",
    ],
    routine: [
      "No bedtime routine",
      "Routine exists but skipped often",
      "Long wind-down battles",
      "Co-sleeping or lying with child",
      "Building a new routine",
    ],
    goalRefinement: [
      "Faster sleep onset",
      "Fewer night wakings",
      "Consistent schedule",
      "Less bedtime stress for everyone",
    ],
  },
  learning: {
    triggers: [
      "Boredom with work",
      "Task feels too hard",
      "Distractions nearby",
      "Low confidence",
      "Too much pressure",
      "Unclear expectations",
    ],
    routine: [
      "No study routine",
      "Homework only when forced",
      "Short bursts with breaks",
      "Structured daily study time",
      "Just starting to build habits",
    ],
    goalRefinement: [
      "Better concentration",
      "Less homework resistance",
      "More interest in learning",
      "Build lasting study habits",
    ],
  },
  "daily-skills": {
    triggers: [
      "Not ready yet",
      "Fear or anxiety",
      "Accidents or setbacks",
      "Resistance to practice",
      "Inconsistent follow-through",
      "Big life changes",
    ],
    routine: [
      "Haven't started yet",
      "Trying on and off",
      "Rewards or sticker charts",
      "Gentle daily practice",
      "Waiting for readiness signs",
    ],
    goalRefinement: [
      "Build confidence",
      "Fewer accidents / setbacks",
      "Child-led progress",
      "Consistent daily habit",
    ],
  },
  "family-dynamics": {
    triggers: [
      "Attention competition",
      "Sharing toys or space",
      "Jealousy of sibling",
      "Different parenting styles",
      "Major family change",
      "Limited one-on-one time",
    ],
    routine: [
      "No family agreements yet",
      "Rules vary by parent",
      "Trying conflict scripts",
      "Regular family meetings",
      "Still finding what works",
    ],
    goalRefinement: [
      "Less fighting",
      "Fairer attention",
      "Stronger sibling bond",
      "Clearer family rules",
    ],
  },
  "parenting-challenges": {
    triggers: [
      "Grandparent interference",
      "Partner disagreement",
      "Work-life imbalance",
      "Guilt or overwhelm",
      "Conflicting advice",
      "Unclear house rules",
    ],
    routine: [
      "No shared parenting plan",
      "Different rules in different homes",
      "Talking but not aligned",
      "Written family agreements",
      "Working on alignment",
    ],
    goalRefinement: [
      "Aligned with partner",
      "Clear boundaries with others",
      "Less guilt",
      "Consistent rules for kids",
    ],
  },
  "special-situations": {
    triggers: [
      "Fear of the unknown",
      "Disrupted routine",
      "Separation anxiety",
      "Sensory overload",
      "Past bad experience",
      "Sibling dynamics",
    ],
    routine: [
      "No prep plan yet",
      "Talk-through before event",
      "Visual schedule or story",
      "Practice runs",
      "Wing it each time",
    ],
    goalRefinement: [
      "Less anxiety",
      "Smoother transition",
      "Child feels prepared",
      "Recover quickly after",
    ],
  },
  "kids-health-concern": {
    triggers: [
      "Diet or activity level",
      "Sleep quality",
      "Frequent illness",
      "Screen habits",
      "Stress or anxiety",
      "Development worries",
    ],
    routine: [
      "No health habits tracked",
      "Inconsistent healthy habits",
      "Working with pediatrician",
      "Active improvement plan",
      "Just starting changes",
    ],
    goalRefinement: [
      "Healthier habits",
      "Peace of mind",
      "Catch issues early",
      "Sustainable lifestyle change",
    ],
  },
  "for-you": {
    triggers: [
      "Lack of sleep",
      "Work or life stress",
      "Partner conflict",
      "Guilt or self-blame",
      "No support network",
      "Too many demands",
    ],
    routine: [
      "No self-care time",
      "Occasional breaks only",
      "Trying mindfulness",
      "Small daily rituals",
      "Rebuilding after burnout",
    ],
    goalRefinement: [
      "Feel less overwhelmed",
      "Stay calmer with kids",
      "Find daily me-time",
      "Sustainable balance",
    ],
  },
};

export function getGenericQuestionOptions(categoryId: string): CoachGenericQuestionSet {
  return BY_CATEGORY[categoryId] ?? DEFAULT;
}
