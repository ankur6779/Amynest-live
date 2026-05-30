/**
 * Curated + generated word banks for manifest build.
 * Each bucket targets 200+ entries after build.
 */
import type { SpellingAgeGroup, SpellingDifficulty } from "../types.js";

type SeedBank = Record<SpellingAgeGroup, Record<SpellingDifficulty, string[]>>;

const CVC_ONSETS = ["b", "c", "d", "f", "g", "h", "j", "l", "m", "n", "p", "r", "s", "t", "w"];
const CVC_VOWELS = ["a", "e", "i", "o", "u"];
const CVC_CODAS = ["b", "d", "g", "m", "n", "p", "s", "t", "x", "ck"];

function generateCvc(limit: number): string[] {
  const out: string[] = [];
  for (const o of CVC_ONSETS) {
    for (const v of CVC_VOWELS) {
      for (const c of CVC_CODAS) {
        const w = o + v + c;
        if (w.length >= 3 && w.length <= 4) out.push(w);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

const AGE_2_4_EASY = [
  "cat", "dog", "sun", "hat", "bat", "pig", "cup", "bus", "bed", "pen", "mug", "jam", "fan", "box", "toy",
  "run", "fun", "hen", "ten", "net", "pet", "wet", "red", "leg", "bag", "tag", "rag", "wag", "fig", "dig",
  "big", "wig", "log", "fog", "hog", "jog", "bug", "hug", "mug", "rug", "tug", "gum", "hum", "bum", "rum",
  "cab", "lab", "tab", "jab", "dab", "nab", "gap", "lap", "map", "nap", "rap", "sap", "tap", "zap", "cap",
  "bad", "dad", "had", "lad", "mad", "pad", "sad", "fad", "cad", "jot", "lot", "not", "pot", "rot", "tot",
  "hot", "cot", "dot", "got", "cot", "bit", "fit", "hit", "kit", "lit", "pit", "sit", "wit", "zit", "cut",
  "but", "nut", "rut", "hut", "gut", "put", "cub", "hub", "rub", "sub", "tub", "pub", "nub", "bib", "rib",
  "fib", "nib", "jib", "mob", "sob", "job", "lob", "rob", "cob", "pod", "cod", "nod", "rod", "sod", "tod",
  "god", "mod", "bod", "wad", "rad", "fad", "lad", "pad", "sad", "add", "egg", "peg", "beg", "leg", "keg",
  "meg", "neg", "rig", "big", "dig", "fig", "gig", "jig", "pig", "wig", "zag", "nag", "rag", "sag", "tag",
  "wag", "bag", "gag", "lag", "mag", "jag", "yak", "zap", "lap", "map", "nap", "rap", "sap", "tap", "gap",
  ...generateCvc(80),
];

const AGE_2_4_MEDIUM = [
  "fish", "duck", "frog", "tree", "star", "moon", "book", "milk", "ball", "hand", "foot", "nose", "eyes",
  "ears", "lips", "chin", "hair", "face", "arm", "leg", "toe", "knee", "bell", "farm", "barn", "corn",
  "rain", "snow", "wind", "cold", "warm", "cool", "food", "cake", "rice", "soup", "meat", "fish", "duck",
  "goat", "lamb", "colt", "foal", "calf", "chick", "hatch", "nest", "wing", "beak", "claw", "paws", "tail",
  "spot", "stripe", "brown", "black", "white", "green", "blue", "pink", "gray", "gold", "ship", "trip",
  "shop", "stop", "drop", "flip", "flop", "clap", "snap", "step", "skip", "jump", "kick", "pick", "pack",
  "back", "rack", "sack", "tack", "lack", "mock", "rock", "sock", "lock", "dock", "block", "clock", "stock",
  "truck", "track", "stack", "stick", "stuck", "trick", "brick", "quick", "black", "crack", "snack", "shack",
  "plant", "grant", "slant", "stand", "brand", "grand", "strand", "bland", "blend", "trend", "spend", "send",
  "bend", "lend", "mend", "tent", "vent", "went", "sent", "rent", "cent", "dent", "gent", "pent", "lint",
  "mint", "hint", "tint", "sprint", "print", "flint", "glint", "stint", "squint", "point", "joint", "oink",
  "boink", "zinc", "sync", "lynch", "pinch", "finch", "inch", "cinch", "winch", "bench", "wrench", "drench",
  "french", "trench", "clench", "quench", "stench", "lunch", "bunch", "punch", "crunch", "munch", "hunch",
  "branch", "blanch", "ranch", "stanch", "launch", "haunch", "paunch", "debauch", "broach", "coach", "roach",
  "poach", "approach", "encroach", "reproach", "reproach", "reproach",
];

const AGE_2_4_HARD = [
  "brush", "truck", "plant", "block", "clock", "stock", "stick", "brick", "quick", "black", "crack", "snack",
  "shack", "track", "stack", "stuck", "trick", "thick", "chick", "click", "stick", "brick", "prick", "slick",
  "trick", "wreck", "check", "deck", "neck", "peck", "reck", "speck", "trek", "flex", "hex", "vex", "apex",
  "index", "annex", "annex", "annex", "blend", "trend", "spend", "blend", "fend", "mend", "send", "bend",
  "lend", "rend", "tend", "vend", "wend", "yank", "rank", "bank", "tank", "sank", "thank", "frank", "crank",
  "drank", "prank", "plank", "blank", "flank", "stank", "shrank", "shrunk", "drunk", "trunk", "chunk", "clunk",
  "flunk", "plunk", "slunk", "spunk", "stunk", "blunt", "brunt", "grunt", "hunt", "punt", "runt", "stunt",
  "front", "blunt", "aunt", "daunt", "flaunt", "gaunt", "haunt", "jaunt", "taunt", "vaunt", "want", "chant",
  "grant", "plant", "slant", "stand", "brand", "grand", "strand", "bland", "expand", "demand", "command",
  "strand", "gland", "bland", "elands", "island", "inland", "inland", "inland", "inland", "inland",
  ...generateCvc(120).map((w) => w + "s").filter((w) => w.length <= 5),
];

const AGE_4_6_EASY = [
  "milk", "ball", "frog", "fish", "tree", "book", "cake", "kite", "moon", "star", "hand", "bird", "leaf",
  "jump", "drum", "rain", "snow", "wind", "farm", "barn", "corn", "seed", "soil", "root", "stem", "bloom",
  "rose", "lily", "daisy", "tulip", "vine", "bush", "grass", "field", "meadow", "river", "lake", "pond",
  "stream", "beach", "sand", "shell", "wave", "tide", "rock", "stone", "pebble", "cliff", "hill", "vale",
  "path", "road", "lane", "gate", "fence", "wall", "roof", "door", "window", "floor", "room", "hall", "kitchen",
  "table", "chair", "shelf", "drawer", "closet", "garage", "garden", "yard", "porch", "steps", "stairs", "ramp",
  "bridge", "tunnel", "train", "track", "station", "ticket", "travel", "visit", "picnic", "party", "game",
  "puzzle", "doll", "block", "paint", "crayon", "paper", "pencil", "eraser", "ruler", "scissors", "glue",
  "tape", "string", "ribbon", "button", "zipper", "pocket", "collar", "sleeve", "button", "stripe", "pattern",
  "yellow", "orange", "purple", "silver", "copper", "bronze", "marble", "crystal", "diamond", "pearl",
  "rabbit", "turtle", "monkey", "donkey", "puppy", "kitten", "chicken", "rooster", "turkey", "penguin",
  "school", "garden", "friend", "family", "mother", "father", "sister", "brother", "cousin", "uncle", "aunt",
  "neighbor", "teacher", "student", "class", "lesson", "story", "poem", "song", "dance", "music", "rhythm",
  "market", "store", "shop", "money", "coin", "wallet", "purse", "basket", "bucket", "bottle", "plate", "bowl",
  "spoon", "fork", "knife", "napkin", "towel", "soap", "brush", "comb", "mirror", "lamp", "light", "switch",
  "clock", "watch", "calendar", "season", "spring", "summer", "autumn", "winter", "weather", "cloud", "storm",
  "thunder", "lightning", "rainbow", "sunshine", "shadow", "breeze", "gust", "frost", "ice", "snowflake",
];

const AGE_4_6_MEDIUM = [
  "garden", "rabbit", "yellow", "purple", "orange", "silver", "market", "pocket", "button", "window", "kitchen",
  "station", "pattern", "crystal", "diamond", "penguin", "chicken", "teacher", "student", "neighbor", "calendar",
  "sunshine", "rainbow", "lightning", "thunder", "snowflake", "autumn", "winter", "spring", "summer", "weather",
  "morning", "evening", "afternoon", "midnight", "breakfast", "lunchtime", "dinner", "snack", "hungry", "thirsty",
  "healthy", "strong", "brave", "kind", "gentle", "polite", "honest", "helpful", "careful", "playful", "cheerful",
  "peaceful", "hopeful", "thankful", "grateful", "wonderful", "beautiful", "colorful", "powerful", "thoughtful",
  "skillful", "harmful", "harmless", "careless", "priceless", "worthless", "restless", "endless", "timeless",
  "homeless", "hopeless", "fearless", "reckless", "helpless", "useless", "speechless", "breathless", "countless",
  "boundless", "limitless", "spotless", "flawless", "stainless", "tireless", "effortless", "motionless", "noiseless",
  "cloudless", "timeless", "timeless", "timeless", "backpack", "handbag", "suitcase", "briefcase", "bookcase",
  "showcase", "staircase", "baseball", "football", "basketball", "volleyball", "softball", "handball", "snowball",
  "fireball", "meatball", "eyeball", "hairball", "pinball", "cornball", "oddball", "fastball", "curveball",
  "flyball", "groundball", "lineball", "lineball", "lineball", "playground", "background", "foreground", "underground",
  "surround", "abound", "rebound", "bound", "found", "sound", "round", "pound", "wound", "hound", "mound",
  "count", "mount", "fount", "account", "discount", "recount", "surmount", "paramount", "mountain", "fountain",
  "captain", "certain", "curtain", "maintain", "obtain", "retain", "sustain", "contain", "detain", "explain",
  "complain", "disdain", "domain", "remain", "stain", "strain", "train", "brain", "drain", "grain", "plain",
  "rain", "Spain", "chain", "pain", "main", "vain", "lane", "cane", "bane", "mane", "pane", "sane", "wane",
];

const AGE_4_6_HARD = [
  "adventure", "important", "different", "together", "remember", "believe", "complete", "continue", "discover",
  "explore", "imagine", "practice", "question", "sentence", "paragraph", "alphabet", "consonant", "vowel",
  "syllable", "rhythm", "pattern", "language", "grammar", "spelling", "reading", "writing", "learning", "thinking",
  "understand", "explain", "describe", "compare", "contrast", "measure", "balance", "fraction", "decimal", "percent",
  "multiply", "divide", "subtract", "addition", "equation", "problem", "solution", "answer", "mistake", "correct",
  "incorrect", "perfect", "improve", "progress", "achieve", "success", "failure", "attempt", "effort", "challenge",
  "difficult", "simple", "complex", "ordinary", "special", "unique", "common", "rare", "ancient", "modern",
  "future", "present", "past", "history", "science", "biology", "chemistry", "physics", "geography", "geometry",
  "algebra", "calculus", "statistics", "probability", "experiment", "hypothesis", "conclusion", "evidence",
  "research", "investigate", "observe", "predict", "estimate", "calculate", "communicate", "cooperate", "participate",
  "celebrate", "decorate", "organize", "recognize", "realize", "apologize", "emphasize", "summarize", "characterize",
  "categorize", "prioritize", "specialize", "generalize", "visualize", "memorize", "exercise", "exercise", "exercise",
  "exercise", "exercise", "exercise", "exercise", "exercise", "exercise", "exercise", "exercise", "exercise",
  "butterfly", "dragonfly", "firefly", "housefly", "horsefly", "mayfly", "sawfly", "blackfly", "greenfly", "bluefly",
  "sunflower", "cornflower", "wallflower", "cauliflower", "wildflower", "mayflower", "passionflower", "passionflower",
  "waterfall", "waterfall", "waterfall", "waterfall", "waterfall", "waterfall", "waterfall", "waterfall",
  "playground", "playground", "playground", "playground", "playground", "playground", "playground", "playground",
  "playground", "playground", "playground", "playground", "playground", "playground", "playground", "playground",
  "playground", "playground", "playground", "playground", "playground", "playground", "playground", "playground",
];

const AGE_6_8_EASY = [
  "ship", "chair", "train", "black", "cloud", "plant", "brush", "sheep", "three", "beach", "grape", "queen",
  "phone", "snake", "knife", "mount", "count", "sound", "round", "found", "ground", "pound", "bound", "wound",
  "shout", "scout", "trout", "about", "spout", "clout", "grout", "snout", "tout", "flout", "sprout", "through",
  "though", "thought", "brought", "fought", "sought", "caught", "taught", "naught", "daughter", "laughter",
  "slaughter", "slaughter", "slaughter", "slaughter", "elephant", "mountain", "library", "factory", "history",
  "mystery", "victory", "memory", "gallery", "delivery", "discovery", "recovery", "category", "inventory", "territory",
  "mandatory", "legendary", "ordinary", "temporary", "necessary", "secretary", "dictionary", "stationery", "machinery",
  "jewellery", "chemistry", "symmetry", "geometry", "astronomy", "economy", "autonomy", "harmony", "ceremony",
  "testimony", "monotony", "matrimony", "patrimony", "acrimony", "antimony", "hegemony", "hegemony", "hegemony",
  "computer", "teacher", "student", "problem", "solution", "question", "answer", "science", "biology", "chemistry",
  "physics", "geography", "geometry", "algebra", "fraction", "decimal", "percent", "multiply", "divide", "subtract",
  "addition", "equation", "balance", "measure", "compare", "contrast", "describe", "explain", "understand", "imagine",
  "practice", "discover", "explore", "continue", "complete", "remember", "believe", "together", "different", "important",
  "adventure", "beautiful", "wonderful", "colorful", "powerful", "thoughtful", "grateful", "peaceful", "cheerful",
  "playful", "helpful", "careful", "harmful", "harmless", "priceless", "worthless", "restless", "endless", "timeless",
  "fearless", "reckless", "helpless", "useless", "speechless", "breathless", "countless", "boundless", "limitless",
  "spotless", "flawless", "stainless", "tireless", "effortless", "motionless", "noiseless", "cloudless", "timeless",
];

const AGE_6_8_MEDIUM = [
  "elephant", "mountain", "library", "computer", "vacation", "language", "because", "science", "friendship",
  "knowledge", "beautiful", "adventure", "important", "different", "together", "remember", "believe", "complete",
  "continue", "discover", "explore", "imagine", "practice", "question", "sentence", "paragraph", "alphabet",
  "consonant", "vowel", "syllable", "rhythm", "pattern", "grammar", "spelling", "reading", "writing", "learning",
  "thinking", "understand", "explain", "describe", "compare", "contrast", "measure", "balance", "fraction", "decimal",
  "percent", "multiply", "divide", "subtract", "addition", "equation", "problem", "solution", "answer", "mistake",
  "correct", "incorrect", "perfect", "improve", "progress", "achieve", "success", "failure", "attempt", "effort",
  "challenge", "difficult", "simple", "complex", "ordinary", "special", "unique", "common", "rare", "ancient",
  "modern", "future", "present", "past", "history", "biology", "chemistry", "physics", "geography", "geometry",
  "algebra", "calculus", "statistics", "probability", "experiment", "hypothesis", "conclusion", "evidence", "research",
  "investigate", "observe", "predict", "estimate", "calculate", "communicate", "cooperate", "participate", "celebrate",
  "decorate", "organize", "recognize", "realize", "apologize", "emphasize", "summarize", "characterize", "categorize",
  "prioritize", "specialize", "generalize", "visualize", "memorize", "exercise", "exercise", "exercise", "exercise",
  "butterfly", "dragonfly", "firefly", "housefly", "horsefly", "mayfly", "sawfly", "blackfly", "greenfly", "bluefly",
  "sunflower", "cornflower", "wallflower", "cauliflower", "wildflower", "mayflower", "passionflower", "passionflower",
  "waterfall", "waterfall", "waterfall", "waterfall", "waterfall", "waterfall", "waterfall", "waterfall",
  "playground", "playground", "playground", "playground", "playground", "playground", "playground", "playground",
  "playground", "playground", "playground", "playground", "playground", "playground", "playground", "playground",
];

const AGE_6_8_HARD = [
  "knowledge", "beautiful", "because", "friendship", "necessary", "secretary", "dictionary", "machinery", "chemistry",
  "symmetry", "geometry", "astronomy", "economy", "autonomy", "harmony", "ceremony", "testimony", "monotony", "matrimony",
  "patrimony", "acrimony", "antimony", "hegemony", "hegemony", "hegemony", "hegemony", "hegemony", "hegemony", "hegemony",
  "extraordinary", "responsibility", "accountability", "compatibility", "availability", "accessibility", "flexibility",
  "credibility", "visibility", "possibility", "probability", "capability", "stability", "mobility", "ability", "utility",
  "community", "immunity", "unity", "opportunity", "personality", "nationality", "reality", "quality", "quantity",
  "equality", "charity", "clarity", "popularity", "regularity", "similarity", "superiority", "inferiority", "priority",
  "authority", "majority", "minority", "security", "purity", "maturity", "curiosity", "generosity", "prosperity",
  "integrity", "creativity", "productivity", "activity", "sensitivity", "flexibility", "compatibility", "availability",
  "accessibility", "visibility", "possibility", "probability", "capability", "stability", "mobility", "ability", "utility",
  "environment", "government", "development", "management", "investment", "agreement", "arrangement", "announcement",
  "achievement", "improvement", "requirement", "measurement", "replacement", "engagement", "encouragement", "establishment",
  "entertainment", "experiment", "instrument", "monument", "document", "argument", "department", "apartment", "equipment",
  "excitement", "movement", "treatment", "statement", "settlement", "basement", "pavement", "shipment", "payment", "employment",
  "enjoyment", "adjustment", "commitment", "investment", "advertisement", "announcement", "arrangement", "assessment",
  "assignment", "attachment", "attendance", "avoidance", "awareness", "balance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
];

const AGE_8_10_EASY = [
  "school", "balloon", "picture", "library", "journey", "elephant", "mountain", "computer", "vacation", "language",
  "adventure", "beautiful", "knowledge", "science", "friendship", "because", "important", "different", "together",
  "remember", "believe", "complete", "continue", "discover", "explore", "imagine", "practice", "question", "sentence",
  "paragraph", "alphabet", "consonant", "vowel", "syllable", "rhythm", "pattern", "grammar", "spelling", "reading",
  "writing", "learning", "thinking", "understand", "explain", "describe", "compare", "contrast", "measure", "balance",
  "fraction", "decimal", "percent", "multiply", "divide", "subtract", "addition", "equation", "problem", "solution",
  "answer", "mistake", "correct", "incorrect", "perfect", "improve", "progress", "achieve", "success", "failure",
  "attempt", "effort", "challenge", "difficult", "simple", "complex", "ordinary", "special", "unique", "common",
  "rare", "ancient", "modern", "future", "present", "past", "history", "biology", "chemistry", "physics", "geography",
  "geometry", "algebra", "calculus", "statistics", "probability", "experiment", "hypothesis", "conclusion", "evidence",
  "research", "investigate", "observe", "predict", "estimate", "calculate", "communicate", "cooperate", "participate",
  "celebrate", "decorate", "organize", "recognize", "realize", "apologize", "emphasize", "summarize", "characterize",
  "categorize", "prioritize", "specialize", "generalize", "visualize", "memorize", "exercise", "exercise", "exercise",
];

const AGE_8_10_MEDIUM = [
  "elephant", "mountain", "library", "computer", "vacation", "language", "because", "science", "friendship", "knowledge",
  "beautiful", "adventure", "important", "different", "together", "remember", "believe", "complete", "continue", "discover",
  "explore", "imagine", "practice", "question", "sentence", "paragraph", "alphabet", "consonant", "vowel", "syllable",
  "extraordinary", "responsibility", "accountability", "compatibility", "availability", "accessibility", "flexibility",
  "credibility", "visibility", "possibility", "probability", "capability", "stability", "mobility", "ability", "utility",
  "community", "immunity", "unity", "opportunity", "personality", "nationality", "reality", "quality", "quantity",
  "equality", "charity", "clarity", "popularity", "regularity", "similarity", "superiority", "inferiority", "priority",
  "authority", "majority", "minority", "security", "purity", "maturity", "curiosity", "generosity", "prosperity",
  "integrity", "creativity", "productivity", "activity", "sensitivity", "environment", "government", "development",
  "management", "investment", "agreement", "arrangement", "announcement", "achievement", "improvement", "requirement",
  "measurement", "replacement", "engagement", "encouragement", "establishment", "entertainment", "instrument", "monument",
  "document", "argument", "department", "apartment", "equipment", "excitement", "movement", "treatment", "statement",
  "settlement", "basement", "pavement", "shipment", "payment", "employment", "enjoyment", "adjustment", "commitment",
  "advertisement", "assessment", "assignment", "attachment", "attendance", "avoidance", "awareness", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
];

const AGE_8_10_HARD = [
  "knowledge", "beautiful", "because", "friendship", "extraordinary", "responsibility", "accountability", "compatibility",
  "availability", "accessibility", "flexibility", "credibility", "visibility", "possibility", "probability", "capability",
  "stability", "mobility", "ability", "utility", "community", "immunity", "unity", "opportunity", "personality",
  "nationality", "reality", "quality", "quantity", "equality", "charity", "clarity", "popularity", "regularity",
  "similarity", "superiority", "inferiority", "priority", "authority", "majority", "minority", "security", "purity",
  "maturity", "curiosity", "generosity", "prosperity", "integrity", "creativity", "productivity", "activity", "sensitivity",
  "environment", "government", "development", "management", "investment", "agreement", "arrangement", "announcement",
  "achievement", "improvement", "requirement", "measurement", "replacement", "engagement", "encouragement", "establishment",
  "entertainment", "instrument", "monument", "document", "argument", "department", "apartment", "equipment", "excitement",
  "movement", "treatment", "statement", "settlement", "basement", "pavement", "shipment", "payment", "employment",
  "enjoyment", "adjustment", "commitment", "advertisement", "assessment", "assignment", "attachment", "attendance",
  "avoidance", "awareness", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
  "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance", "brilliance",
];

function dedupe(words: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    const x = w.toLowerCase().trim();
    if (!x || x.length < 2 || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/** Expand a seed list to at least `min` unique words using suffix/prefix variants. */
function expandToMin(words: string[], min: number): string[] {
  let pool = dedupe(words);
  const suffixes = ["s", "ed", "ing", "er", "ly", "ness", "ful", "less"];
  let i = 0;
  while (pool.length < min && i < words.length * 2) {
    const base = words[i % words.length]!.toLowerCase();
    if (base.length >= 3 && base.length <= 8) {
      for (const suf of suffixes) {
        const v = base + suf;
        if (v.length <= 12 && !pool.includes(v)) pool.push(v);
        if (pool.length >= min) break;
      }
    }
    i++;
  }
  return dedupe(pool).slice(0, Math.max(min, pool.length));
}

export const WORD_SEEDS: SeedBank = {
  "2-4": {
    easy: expandToMin(AGE_2_4_EASY, 220),
    medium: expandToMin(AGE_2_4_MEDIUM, 220),
    hard: expandToMin(AGE_2_4_HARD, 220),
  },
  "4-6": {
    easy: expandToMin(AGE_4_6_EASY, 220),
    medium: expandToMin(AGE_4_6_MEDIUM, 220),
    hard: expandToMin(AGE_4_6_HARD, 220),
  },
  "6-8": {
    easy: expandToMin(AGE_6_8_EASY, 220),
    medium: expandToMin(AGE_6_8_MEDIUM, 220),
    hard: expandToMin(AGE_6_8_HARD, 220),
  },
  "8-10+": {
    easy: expandToMin(AGE_8_10_EASY, 220),
    medium: expandToMin(AGE_8_10_MEDIUM, 220),
    hard: expandToMin(AGE_8_10_HARD, 220),
  },
};

export const SPELLING_AGE_GROUPS = ["2-4", "4-6", "6-8", "8-10+"] as const;
export const SPELLING_DIFFICULTIES = ["easy", "medium", "hard"] as const;
