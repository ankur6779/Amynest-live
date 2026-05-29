export interface ParentingTipSeed {
  topic: string;
  theme: string;
  templates: string[];
  ageGroups: Array<"toddler" | "preschool" | "child" | "tween">;
}

const T = (topic: string, theme: string, ageGroups: ParentingTipSeed["ageGroups"], templates: string[]): ParentingTipSeed => ({
  topic,
  theme,
  ageGroups,
  templates,
});

export const PARENTING_TIP_SEEDS: ParentingTipSeed[] = [
  T("autonomy", "choices", ["toddler", "preschool"], [
    "Let {name} choose between two outfits today — tiny choices build confidence.",
    "Offer {name} a pick: red cup or blue cup. Autonomy reduces power struggles.",
  ]),
  T("language", "vocabulary", ["toddler"], [
    "Narrate what you do aloud — {name}'s vocabulary grows through listening.",
    "Name emotions for {name}: 'You look frustrated' — it teaches feeling words.",
  ]),
  T("play", "unstructured", ["toddler", "preschool"], [
    "Ten minutes of unstructured play beats a structured lesson for {name} right now.",
    "Follow {name}'s lead in play for 5 minutes — connection before correction.",
  ]),
  T("calm", "co_regulation", ["toddler", "preschool"], [
    "When {name} is upset, crouch to eye level before speaking.",
    "Slow your voice when {name} escalates — your calm is their anchor.",
  ]),
  T("feelings", "emotional_awareness", ["preschool", "child"], [
    "Ask {name}: 'What made you happy today?' — it builds emotional awareness.",
    "Validate before fixing: 'That sounds hard' works wonders with {name}.",
  ]),
  T("chores", "contribution", ["preschool", "child"], [
    "Give {name} one tiny chore — contribution builds self-worth.",
    "Let {name} wipe the table after meals — belonging through helping.",
  ]),
  T("praise", "growth_mindset", ["preschool", "child", "tween"], [
    "Praise {name}'s effort, not the result: 'You tried so hard!'",
    "Notice one specific thing {name} did well today — be precise, not generic.",
  ]),
  T("reading", "literacy", ["preschool", "child"], [
    "Fifteen minutes of reading with {name} daily compounds into big literacy gains.",
    "Let {name} pick tonight's book — ownership boosts engagement.",
  ]),
  T("responsibility", "accountability", ["child", "tween"], [
    "Give {name} a weekly responsibility — it builds accountability.",
    "One area of life {name} manages fully this month — pick it together.",
  ]),
  T("questions", "curiosity", ["child", "tween"], [
    "Ask {name} open-ended questions — they learn more by explaining than listening.",
    "Replace 'Did you have fun?' with 'What was the hardest part today?' for {name}.",
  ]),
  T("wins", "positivity", ["child", "tween"], [
    "Celebrate one small win with {name} today — it rewires the brain for positivity.",
    "End the day naming one thing {name} did that made you proud.",
  ]),
  T("family_dinner", "connection", ["child", "tween"], [
    "Family dinners 3× a week correlate with better grades and mood for kids like {name}.",
    "No phones at dinner — {name} notices when you're fully present.",
  ]),
  T("boundaries", "respect", ["tween"], [
    "Let {name} disagree respectfully — it's healthy boundary-testing.",
    "Say 'I hear you' before setting a limit with {name} — connection first.",
  ]),
  T("friends", "social", ["tween"], [
    "Ask about {name}'s friends by name — it shows you're in their world.",
    "When {name} talks about peers, listen more than you advise.",
  ]),
  T("screens", "balance", ["tween", "child"], [
    "Co-watch something {name} loves this weekend — shared screens build trust.",
    "Agree on one screen-free hour with {name} — negotiate, don't dictate.",
  ]),
  T("sleep", "rest", ["toddler", "preschool", "child"], [
    "Consistent bedtime cues help {name}'s body clock — same order every night.",
    "Dim lights 30 minutes before bed — {name}'s melatonin needs the signal.",
  ]),
  T("transitions", "routines", ["toddler", "preschool"], [
    "Warn {name} before transitions: 'Two more minutes, then bath.'",
    "A visual timer helps {name} handle leaving fun activities.",
  ]),
  T("patience", "self_regulation", ["preschool", "child"], [
    "Model taking a breath before responding to {name} — kids copy what they see.",
    "When you lose patience with {name}, repair quickly: 'I'm sorry I raised my voice.'",
  ]),
  T("independence", "life_skills", ["child", "tween"], [
    "Let {name} pack one part of their school bag — competence grows in small steps.",
    "Teach {name} one new self-care step this month — zipper, tie, or snack prep.",
  ]),
  T("kindness", "empathy", ["preschool", "child"], [
    "Point out when {name} is kind to others — name the behaviour you want repeated.",
    "Ask {name} how a story character might feel — empathy is a teachable skill.",
  ]),
];

/** Expand seeds with age-specific variants to reach 300+ items. */
export function expandParentingTips(): Array<{
  recommendationKey: string;
  topicKey: string;
  theme: string;
  body: string;
  ageGroups: ParentingTipSeed["ageGroups"];
}> {
  const out: Array<{
    recommendationKey: string;
    topicKey: string;
    theme: string;
    body: string;
    ageGroups: ParentingTipSeed["ageGroups"];
  }> = [];
  let idx = 0;
  const suffixes = [
    "",
    " Small steps count.",
    " Try it once this week.",
    " Even five minutes helps.",
    " Consistency beats perfection.",
  ];
  for (const seed of PARENTING_TIP_SEEDS) {
    for (const template of seed.templates) {
      for (const suffix of suffixes) {
        out.push({
          recommendationKey: `parenting_${seed.topic}_${idx++}`,
          topicKey: seed.topic,
          theme: seed.theme,
          body: template + suffix,
          ageGroups: seed.ageGroups,
        });
      }
    }
    for (const ag of seed.ageGroups) {
      for (const template of seed.templates) {
        for (const suffix of suffixes.slice(0, 3)) {
          out.push({
            recommendationKey: `parenting_${seed.topic}_${ag}_${idx++}`,
            topicKey: seed.topic,
            theme: seed.theme,
            body: templateForAge(template, ag) + suffix,
            ageGroups: [ag],
          });
        }
      }
    }
  }
  return out;
}

function templateForAge(template: string, ag: string): string {
  const prefixes: Record<string, string> = {
    toddler: "At this age, ",
    preschool: "For preschoolers, ",
    child: "School-age tip: ",
    tween: "Tween moment: ",
  };
  return (prefixes[ag] ?? "") + template;
}
