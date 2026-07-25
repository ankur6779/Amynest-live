/**
 * Chapter presentation metadata — titles, previews, planet badges, structured beats.
 * Visual-only; narrative bodies remain in deep-insights-content.
 */

import type { InsightSectionId } from "../constants/deep-insights-content";

export type ChapterArtKind =
  | "heart"
  | "lights"
  | "gifts"
  | "curiosity"
  | "mind"
  | "voice"
  | "paint"
  | "north_star"
  | "bonds"
  | "weather"
  | "confidence"
  | "love"
  | "meaning"
  | "career"
  | "care"
  | "wonder"
  | "growth"
  | "tokens"
  | "planet_strong"
  | "planet_soft"
  | "rooms"
  | "mansion"
  | "converse"
  | "patterns"
  | "family"
  | "lantern"
  | "longer";

export type ChapterMeta = {
  /** Category label shown above the title (never "Chapter") */
  category: string;
  /** Two-line preview for closed cards */
  summary: string;
  readingMinutes: number;
  planetBadge: string;
  /** Tailwind-friendly HSL pieces for accent */
  accentFrom: string;
  accentTo: string;
  art: ChapterArtKind;
  notice: string;
  try: string;
  reflect: string;
  relatedId: InsightSectionId;
};

const META: Record<InsightSectionId, ChapterMeta> = {
  personality: {
    category: "Heart & Belonging",
    summary: "The emotional climate they carry — how they arrive, soften, and feel at home.",
    readingMinutes: 4,
    planetBadge: "Sun · Moon",
    accentFrom: "275 55% 32%",
    accentTo: "42 50% 28%",
    art: "heart",
    notice: "A quieter mood after busy rooms; warmth when routines feel predictable.",
    try: "Name the feeling before the fix — “It got loud; I’m here.”",
    reflect: "Where did belonging show up in a small moment today?",
    relatedId: "emotional",
  },
  strengths: {
    category: "Natural Lights",
    summary: "Quiet strengths already glowing — effort, recovery, and kindness that don’t need a stage.",
    readingMinutes: 3,
    planetBadge: "Sun",
    accentFrom: "42 60% 30%",
    accentTo: "275 40% 28%",
    art: "lights",
    notice: "They return to a task without prompting; they repair after a stumble.",
    try: "Celebrate one concrete effort before outcome — out loud, specifically.",
    reflect: "Which ordinary strength did you witness this week?",
    relatedId: "hidden_talents",
  },
  hidden_talents: {
    category: "Quiet Gifts",
    summary: "Talents that bloom in private first — sideways excellence before the spotlight.",
    readingMinutes: 3,
    planetBadge: "Moon",
    accentFrom: "260 50% 30%",
    accentTo: "210 40% 28%",
    art: "gifts",
    notice: "A hobby they revisit alone; solving a sibling’s problem without credit.",
    try: "Protect the greenhouse — fewer performances, more play materials.",
    reflect: "What gift appears when nobody is scoring?",
    relatedId: "creativity",
  },
  learning: {
    category: "Curiosity & Learning",
    summary: "How wonder becomes knowledge — short arcs, sensory anchors, shame-free repair.",
    readingMinutes: 4,
    planetBadge: "Mercury",
    accentFrom: "210 55% 30%",
    accentTo: "275 45% 28%",
    art: "curiosity",
    notice: "Curiosity spikes with novelty; shutdown after long drills.",
    try: "Design a 15-minute learning loop that ends on a win.",
    reflect: "When did learning feel like play this week?",
    relatedId: "thinking",
  },
  thinking: {
    category: "Inner Mind",
    summary: "The choreography between curiosity and caution — how they think, not just what they know.",
    readingMinutes: 3,
    planetBadge: "Mercury",
    accentFrom: "230 50% 28%",
    accentTo: "42 40% 26%",
    art: "mind",
    notice: "They narrate ideas out loud; sticky thoughts need soft landing.",
    try: "Ask “What made that click?” instead of “Why don’t you get it?”",
    reflect: "What thought pattern deserves more patience?",
    relatedId: "learning",
  },
  communication: {
    category: "Voice & Expression",
    summary: "Words, silence, humor, proximity — the many channels of being heard.",
    readingMinutes: 3,
    planetBadge: "Mercury · Moon",
    accentFrom: "195 50% 28%",
    accentTo: "275 45% 30%",
    art: "voice",
    notice: "Timing and tone matter as much as vocabulary.",
    try: "Reflect the feeling before offering a fix.",
    reflect: "When did they feel accurately heard?",
    relatedId: "relationships",
  },
  creativity: {
    category: "Imagination",
    summary: "How imagination metabolizes the world — bright making days and quiet gathering days.",
    readingMinutes: 3,
    planetBadge: "Venus · Moon",
    accentFrom: "300 45% 30%",
    accentTo: "42 55% 28%",
    art: "paint",
    notice: "Mess as draft; quitting when perfectionism arrives.",
    try: "Offer materials before instructions — one open tray tonight.",
    reflect: "What did they create when nobody watched?",
    relatedId: "hidden_talents",
  },
  leadership: {
    category: "Influence",
    summary: "Microscopic leadership — inclusion, turns, comfort — stewardship without a throne.",
    readingMinutes: 3,
    planetBadge: "Sun · North Star",
    accentFrom: "42 65% 32%",
    accentTo: "230 45% 26%",
    art: "north_star",
    notice: "Who they include; how they negotiate fairness.",
    try: "Praise care (“You made room for them”) over dominance.",
    reflect: "Where did they lead with kindness?",
    relatedId: "relationships",
  },
  relationships: {
    category: "Friendships",
    summary: "Bonds that soften them — constellation connections, not popularity forecasts.",
    readingMinutes: 3,
    planetBadge: "Venus",
    accentFrom: "330 45% 30%",
    accentTo: "275 50% 28%",
    art: "bonds",
    notice: "Playground friction; one trusted friend over a crowd.",
    try: "Practice a two-line invite script for joining play.",
    reflect: "Which friendship moment felt safe?",
    relatedId: "family_dynamics",
  },
  emotional: {
    category: "Inner Weather",
    summary: "Storms and clearings — feelings as weather in the relationship, not identity.",
    readingMinutes: 4,
    planetBadge: "Moon",
    accentFrom: "220 50% 30%",
    accentTo: "275 55% 28%",
    art: "weather",
    notice: "Quick thunder after small frictions; soft after co-regulation.",
    try: "Offer a 60-second landing: water, name, nearness.",
    reflect: "What weather passed through today?",
    relatedId: "personality",
  },
  confidence: {
    category: "Growing Confidence",
    summary: "Standing in their own light — effort before outcome, bravery without pressure.",
    readingMinutes: 3,
    planetBadge: "Sun · Mars",
    accentFrom: "42 70% 32%",
    accentTo: "15 50% 28%",
    art: "confidence",
    notice: "They freeze before new rooms; they glow after a witnessed try.",
    try: "Preview the doorway — one photo, one sentence, one choice.",
    reflect: "Where did courage look small but real?",
    relatedId: "strengths",
  },
  parenting: {
    category: "How Love Meets Them",
    summary: "Parenting approaches that reduce friction — love as climate, not correction.",
    readingMinutes: 4,
    planetBadge: "Moon · Venus",
    accentFrom: "275 50% 30%",
    accentTo: "42 45% 28%",
    art: "love",
    notice: "Less power struggle when choices are real and few.",
    try: "Offer two good options; hold the boundary kindly.",
    reflect: "Which loving move worked with the least force?",
    relatedId: "family_dynamics",
  },
  life_purpose: {
    category: "Meaning",
    summary: "Meaning, not mandate — purpose as curiosity about contribution, never destiny.",
    readingMinutes: 3,
    planetBadge: "Sun",
    accentFrom: "248 50% 28%",
    accentTo: "42 50% 26%",
    art: "meaning",
    notice: "They light up when helping; they wilt under “should.”",
    try: "Ask what they’d teach a younger child — not what they’ll “become.”",
    reflect: "What felt meaningful without a trophy?",
    relatedId: "life_themes",
  },
  career: {
    category: "Interest Climates",
    summary: "Interest climates — curiosities to water, never career predictions.",
    readingMinutes: 3,
    planetBadge: "Career Direction (Midheaven)",
    accentFrom: "200 45% 28%",
    accentTo: "42 40% 26%",
    art: "career",
    notice: "Clusters of fascination, not job titles.",
    try: "Follow one interest for a week with zero outcome talk.",
    reflect: "Which interest asked for more time?",
    relatedId: "learning",
  },
  health_awareness: {
    category: "Care Rituals",
    summary: "Care, not diagnosis — body kindness, rest, and regulation without medical claims.",
    readingMinutes: 3,
    planetBadge: "Moon",
    accentFrom: "160 40% 26%",
    accentTo: "275 40% 28%",
    art: "care",
    notice: "Sleep and snacks change the whole sky of a day.",
    try: "Protect a wind-down ritual — same three steps each night.",
    reflect: "What care ritual restored softness?",
    relatedId: "emotional",
  },
  spiritual: {
    category: "Wonder",
    summary: "Wonder & meaning — sky as poetry, never superstition as science.",
    readingMinutes: 3,
    planetBadge: "Wonder Theme (Neptune)",
    accentFrom: "265 55% 30%",
    accentTo: "210 40% 26%",
    art: "wonder",
    notice: "Awe at dusk; questions about “why we’re here.”",
    try: "Share one minute of star-gazing without answers.",
    reflect: "What filled them with quiet wonder?",
    relatedId: "reflection",
  },
  growth: {
    category: "Gentle Edges",
    summary: "Growth edges — challenges as soft frontiers, never fear-based labels.",
    readingMinutes: 3,
    planetBadge: "Growth Edges (Saturn)",
    accentFrom: "230 40% 26%",
    accentTo: "42 45% 28%",
    art: "growth",
    notice: "Friction points that teach patience when met kindly.",
    try: "Shrink the edge — one smaller step than yesterday.",
    reflect: "Which edge is ready for a kinder approach?",
    relatedId: "confidence",
  },
  lucky_symbols: {
    category: "Poetic Tokens",
    summary: "Poetic tokens — symbols for play and ritual, never charms that guarantee fate.",
    readingMinutes: 2,
    planetBadge: "Venus",
    accentFrom: "42 60% 30%",
    accentTo: "300 40% 28%",
    art: "tokens",
    notice: "Objects that calm; colors that invite focus.",
    try: "Let them choose a “courage pebble” for hard mornings.",
    reflect: "Which token felt comforting without magic claims?",
    relatedId: "spiritual",
  },
  planet_strengths: {
    category: "Planet Strengths",
    summary: "Where light feels steady — dignity language for chart strengths.",
    readingMinutes: 3,
    planetBadge: "Chart lights",
    accentFrom: "42 70% 30%",
    accentTo: "275 45% 28%",
    art: "planet_strong",
    notice: "Themes that feel easy when safety is high.",
    try: "Name one strength in sky language and one in home language.",
    reflect: "Where does light feel steady for them?",
    relatedId: "planet_soft_spots",
  },
  planet_soft_spots: {
    category: "Planet Soft Spots",
    summary: "Where softness needs care — sensitivity framed as information, not weakness.",
    readingMinutes: 3,
    planetBadge: "Chart soft spots",
    accentFrom: "275 50% 28%",
    accentTo: "210 40% 26%",
    art: "planet_soft",
    notice: "Tenderness around transitions or criticism.",
    try: "Buffer one soft spot with preview + snack + nearness.",
    reflect: "What softness asked for protection today?",
    relatedId: "planet_strengths",
  },
  house_themes: {
    category: "Rooms of a Life",
    summary: "Symbolic life areas — rooms to notice, never scripts to force.",
    readingMinutes: 3,
    planetBadge: "Life Areas (Astrological Houses)",
    accentFrom: "248 45% 28%",
    accentTo: "42 40% 26%",
    art: "rooms",
    notice: "Day Sky may leave some rooms gently closed.",
    try: "Explore one “room” through play, not interrogation.",
    reflect: "Which life room feels most alive this season?",
    relatedId: "life_themes",
  },
  nakshatra: {
    category: "Moon Messages",
    summary: "Lunar mansion poetry — cultural story clearly labeled, never science.",
    readingMinutes: 3,
    planetBadge: "Moon mansion",
    accentFrom: "230 50% 28%",
    accentTo: "275 50% 30%",
    art: "mansion",
    notice: "Traditional imagery offered as optional metaphor.",
    try: "Read the mansion story once; keep only what resonates.",
    reflect: "Which poetic image felt true — and which you’ll leave?",
    relatedId: "spiritual",
  },
  planet_combinations: {
    category: "How Lights Converse",
    summary: "How chart lights converse — patterns of dialogue, not fixed fate.",
    readingMinutes: 3,
    planetBadge: "How Lights Relate (Aspects)",
    accentFrom: "285 50% 28%",
    accentTo: "42 45% 26%",
    art: "converse",
    notice: "Two themes pulling and cooperating in the same child.",
    try: "Name both sides: “Brave and tender can share a day.”",
    reflect: "Which two lights were talking today?",
    relatedId: "personality",
  },
  yogas_cultural: {
    category: "Pattern Poems",
    summary: "Pattern poetry from tradition — cultural interpretation, clearly labeled.",
    readingMinutes: 3,
    planetBadge: "Tradition",
    accentFrom: "20 45% 28%",
    accentTo: "275 40% 28%",
    art: "patterns",
    notice: "Optional cultural metaphors — never mandates.",
    try: "If a poem helps patience, keep it; if not, release it.",
    reflect: "Did any pattern poem soften your week?",
    relatedId: "nakshatra",
  },
  family_dynamics: {
    category: "Family Connections",
    summary: "The room around them — family climate, orbits of care, influence without force.",
    readingMinutes: 3,
    planetBadge: "Moon · Venus",
    accentFrom: "275 55% 30%",
    accentTo: "330 40% 28%",
    art: "family",
    notice: "Adult stress weather becomes child weather.",
    try: "One adult regulation ritual before a family transition.",
    reflect: "How did the room around them feel today?",
    relatedId: "parenting",
  },
  reflection: {
    category: "A Parent's Reflection",
    summary: "A closing lantern — one soft question to carry, not a report to finish.",
    readingMinutes: 2,
    planetBadge: "Moon lake",
    accentFrom: "220 45% 26%",
    accentTo: "42 50% 28%",
    art: "lantern",
    notice: "A quiet true moment from the week that no chart predicted.",
    try: "Write three lines in a soft notebook — no polishing.",
    reflect: "What will you remember without needing to improve it?",
    relatedId: "life_themes",
  },
  life_themes: {
    category: "Life Themes",
    summary: "The longer story — threads across chapters, held lightly across years.",
    readingMinutes: 4,
    planetBadge: "Full chart",
    accentFrom: "248 55% 28%",
    accentTo: "42 55% 28%",
    art: "longer",
    notice: "Repeating motifs across months — belonging, curiosity, voice.",
    try: "Pick one theme to water for 30 days; ignore the rest.",
    reflect: "Which longer story feels kindest to tell?",
    relatedId: "personality",
  },
};

export function getChapterMeta(id: InsightSectionId): ChapterMeta {
  return (
    META[id] ?? {
      category: "Sky Chapter",
      summary: "A reflective chapter from their birth sky — notice without predicting.",
      readingMinutes: 3,
      planetBadge: "Chart",
      accentFrom: "275 50% 28%",
      accentTo: "42 45% 26%",
      art: "heart",
      notice: "A quiet pattern worth watching with kindness.",
      try: "Name one moment you noticed — not the outcome.",
      reflect: "What felt true in your home this week?",
      relatedId: "personality",
    }
  );
}

export function allChapterMeta(): typeof META {
  return META;
}
