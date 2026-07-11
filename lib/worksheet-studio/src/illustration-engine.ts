/** Child-safe black-outline SVG illustrations for preschool worksheets. */

const CACHE = new Map<string, string>();

export type IllustrationKind =
  | "fish" | "dolphin" | "starfish" | "shark" | "whale" | "crab" | "octopus" | "turtle"
  | "apple" | "banana" | "car" | "bus"
  | "tree" | "flower" | "sun" | "moon" | "cat" | "dog" | "bird" | "butterfly" | "bee" | "elephant"
  | "circle" | "square" | "triangle" | "star";

const SVG_TEMPLATES: Record<IllustrationKind, string> = {
  fish: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><ellipse cx="50" cy="40" rx="35" ry="22" fill="none" stroke="#111" stroke-width="3"/><polygon points="85,40 110,25 110,55" fill="none" stroke="#111" stroke-width="3"/><circle cx="35" cy="35" r="4" fill="#111"/></svg>`,
  dolphin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><path d="M20,50 Q50,10 90,35 Q70,45 85,55 Q50,70 20,50Z" fill="none" stroke="#111" stroke-width="3"/><circle cx="75" cy="32" r="3" fill="#111"/></svg>`,
  starfish: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><polygon points="40,5 48,30 75,30 52,48 60,75 40,58 20,75 28,48 5,30 32,30" fill="none" stroke="#111" stroke-width="2.5"/></svg>`,
  shark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70"><path d="M15,40 Q45,15 95,32 L110,28 L100,40 L110,52 L95,48 Q45,58 15,40Z" fill="none" stroke="#111" stroke-width="3"/><circle cx="78" cy="30" r="3" fill="#111"/></svg>`,
  whale: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70"><ellipse cx="55" cy="38" rx="42" ry="22" fill="none" stroke="#111" stroke-width="3"/><path d="M95,30 Q110,20 115,35 Q108,45 95,40Z" fill="none" stroke="#111" stroke-width="2.5"/><circle cx="35" cy="32" r="3" fill="#111"/></svg>`,
  crab: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 70"><ellipse cx="45" cy="42" rx="28" ry="16" fill="none" stroke="#111" stroke-width="3"/><path d="M20,35 L8,25 M20,48 L8,55 M70,35 L82,25 M70,48 L82,55" stroke="#111" stroke-width="2.5" fill="none"/></svg>`,
  octopus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90"><circle cx="45" cy="32" r="22" fill="none" stroke="#111" stroke-width="3"/><path d="M28,50 Q25,70 30,82 M38,52 Q36,72 40,85 M45,54 Q45,75 45,88 M52,52 Q54,72 50,85 M62,50 Q65,70 60,82" stroke="#111" stroke-width="2.5" fill="none"/></svg>`,
  turtle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70"><ellipse cx="50" cy="38" rx="32" ry="20" fill="none" stroke="#111" stroke-width="3"/><circle cx="78" cy="38" r="10" fill="none" stroke="#111" stroke-width="2.5"/><path d="M22,38 L10,30 M22,45 L10,50" stroke="#111" stroke-width="2" fill="none"/></svg>`,
  apple: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90"><path d="M40,25 Q20,30 22,55 Q24,78 40,82 Q56,78 58,55 Q60,30 40,25Z" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  banana: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 50"><path d="M10,35 Q40,5 80,20 Q50,45 10,35Z" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  car: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect x="15" y="25" width="90" height="25" rx="5" fill="none" stroke="#111" stroke-width="3"/><circle cx="35" cy="50" r="8" fill="none" stroke="#111" stroke-width="3"/><circle cx="85" cy="50" r="8" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  bus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70"><rect x="10" y="15" width="100" height="45" rx="6" fill="none" stroke="#111" stroke-width="3"/><circle cx="30" cy="60" r="7" fill="none" stroke="#111" stroke-width="2"/><circle cx="90" cy="60" r="7" fill="none" stroke="#111" stroke-width="2"/></svg>`,
  tree: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><rect x="34" y="60" width="12" height="35" fill="none" stroke="#111" stroke-width="3"/><polygon points="40,5 70,55 10,55" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  flower: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90"><circle cx="40" cy="35" r="10" fill="none" stroke="#111" stroke-width="2"/><line x1="40" y1="45" x2="40" y2="85" stroke="#111" stroke-width="3"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="18" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 70"><path d="M45,10 Q25,25 25,45 Q25,65 50,60 Q35,50 35,30 Q35,15 45,10Z" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  cat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 80"><circle cx="45" cy="45" r="28" fill="none" stroke="#111" stroke-width="3"/><circle cx="35" cy="42" r="3" fill="#111"/><circle cx="55" cy="42" r="3" fill="#111"/></svg>`,
  dog: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 80"><ellipse cx="45" cy="48" rx="30" ry="25" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  bird: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 70"><ellipse cx="40" cy="38" rx="25" ry="18" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  butterfly: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 70"><ellipse cx="25" cy="30" rx="20" ry="25" fill="none" stroke="#111" stroke-width="2"/><ellipse cx="65" cy="30" rx="20" ry="25" fill="none" stroke="#111" stroke-width="2"/></svg>`,
  bee: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 70"><ellipse cx="45" cy="40" rx="22" ry="14" fill="none" stroke="#111" stroke-width="3"/><line x1="38" y1="32" x2="38" y2="48" stroke="#111" stroke-width="2"/><line x1="52" y1="32" x2="52" y2="48" stroke="#111" stroke-width="2"/><ellipse cx="28" cy="28" rx="10" ry="14" fill="none" stroke="#111" stroke-width="2"/><ellipse cx="62" cy="28" rx="10" ry="14" fill="none" stroke="#111" stroke-width="2"/><circle cx="58" cy="40" r="2" fill="#111"/></svg>`,
  elephant: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 80"><ellipse cx="50" cy="45" rx="32" ry="22" fill="none" stroke="#111" stroke-width="3"/><circle cx="78" cy="38" r="14" fill="none" stroke="#111" stroke-width="3"/><path d="M88,48 Q95,70 78,72" fill="none" stroke="#111" stroke-width="2.5"/><circle cx="84" cy="34" r="2.5" fill="#111"/></svg>`,
  circle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="32" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  square: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect x="10" y="10" width="60" height="60" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  triangle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><polygon points="40,10 70,70 10,70" fill="none" stroke="#111" stroke-width="3"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><polygon points="40,5 48,28 72,28 52,44 60,68 40,54 20,68 28,44 8,28 32,28" fill="none" stroke="#111" stroke-width="2.5"/></svg>`,
};

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getIllustration(kind: IllustrationKind): string {
  const cached = CACHE.get(kind);
  if (cached) return cached;
  const url = svgToDataUrl(SVG_TEMPLATES[kind] ?? SVG_TEMPLATES.circle);
  CACHE.set(kind, url);
  return url;
}

const KEYWORD_MAP: Array<[RegExp, IllustrationKind]> = [
  [/fish|🐟|🐠/i, "fish"], [/dolphin|🐬/i, "dolphin"], [/shark|🦈/i, "shark"], [/whale|🐋|🐳/i, "whale"],
  [/crab|🦀/i, "crab"], [/octopus|🐙/i, "octopus"], [/turtle|🐢/i, "turtle"], [/starfish|⭐/i, "starfish"],
  [/apple|🍎|🍏/i, "apple"], [/banana|🍌/i, "banana"],
  [/car|🚗/i, "car"], [/bus|🚌/i, "bus"], [/tree|🌳|🌲/i, "tree"], [/flower|🌸|🌺|🌹/i, "flower"],
  [/sun|☀️|🌞/i, "sun"], [/moon|🌙/i, "moon"], [/cat|🐱|🐈/i, "cat"], [/dog|🐶|🐕/i, "dog"],
  [/bird|🐦/i, "bird"], [/butterfly|🦋/i, "butterfly"], [/bee|🐝/i, "bee"], [/elephant|🐘/i, "elephant"],
];

/** Map leftover Unicode pictographs to AmyNest line-art (never render emoji on worksheets). */
const EMOJI_TO_KIND: Record<string, IllustrationKind> = {
  "🐟": "fish", "🐠": "fish", "🐬": "dolphin", "🦈": "shark", "🐋": "whale", "🐳": "whale",
  "🦀": "crab", "🐙": "octopus", "🐢": "turtle", "🍎": "apple", "🍏": "apple", "🍌": "banana",
  "🐱": "cat", "🐈": "cat", "🐶": "dog", "🐕": "dog", "🐦": "bird", "🦋": "butterfly",
  "🐝": "bee", "🐘": "elephant", "🌳": "tree", "🌸": "flower", "🔵": "circle", "⭐": "star",
};

export function detectIllustrationFromText(text: string): IllustrationKind {
  for (const [emoji, kind] of Object.entries(EMOJI_TO_KIND)) {
    if (text.includes(emoji)) return kind;
  }
  for (const [re, kind] of KEYWORD_MAP) if (re.test(text)) return kind;
  return "star";
}

/** Resolve printable SVG; never leave emoji as the rendered illustration. */
export function resolvePrintableIllustration(labelOrEmoji?: string | null): string | undefined {
  if (!labelOrEmoji?.trim()) return undefined;
  return getIllustration(detectIllustrationFromText(labelOrEmoji));
}

export function batchGenerateIllustrations(labels: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const label of labels) out.set(label, getIllustration(detectIllustrationFromText(label)));
  return out;
}
