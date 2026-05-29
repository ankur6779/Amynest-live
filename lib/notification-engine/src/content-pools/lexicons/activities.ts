export interface ActivitySeed {
  slug: string;
  topic: string;
  theme: string;
  templates: string[];
  ageGroups: Array<"toddler" | "preschool" | "child" | "tween">;
  weekendOnly?: boolean;
  weekdayOnly?: boolean;
}

export const ACTIVITY_SEEDS: ActivitySeed[] = [
  { slug: "colour_sort", topic: "sorting", theme: "sensory_math", ageGroups: ["toddler", "preschool"], templates: ["Try colour sorting with household objects — {name} will love it 🎨"] },
  { slug: "tower_stack", topic: "motor", theme: "building", ageGroups: ["toddler"], templates: ["Stack and knock towers — {name} learns cause-and-effect 🏗️"] },
  { slug: "alphabet_sing", topic: "literacy", theme: "songs", ageGroups: ["toddler", "preschool"], templates: ["Sing the alphabet slowly with {name} — three rounds beat flashcards."] },
  { slug: "count_steps", topic: "math", theme: "movement", ageGroups: ["preschool"], templates: ["Count steps room to room with {name} — movement + numbers 🔢"], weekdayOnly: true },
  { slug: "rice_tracing", topic: "literacy", theme: "sensory", ageGroups: ["preschool"], templates: ["Trace letters in a rice tray with {name} ✏️"] },
  { slug: "toy_sort", topic: "sorting", theme: "categories", ageGroups: ["preschool"], templates: ["Ask {name} to sort toys by colour or size — math brain activated!"] },
  { slug: "math_race", topic: "math", theme: "games", ageGroups: ["child"], templates: ["Five-minute math challenge with {name} — who solves it first? 🧮"], weekdayOnly: true },
  { slug: "read_summarize", topic: "literacy", theme: "comprehension", ageGroups: ["child"], templates: ["Read one paragraph with {name} and ask them to summarise 📖"] },
  { slug: "twenty_questions", topic: "logic", theme: "games", ageGroups: ["child", "tween"], templates: ["Play 20 Questions with {name} — great for critical thinking 🤔"] },
  { slug: "teach_back", topic: "learning", theme: "metacognition", ageGroups: ["tween"], templates: ["Ask {name} to explain a school topic to you — teaching is learning 🎓"] },
  { slug: "journal_three", topic: "reflection", theme: "writing", ageGroups: ["tween"], templates: ["Ten-minute journal: {name} writes 3 things they want to learn this week ✍️"] },
  { slug: "doc_clip", topic: "curiosity", theme: "media", ageGroups: ["tween", "child"], templates: ["Watch a 5-minute documentary clip with {name} and discuss 🌍"] },
  { slug: "nature_walk", topic: "outdoor", theme: "nature", ageGroups: ["toddler", "preschool"], templates: ["Outdoor explore: let {name} collect leaves or stones for 15 minutes 🌿"], weekendOnly: true },
  { slug: "water_play", topic: "sensory", theme: "water", ageGroups: ["toddler"], templates: ["Water play in a bowl — {name} learns pour and scoop 💧"], weekendOnly: true },
  { slug: "family_art", topic: "creativity", theme: "art", ageGroups: ["preschool"], templates: ["Family art: {name} draws, you guess — creativity boost 🎨"], weekendOnly: true },
  { slug: "bake_simple", topic: "cooking", theme: "kitchen", ageGroups: ["preschool", "child"], templates: ["Bake something simple with {name} — math, science, joy 🍪"], weekendOnly: true },
  { slug: "volcano", topic: "science", theme: "experiments", ageGroups: ["child"], templates: ["Weekend science: baking soda + vinegar with {name} 🧪"], weekendOnly: true },
  { slug: "board_game", topic: "strategy", theme: "games", ageGroups: ["child", "tween"], templates: ["Board game morning with {name} — strategy and bonds 🎲"], weekendOnly: true },
  { slug: "bike_walk", topic: "outdoor", theme: "movement", ageGroups: ["tween", "child"], templates: ["Family walk or bike ride — screen-free bonding 🚴"], weekendOnly: true },
  { slug: "cook_recipe", topic: "cooking", theme: "kitchen", ageGroups: ["tween"], templates: ["Cook a new recipe with {name} — life skill + quality time"] },
];

export const ACTIVITY_MODIFIER_PREFIXES = [
  "",
  "Quick win: ",
  "Five-minute idea: ",
  "Try this today — ",
  "Low-prep activity: ",
  "After-school idea: ",
  "Morning spark: ",
  "Rainy-day option: ",
  "Energy burner: ",
  "Calm-down activity: ",
];

export const EXTRA_ACTIVITY_VERBS = [
  "pattern blocks with {name}",
  "a scavenger hunt indoors with {name}",
  "shadow puppets with {name}",
  "a gratitude jar craft with {name}",
  "origami frogs with {name}",
  "a marble run with {name}",
  "story dice with {name}",
  "a nature journal page with {name}",
  "finger painting with {name}",
  "a puzzle race with {name}",
  "charades with {name}",
  "a building challenge with {name}",
  "map drawing with {name}",
  "a music freeze dance with {name}",
  "coin counting with {name}",
  "a letter hunt around the house with {name}",
  "shape tracing with {name}",
  "a kindness challenge with {name}",
  "breathing buddies with {name}",
  "a LEGO challenge card with {name}",
];

export const STORY_PROMPTS: Array<{ slug: string; topic: string; theme: string; template: string; ageGroups: ActivitySeed["ageGroups"] }> = [
  { slug: "picture_book", topic: "bedtime_reading", theme: "wind_down", template: "Picture book time for {name} 📖 — five minutes of calm before bed.", ageGroups: ["toddler", "preschool"] },
  { slug: "pick_together", topic: "bedtime_reading", theme: "choice", template: "Let {name} pick tonight's story — ownership makes bedtime smoother ✨", ageGroups: ["preschool", "child"] },
  { slug: "chapter_snippet", topic: "bedtime_reading", theme: "chapter", template: "Read one chapter with {name} tonight — consistency beats length 🌙", ageGroups: ["child", "tween"] },
  { slug: "tell_story", topic: "oral_story", theme: "imagination", template: "Tell {name} a made-up story starring their favourite toy — they'll ask for more.", ageGroups: ["toddler", "preschool"] },
  { slug: "audio_story", topic: "audio", theme: "wind_down", template: "Try a short audio story with {name} if you're tired — still counts as story time.", ageGroups: ["preschool", "child"] },
  { slug: "library_visit", topic: "library", theme: "outings", template: "Weekend plan: let {name} choose one book from the shelf — fresh stories reset habits.", ageGroups: ["child", "tween"], },
];

export const STORY_THEMES = [
  "animals", "friendship", "courage", "kindness", "space", "nature", "family", "adventure", "magic", "sports",
];

export const STORY_THEME_TEMPLATES = [
  "Tonight's story theme for {name}: {theme} — pick a book that matches.",
  "Ask {name} for a {theme} story before bed — they'll love choosing.",
  "Rotate genres: try a {theme} tale with {name} tonight 📚",
];

export const MOTIVATION_SEEDS: Array<{ topic: string; theme: string; template: string }> = [
  { topic: "encouragement", theme: "parent_praise", template: "You're doing an amazing job — {name} is lucky to have you 💜" },
  { topic: "consistency", theme: "habits", template: "Small consistent actions make the biggest difference for {name}." },
  { topic: "future", theme: "long_term", template: "Every routine you build now shapes {name}'s future habits." },
  { topic: "progress", theme: "growth", template: "Keep going — parenting gets easier with every step forward 🌟" },
  { topic: "presence", theme: "mindfulness", template: "Ten fully present minutes with {name} today beat an hour of distracted time." },
  { topic: "rest", theme: "self_care", template: "Rested parents parent better — one small break for you helps {name} too." },
  { topic: "patience", theme: "self_compassion", template: "Hard day? {name} still feels safest with you — that's what matters." },
  { topic: "celebration", theme: "wins", template: "Name one thing that went well with {name} today — even if it was tiny." },
  { topic: "team", theme: "partnership", template: "Tag-team with your partner on one {name} task tonight — teamwork counts." },
  { topic: "curiosity", theme: "wonder", template: "Ask {name} one silly question at dinner — laughter resets the mood." },
];

export const MOTIVATION_OPENERS = [
  "You've got this 💪",
  "Parent win incoming ✨",
  "Gentle reminder 💜",
  "Today's encouragement 🌟",
  "You're not alone 🤝",
  "Small step, big impact 🌱",
];
