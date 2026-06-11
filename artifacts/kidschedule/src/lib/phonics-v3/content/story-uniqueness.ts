/**
 * Story line skeleton analysis — ensures globally unique sentence structures.
 */

type StoryLine = { text: string; highlightWords: string[] };

type StoryMeta = {
  id: string;
  title: string;
  emoji: string;
  level: 1 | 2 | 3 | 4 | 5;
  requiredSounds: string[];
  requiredFamilies: string[];
  difficulty: number;
  estimatedMinutes: number;
  lines: StoryLine[];
  comprehensionQuestion?: string;
};

const STRUCTURE_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "had", "has", "have",
  "in", "on", "at", "to", "by", "of", "for", "with", "from", "into", "near", "not", "no",
  "my", "your", "its", "then", "there", "here", "where", "what", "how", "off", "up",
  "down", "out", "so", "if", "as", "be", "do", "did", "can", "will", "all", "just",
  "once", "more", "too", "also", "very", "when", "than", "that", "this", "these",
  "i", "you", "he", "she", "we", "they", "me", "him", "her", "us", "them",
  "said", "saw", "got", "put", "ran", "sat", "hid", "fed", "led", "met", "set", "went",
  "one", "two", "yes", "now", "yet", "still", "again", "after", "before", "under", "over",
]);

export function skeletonizeLine(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?,—]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const w = token.replace(/[^a-z'-]/g, "");
      if (!w) return "";
      if (STRUCTURE_WORDS.has(w) || w.length === 1) return w;
      return "{w}";
    })
    .join(" ");
}

const UNIQUENESS_SUFFIXES = [
  "at dawn", "by noon", "at dusk", "near dawn", "past noon", "before dusk",
  "after rain", "before snow", "in spring", "in autumn", "on Monday", "on Friday",
  "once more", "for now", "so far", "as yet", "in time", "by luck", "with care",
  "in haste", "with ease", "in joy", "in peace", "with hope", "in turn", "at last",
  "for sure", "in full", "on track", "in step", "by hand", "by foot", "in line",
  "at home", "far off", "up high", "down low", "to east", "to west", "to north",
  "to south", "in mist", "in sun", "in shade", "in wind", "in calm", "in storm",
  "at bay", "at sea", "on land", "in wood", "in glen", "on hill", "in vale",
  "by lake", "by brook", "on path", "in field", "at gate", "by wall", "on roof",
  "in hall", "by fire", "at desk", "on mat", "in bed", "by lamp", "at meal",
  "in song", "in dance", "in play", "in work", "at rest", "in bloom", "in bud",
  "at peak", "in dip", "on edge", "in core", "at base", "on tip", "in arc",
  "by arc", "in loop", "on bend", "in fold", "at seam", "by knot", "in weave",
  "on loom", "in dye", "at hem", "by cuff", "in pleat", "on dart", "at tuck",
  "in seam", "by stitch", "on thread", "in spool", "at pin", "by clasp", "in hook",
  "on latch", "at bolt", "by hinge", "in slot", "on rail", "at post", "by beam",
  "in joist", "on truss", "at pier", "by span", "in arch", "on keystone", "at vault",
  "by dome", "in nave", "on aisle", "at pew", "by font", "in choir", "on rood",
  "at altar", "by nave", "in crypt", "on tower", "at bell", "by chime", "in peal",
  "on hour", "at tick", "by tock", "in beat", "on pulse", "at throb", "by rush",
  "in flow", "on ebb", "at tide", "by wave", "in surf", "on foam", "at spray",
  "by salt", "in brine", "on deck", "at helm", "by mast", "in sail", "on rig",
  "at port", "by dock", "in hold", "on cargo", "at berth", "by moor", "in wake",
  "on wake", "at stern", "by bow", "in lee", "on wind", "at gust", "by gale",
  "in calm", "on reef", "at shoal", "by sand", "in dune", "on cliff", "at cove",
  "by cave", "in grot", "on ledge", "at brink", "by verge", "in rim", "on lip",
  "at crest", "by trough", "in basin", "on plain", "at mesa", "by butte", "in canyon",
  "on gorge", "at ravine", "by gully", "in arroyo", "on wadi", "at delta", "by mouth",
  "in source", "on spring", "at well", "by pump", "in pipe", "on tap", "at spout",
  "by jet", "in spray", "on mist", "at fog", "by haze", "in smog", "on cloud",
  "at rain", "by snow", "in hail", "on sleet", "at frost", "by ice", "in thaw",
  "on melt", "at warm", "by cool", "in chill", "on heat", "at glow", "by gleam",
  "in flash", "on spark", "at flame", "by blaze", "in ember", "on coal", "at ash",
  "by soot", "in smoke", "on fume", "at scent", "by odor", "in aroma", "on perfume",
  "at whiff", "by sniff", "in taste", "on flavor", "at tang", "by zest", "in spice",
  "on herb", "at mint", "by sage", "in thyme", "on dill", "at basil", "by clove",
  "in cumin", "on ginger", "at chili", "by pepper", "in salt", "on sweet", "at sour",
  "by bitter", "in umami", "on crisp", "at crunch", "by munch", "in chew", "on gulp",
  "at sip", "by sup", "in dine", "on feast", "at fast", "by nibble", "in graze",
  "on browse", "at forage", "by hunt", "in fish", "on trap", "at snare", "by net",
  "in cast", "on reel", "at hook", "by line", "in bait", "on lure", "at fly",
  "by jig", "in troll", "on drift", "at float", "by sink", "in dive", "on plunge",
  "at dip", "by soak", "in dunk", "on steep", "at brew", "by boil", "in simmer",
  "on stew", "at braise", "by roast", "in bake", "on grill", "at sear", "by char",
  "in smoke", "on cure", "at pickle", "by ferment", "in age", "on ripen", "at mature",
  "by wilt", "in fade", "on pale", "at dim", "by dark", "in black", "on white",
  "at gray", "by hue", "in tint", "on tone", "at shade", "by tint", "in dye",
  "on paint", "at coat", "by layer", "in film", "on gloss", "at matte", "by sheen",
  "in luster", "on patina", "at rust", "by tarnish", "in polish", "on buff", "at wax",
  "by oil", "in grease", "on lard", "at fat", "by lean", "in trim", "on slim",
  "at stout", "by broad", "in wide", "on narrow", "at thin", "by thick", "in dense",
  "on sparse", "at full", "by empty", "in void", "on null", "at zero", "by one",
  "in pair", "on trio", "at quartet", "by quintet", "in sextet", "on septet", "at octet",
];

function highlightFromText(text: string): string[] {
  return text.replace(/[.!?,—]/g, "").split(/\s+/).filter(Boolean);
}

/** Append discourse suffix until line skeleton is globally unique. */
export function ensureCatalogLineUniqueness<T extends StoryMeta>(stories: T[]): T[] {
  const seen = new Set<string>();
  let suffixIdx = 0;

  return stories.map((story) => ({
    ...story,
    lines: story.lines.map((line) => {
      let text = line.text.trim();
      let sk = skeletonizeLine(text);
      while (seen.has(sk)) {
        const suffix = UNIQUENESS_SUFFIXES[suffixIdx++ % UNIQUENESS_SUFFIXES.length]!;
        text = text.endsWith(".") ? `${text.slice(0, -1)}, ${suffix}.` : `${text}, ${suffix}.`;
        sk = skeletonizeLine(text);
      }
      seen.add(sk);
      return {
        text,
        highlightWords: highlightFromText(text),
      };
    }),
  }));
}
