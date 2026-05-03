// Age Group Classification for AmyNest
// Used across the app to determine child mode, activities, and routine style

export type AgeGroup =
  | "infant"        // 0–11 months
  | "toddler"       // 12–35 months (1–3 years)
  | "preschool"     // 36–59 months (3–5 years)
  | "early_school"  // 60–119 months (5–10 years)
  | "pre_teen";     // 120–179 months (10–15 years)

export type AgeGroupInfo = {
  group: AgeGroup;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
  routineMode: "infant_guidance" | "light_routine" | "full_routine";
};

export function getTotalMonths(years: number, months: number): number {
  return (years * 12) + months;
}

export function getAgeGroup(years: number, ageMonths = 0): AgeGroup {
  const total = getTotalMonths(years, ageMonths);
  if (total < 12) return "infant";
  if (total < 36) return "toddler";
  if (total < 60) return "preschool";
  if (total < 120) return "early_school";
  return "pre_teen";
}

export function getAgeGroupInfo(group: AgeGroup): AgeGroupInfo {
  const map: Record<AgeGroup, AgeGroupInfo> = {
    infant: {
      group: "infant",
      label: "Infant",
      emoji: "👶",
      color: "text-foreground",
      bgColor: "bg-muted border-border",
      description: "0–12 months · Guidance & care mode",
      routineMode: "infant_guidance",
    },
    toddler: {
      group: "toddler",
      label: "Toddler",
      emoji: "🍼",
      color: "text-foreground",
      bgColor: "bg-muted border-border",
      description: "1–3 years · Play & explore",
      routineMode: "light_routine",
    },
    preschool: {
      group: "preschool",
      label: "Preschool",
      emoji: "🎨",
      color: "text-foreground",
      bgColor: "bg-muted border-border",
      description: "3–5 years · Creative & play learning",
      routineMode: "light_routine",
    },
    early_school: {
      group: "early_school",
      label: "School Age",
      emoji: "📚",
      color: "text-foreground",
      bgColor: "bg-muted border-border",
      description: "5–10 years · Study & structured play",
      routineMode: "full_routine",
    },
    pre_teen: {
      group: "pre_teen",
      label: "Pre-Teen",
      emoji: "🎯",
      color: "text-foreground",
      bgColor: "bg-muted border-border",
      description: "10–15 years · Focus & independence",
      routineMode: "full_routine",
    },
  };
  return map[group];
}

export function formatAge(years: number, months = 0): string {
  if (years === 0 && months === 0) return "Newborn";
  if (years === 0) return `${months} month${months > 1 ? "s" : ""}`;
  if (months === 0) return `${years} year${years > 1 ? "s" : ""}`;
  return `${years}y ${months}m`;
}

// Skill focus suggestions by age group
export const SKILL_FOCUS_BY_GROUP: Record<AgeGroup, { skill: string; activity: string; emoji: string }[]> = {
  infant: [
    { skill: "Sensory Development", activity: "Show colorful objects, play gentle music, skin-to-skin contact", emoji: "🌈" },
    { skill: "Motor Skills", activity: "Tummy time (10–15 min), grasp exercises with soft toys", emoji: "🤲" },
    { skill: "Language Foundation", activity: "Talk to your baby constantly, name everything you see", emoji: "👄" },
    { skill: "Bonding", activity: "Eye contact, gentle massage, respond to every coo", emoji: "❤️" },
  ],
  toddler: [
    { skill: "Communication", activity: "Name games, simple songs, picture books with words", emoji: "💬" },
    { skill: "Color & Shape", activity: "Sort colored blocks, identify shapes, color matching games", emoji: "🎨" },
    { skill: "Independence", activity: "Let them choose their clothes, pour own water, self-feed", emoji: "🌟" },
    { skill: "Creativity", activity: "Finger painting, play-doh, building blocks, free drawing", emoji: "✨" },
  ],
  preschool: [
    { skill: "Imagination", activity: "Pretend play, role-play, story making with toys", emoji: "🌈" },
    { skill: "Numbers & Letters", activity: "Count everyday objects, trace letters in sand or paper", emoji: "🔢" },
    { skill: "Social Skills", activity: "Playdate, sharing exercises, group games", emoji: "🤝" },
    { skill: "Fine Motor", activity: "Cutting with scissors, threading beads, puzzles", emoji: "✂️" },
  ],
  early_school: [
    { skill: "Discipline", activity: "30-minute focused study block with a timer, no distractions", emoji: "📖" },
    { skill: "Sports", activity: "Daily 30 min outdoor sport (cricket, football, cycling)", emoji: "⚽" },
    { skill: "Critical Thinking", activity: "Solve a puzzle, play chess, logical brain games", emoji: "🧩" },
    { skill: "Creativity", activity: "Draw, paint, write a short story or poem", emoji: "🎨" },
  ],
  pre_teen: [
    { skill: "Focus & Discipline", activity: "Pomodoro study (25 min focus + 5 min break), no phone", emoji: "🎯" },
    { skill: "Leadership", activity: "Assign them a small responsibility — organize, plan, lead", emoji: "👑" },
    { skill: "Emotional Intelligence", activity: "5-min journal: 3 good things today + 1 challenge", emoji: "📔" },
    { skill: "Physical Fitness", activity: "20-min workout, yoga, or sport they enjoy", emoji: "💪" },
  ],
};

// Moral stories by age group
export const STORIES_BY_GROUP: Record<AgeGroup, { title: string; story: string; moral: string; emoji: string }[]> = {
  infant: [
    {
      title: "The Gentle Sun",
      story: "Every morning, the sun rises with love to warm the earth. It doesn't shout — it just shines.",
      moral: "Love is shown through gentle presence.",
      emoji: "☀️",
    },
  ],
  toddler: [
    {
      title: "The Little Seed",
      story: "A tiny seed was buried in the ground. It was dark and lonely. But the seed was patient. Every day it drank a little water and felt a little sunlight. One day it pushed through the soil and became a beautiful flower.",
      moral: "Patience and effort lead to beautiful growth.",
      emoji: "🌱",
    },
    {
      title: "The Sharing Elephant",
      story: "Ellie the elephant had a big bag of peanuts. Her friends were hungry. She shared every last peanut and felt so happy inside — happier than when she had them all to herself!",
      moral: "Sharing brings more happiness than keeping.",
      emoji: "🐘",
    },
  ],
  preschool: [
    {
      title: "The Honest Boy",
      story: "Arjun broke a pot while playing. He was scared. But he told his mother the truth. She hugged him and said 'Thank you for being honest.' Arjun felt lighter than ever.",
      moral: "Honesty always feels better than hiding the truth.",
      emoji: "💎",
    },
    {
      title: "The Helpful Rabbit",
      story: "A rabbit found a turtle stuck under a log. The rabbit was small, but asked his friends for help. Together they moved the log. The turtle cried tears of joy.",
      moral: "Asking for help and helping others is strength.",
      emoji: "🐰",
    },
  ],
  early_school: [
    {
      title: "The Hardworking Ant",
      story: "While the grasshopper played all summer, the ant worked hard storing food. When winter came, the ant had plenty and the grasshopper had nothing. The ant shared some food but said, 'Next season, prepare early.'",
      moral: "Hard work today secures your tomorrow.",
      emoji: "🐜",
    },
    {
      title: "The Boy Who Cried Wolf",
      story: "A shepherd boy lied twice about a wolf to get attention. When a real wolf came, no one believed him. He learned his lesson the hard way.",
      moral: "Always tell the truth — once trust is broken, it's hard to rebuild.",
      emoji: "🐺",
    },
  ],
  pre_teen: [
    {
      title: "The Two Stones",
      story: "A teacher showed two stones: one rough, one smooth. 'The rough stone was untouched,' she said. 'The smooth one was polished by challenges. Every difficulty you face polishes you.' The student understood — struggle is the maker of character.",
      moral: "Challenges don't break you — they shape you.",
      emoji: "💎",
    },
    {
      title: "The Empty Jar",
      story: "A professor filled a jar with rocks, then pebbles, then sand. 'Is it full?' he asked. Yes. Then he poured in coffee. The lesson: always make room for what truly matters — family, health, values. The rest is just sand.",
      moral: "Prioritize what truly matters in life.",
      emoji: "🏺",
    },
  ],
};

// Parent tasks by age group
export const PARENT_TASKS_BY_GROUP: Record<AgeGroup, { task: string; time: string; emoji: string }[]> = {
  infant: [
    { task: "Hold your baby for 15 minutes of skin-to-skin time", time: "15 min", emoji: "🤱" },
    { task: "Talk, sing, or narrate your day out loud to your baby", time: "Throughout day", emoji: "🗣️" },
    { task: "Do tummy time exercise with your baby", time: "10 min", emoji: "🏋️" },
    { task: "Check baby's vaccination schedule and upcoming due dates", time: "5 min", emoji: "💉" },
  ],
  toddler: [
    { task: "Read one picture book together before bedtime", time: "15 min", emoji: "📖" },
    { task: "Play a color-sorting or shape-matching game together", time: "20 min", emoji: "🎨" },
    { task: "Sing the alphabet song or count 1–10 together", time: "5 min", emoji: "🎵" },
    { task: "Let your toddler help with one simple task (stacking, sorting)", time: "10 min", emoji: "🌟" },
  ],
  preschool: [
    { task: "Do an art project together (drawing, painting, craft)", time: "30 min", emoji: "🎨" },
    { task: "Tell a story and let them finish it — encourage imagination", time: "15 min", emoji: "📚" },
    { task: "Play pretend together — tea party, kitchen, superhero", time: "20 min", emoji: "🎭" },
    { task: "Praise 3 specific good things they did today", time: "5 min", emoji: "⭐" },
  ],
  early_school: [
    { task: "Spend 15 minutes talking about their school day — really listen", time: "15 min", emoji: "💬" },
    { task: "Do an outdoor activity together (walk, cycle, play catch)", time: "30 min", emoji: "🌳" },
    { task: "Help with homework — guide, don't do it for them", time: "20 min", emoji: "📝" },
    { task: "Share a meal together with no screens — just conversation", time: "30 min", emoji: "🍽️" },
  ],
  pre_teen: [
    { task: "Have a 10-minute open conversation — no judgment zone", time: "10 min", emoji: "💬" },
    { task: "Watch something they like — show genuine interest", time: "30 min", emoji: "📺" },
    { task: "Give them one meaningful responsibility today", time: "Ongoing", emoji: "🌟" },
    { task: "Ask about their dreams and goals — write them down together", time: "15 min", emoji: "🎯" },
  ],
};
