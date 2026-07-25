/**
 * Ultra-deep insight narratives for Amy Astro Intelligence.
 * Composed from Sun / Moon / Rising — reflective storytelling, not prediction.
 * Bump DEEP_INSIGHTS_CONTENT_VERSION when copy structure changes.
 */

export const DEEP_INSIGHTS_CONTENT_VERSION = "amy_astro_insights/3.0.0" as const;

export type InsightSectionId =
  | "personality"
  | "strengths"
  | "hidden_talents"
  | "learning"
  | "thinking"
  | "communication"
  | "creativity"
  | "leadership"
  | "relationships"
  | "emotional"
  | "confidence"
  | "parenting"
  | "life_purpose"
  | "career"
  | "health_awareness"
  | "spiritual"
  | "growth"
  | "lucky_symbols"
  | "planet_strengths"
  | "planet_soft_spots"
  | "house_themes"
  | "nakshatra"
  | "planet_combinations"
  | "yogas_cultural"
  | "family_dynamics"
  | "reflection"
  | "life_themes";

export type InsightSection = {
  id: InsightSectionId;
  title: string;
  eyebrow: string;
  tags: string[];
  body: string;
};

type SignPack = {
  essence: string;
  warmth: string;
  learning: string;
  emotion: string;
  growth: string;
  symbols: string[];
};

const SIGN_PACKS: Record<string, SignPack> = {
  Aries: {
    essence:
      "There is a bright spark of initiative here — a child who often meets the world with forward motion, curiosity, and a natural courage to try.",
    warmth:
      "Warmth shows up as enthusiasm. When they feel safe, they light up rooms with energy rather than volume alone.",
    learning:
      "Learning thrives with short, vivid challenges and clear wins. Movement, games, and first-try bravery help knowledge stick.",
    emotion:
      "Feelings can arrive quickly and leave like weather. They benefit when adults name the storm without shaming the thunder.",
    growth:
      "Growth softens when patience is practiced as a skill, not a punishment — waiting becomes another kind of bravery.",
    symbols: ["sunrise red", "flame motif", "iron / steel accents", "east-facing light"],
  },
  Taurus: {
    essence:
      "There is a steady, sensory intelligence here — a child who often builds security through rhythm, touch, beauty, and reliable affection.",
    warmth:
      "Warmth is tangible: soft textures, familiar foods, unhurried presence. Love feels real when it is consistent.",
    learning:
      "Learning deepens through repetition and hands-on experience. They remember what they can touch, taste, and calmly practice.",
    emotion:
      "Emotions may move slowly but root deeply. Sudden change can feel louder than it looks from the outside.",
    growth:
      "Growth opens when flexibility is invited gently — tiny variations inside a safe routine, never forced upheaval.",
    symbols: ["garden green", "rose quartz calm", "earth tones", "morning light on wood"],
  },
  Gemini: {
    essence:
      "There is a quicksilver mind here — a child who connects ideas, people, and questions with lively curiosity.",
    warmth:
      "Warmth often arrives as conversation, jokes, shared discovery, and the joy of being interesting together.",
    learning:
      "Learning loves variety: stories, dialogues, switches between modes. Boredom is often a signal for freshness, not defiance.",
    emotion:
      "Feelings may be narrated more than sunk into. Helping them stay with one feeling for a breath builds emotional literacy.",
    growth:
      "Growth ripens when depth is celebrated as much as breadth — finishing a thread becomes a quiet triumph.",
    symbols: ["butterfly yellow", "twin motifs", "books & breezes", "morning birdsong"],
  },
  Cancer: {
    essence:
      "There is a tidal emotional intelligence here — a child who often senses atmospheres and bonds with fierce tenderness.",
    warmth:
      "Warmth is sanctuary: private rituals, soft voices, and knowing someone will still be there after hard moments.",
    learning:
      "Learning settles in safe relationships. They absorb more when the tutor feels like a protector, not a critic.",
    emotion:
      "Feelings can be oceanic. Moods are information about belonging, not flaws to erase.",
    growth:
      "Growth strengthens when they practice brave honesty outside the shell — one true sentence at a time.",
    symbols: ["silver moon", "shell & water", "pearl white", "night-lamp glow"],
  },
  Leo: {
    essence:
      "There is a radiant creative center here — a child who often blossoms when seen, celebrated, and invited to shine kindly.",
    warmth:
      "Warmth is applause with sincerity, play with heart, and adults who mirror their courage without stealing the stage.",
    learning:
      "Learning lights up through performance, storytelling, and proud demonstration. Dignity matters as much as accuracy.",
    emotion:
      "Pride and vulnerability travel together. Rejection can sting the heart more than the ego.",
    growth:
      "Growth matures when they learn to share the spotlight — generosity becomes part of their glow.",
    symbols: ["sun gold", "lion motif", "amber light", "stage warmth"],
  },
  Virgo: {
    essence:
      "There is a precise, caring intelligence here — a child who notices details, improves systems, and wants things to feel right.",
    warmth:
      "Warmth looks like helpfulness: fixing, organizing, checking. Love is often practical before it is poetic.",
    learning:
      "Learning thrives with clear steps, tidy feedback, and mastery loops. Chaos drains them faster than difficulty.",
    emotion:
      "They may self-critique early. Adults who praise process over perfection protect their inner quiet.",
    growth:
      "Growth softens perfectionism into craftsmanship — good enough can also be beautiful.",
    symbols: ["harvest wheat", "clean linen", "herb green", "morning checklist calm"],
  },
  Libra: {
    essence:
      "There is a relational grace here — a child who often seeks harmony, fairness, and beauty in how people treat each other.",
    warmth:
      "Warmth is balance: shared decisions, pretty spaces, and voices that stay kind even in disagreement.",
    learning:
      "Learning prefers dialogue, partnership, and aesthetic clarity. Ugly conflict in the room can mute their brilliance.",
    emotion:
      "They may postpone their own needs to keep peace. Helping them name a preference is emotional gold.",
    growth:
      "Growth arrives when they practice gentle firmness — harmony that includes their truth.",
    symbols: ["rose gold scales", "soft blush", "symmetrical art", "evening pastel sky"],
  },
  Scorpio: {
    essence:
      "There is a deep-focus intensity here — a child who feels loyalties strongly and sees beneath surfaces.",
    warmth:
      "Warmth is trust earned slowly: privacy respected, secrets held, emotions met without flinching.",
    learning:
      "Learning prefers meaningful puzzles and honest answers. Superficial tasks may bore them into silence.",
    emotion:
      "Feelings can be private and powerful. Forced cheerfulness feels false; quiet presence feels safe.",
    growth:
      "Growth transforms when they practice safe release — words, art, or movement that lets intensity move through.",
    symbols: ["obsidian", "deep crimson", "phoenix motif", "candle in dark water"],
  },
  Sagittarius: {
    essence:
      "There is an adventuring mind here — a child who reaches for meaning, humor, and horizons beyond the familiar.",
    warmth:
      "Warmth is freedom with belonging: big stories, outdoor air, adults who laugh and explore with them.",
    learning:
      "Learning loves purpose and big pictures. “Why does this matter?” is not defiance — it is their engine.",
    emotion:
      "They may outrun tender feelings with jokes. Slowing for honesty keeps the heart included in the journey.",
    growth:
      "Growth deepens when curiosity includes other people’s maps, not only their own north star.",
    symbols: ["sky blue arrow", "travel stamps", "campfire gold", "open road light"],
  },
  Capricorn: {
    essence:
      "There is a quiet ambition here — a child who often builds competence patiently and takes responsibility seriously.",
    warmth:
      "Warmth is reliability: promises kept, respect shown, adults who treat their efforts as meaningful.",
    learning:
      "Learning climbs step by step. Clear milestones and earned pride outperform pep talks.",
    emotion:
      "They may look composed while carrying a lot. Soft check-ins unlock the feelings under the armor.",
    growth:
      "Growth lightens when play is scheduled like duty — joy becomes part of their discipline.",
    symbols: ["mountain stone", "charcoal & gold", "clock tower calm", "winter evergreen"],
  },
  Aquarius: {
    essence:
      "There is an original, future-facing mind here — a child who often thinks sideways and cares about fairness for the group.",
    warmth:
      "Warmth can look cool at first: friendship, ideas, shared causes. Intimacy arrives through respect for their difference.",
    learning:
      "Learning loves experiments, tech, and unconventional paths. Rigid sameness can feel like a cage.",
    emotion:
      "They may intellectualize feelings. Body-based calm (breath, walk, music) helps emotion catch up to insight.",
    growth:
      "Growth humanizes when they practice one-to-one tenderness alongside big ideals.",
    symbols: ["electric violet", "star network", "silver circuit", "dawn after night"],
  },
  Pisces: {
    essence:
      "There is a porous, imaginative soul here — a child who dreams vividly and absorbs the emotional weather of rooms.",
    warmth:
      "Warmth is gentle myth: stories, music, water play, and adults who protect their sensitivity as a gift.",
    learning:
      "Learning arrives through image, metaphor, and feeling. Dry drills need a story wrapper to bloom.",
    emotion:
      "Boundaries blur easily. Helping them know what is theirs vs. another’s feeling is lifelong medicine.",
    growth:
      "Growth clarifies when imagination is paired with small, doable anchors in the real day.",
    symbols: ["seafoam & pearl", "dream indigo", "fish motif", "rain on glass"],
  },
};

function pack(sign: string): SignPack {
  return SIGN_PACKS[sign] ?? SIGN_PACKS.Cancer!;
}

function composeLong(
  childName: string,
  paragraphs: string[],
): string {
  const name = childName.trim() || "your child";
  const joined = paragraphs
    .map((p) => p.replace(/\{\{name\}\}/g, name))
    .join("\n\n");
  const disclaimer =
    "\n\nThis is for awareness and reflection, not prediction — never diagnosis, never destiny.";
  const expansion =
    `\n\nAs ${name} grows, keep a soft notebook of moments: the laugh that arrives without prompting, the silence that means safety, the task they return to when nobody is watching. ` +
    `One quiet strength that often appears only after trust is the most reliable “chart” you will ever hold. ` +
    `Use these chapters as lanterns. Keep what feels true in your home; release the rest with kindness.`;
  return joined + expansion + disclaimer;
}

export function buildDeepInsightSections(input: {
  childName: string;
  sunSign: string;
  moonSign: string;
  risingSign: string | null;
  moonPhaseLabel: string;
  daySky: boolean;
}): InsightSection[] {
  const { childName, sunSign, moonSign, risingSign, moonPhaseLabel, daySky } = input;
  const sun = pack(sunSign);
  const moon = pack(moonSign);
  const rise = risingSign ? pack(risingSign) : null;
  const name = childName.trim() || "your child";

  const sections: InsightSection[] = [
    {
      id: "personality",
      title: "The Gentle Heart",
      eyebrow: "Chapter",
      tags: [sunSign, moonSign, ...(risingSign ? [risingSign] : [])],
      body: composeLong(name, [
        `You may notice a climate around ${name} long before anyone names it. Daylight themes associated with ${sunSign} often feel like this: ${sun.essence}`,
        `The moments when ${name} feels safest often echo ${moonSign} weather. ${moon.warmth} Together, these skies describe a conversation — how they step forward, and how they come home to themselves.`,
        rise
          ? `As your child grows, the first doorway others meet may carry ${risingSign} coloring. ${rise.essence} Think of Rising as a soft greeting — never a script.`
          : `Because birth time is not set, we leave Rising quietly closed. You still have a rich day-and-moon portrait — no invented doorway, no pressure to “complete” a chart.`,
        `None of this freezes ${name} into a type. Children are living constellations — changing with sleep, safety, culture, and love. Keep only what helps you parent with more patience.`,
      ]),
    },
    {
      id: "strengths",
      title: "Lights Already Softly On",
      eyebrow: "Chapter",
      tags: ["Strengths", sunSign],
      body: composeLong(name, [
        `One quiet strength that often appears around ${sunSign} daylight themes: ${sun.essence}`,
        `You may notice another brilliance in private: ${moon.emotion}`,
        `In daily life, strengths look ordinary before they look legendary — how ${name} recovers, the questions they ask, the kindness nobody scores. Celebrate those. Strength grows in witnessed sunlight, not comparison.`,
        `Your job is not to manufacture talent. It is to remove friction so natural strengths can breathe. When ${name} feels regulated and playfully challenged, these themes become easier to recognize in motion.`,
      ]),
    },
    {
      id: "hidden_talents",
      title: "Gifts Waiting in Quiet Rooms",
      eyebrow: "Chapter",
      tags: ["Talents", moonSign],
      body: composeLong(name, [
        `Hidden talents rarely announce themselves with a trumpet. With Moon in ${moonSign}, ${name} may hold gifts that appear first in private: ${moon.learning}`,
        `Sun in ${sunSign} can later give those private gifts a public form — when safety allows. ${sun.warmth}`,
        `Watch for “sideways excellence”: the hobby they return to without prompting, the problem they solve for a sibling, the story they tell in the dark. Those are talent seeds.`,
        `Protect the greenhouse. Premature performance pressure can bury a gift that needed another season of play.`,
      ]),
    },
    {
      id: "learning",
      title: "How Curiosity Begins",
      eyebrow: "Chapter",
      tags: ["Learning", sunSign, moonSign],
      body: composeLong(name, [
        `As ${name} grows, learning will feel less like drills and more like weather. Daylight rhythms (${sunSign}) often prefer: ${sun.learning}`,
        `The moments when learning feels safest often need ${moonSign} conditions: ${moon.learning}`,
        `Design study like a kindness: short arcs, sensory anchors, repair after frustration. If a method produces shame, it is the wrong method for today — not proof they “can’t.”`,
        `Ask yourself: When did learning feel like play this week? Repeat that condition more often than any worksheet.`,
      ]),
    },
    {
      id: "thinking",
      title: "The Mind's Quiet Path",
      eyebrow: "Chapter",
      tags: ["Thinking"],
      body: composeLong(name, [
        `Thinking style is the choreography between curiosity and caution. ${sun.essence}`,
        `Internally, Moon in ${moonSign} influences which thoughts feel safe to keep: ${moon.emotion}`,
        `Invite metacognition without interrogation: “What made that click?” “What felt sticky?” Those questions build a thinker who trusts their own process.`,
      ]),
    },
    {
      id: "communication",
      title: "The Voice They Are Growing Into",
      eyebrow: "Chapter",
      tags: ["Communication"],
      body: composeLong(name, [
        `${name} communicates in more channels than words — timing, silence, humor, proximity. Sun in ${sunSign} colors expression: ${sun.warmth}`,
        `Moon in ${moonSign} colors what they need to hear to feel received: ${moon.warmth}`,
        `Practice reflective listening: repeat the feeling before the fix. Children who feel accurately heard become adults who speak with less armor.`,
      ]),
    },
    {
      id: "creativity",
      title: "Where Imagination Lands",
      eyebrow: "Chapter",
      tags: ["Creativity"],
      body: composeLong(name, [
        `Creativity is how ${name} metabolizes the world. With ${moonPhaseLabel.toLowerCase()} Moon themes in the sky story, imagination may ebb and swell like tide — honor both the bright making days and the quiet gathering days.`,
        `${sun.essence} Give materials before instructions. Let mess be a draft, not a failure.`,
      ]),
    },
    {
      id: "leadership",
      title: "Influence Without Force",
      eyebrow: "Chapter",
      tags: ["Leadership"],
      body: composeLong(name, [
        `Leadership in childhood is often microscopic: who they include, how they negotiate turns, whether they comfort a friend. Sun in ${sunSign} hints at style: ${sun.essence}`,
        `Teach leadership as care, not dominance. The sky does not assign a throne — it invites stewardship.`,
      ]),
    },
    {
      id: "relationships",
      title: "Bonds That Soften Them",
      eyebrow: "Chapter",
      tags: ["Relationships", moonSign],
      body: composeLong(name, [
        `Attachment is the first astrology children can feel. Moon in ${moonSign} suggests comfort dialects: ${moon.warmth}`,
        `Friendships will teach repair. Coach apology as courage, not humiliation.`,
      ]),
    },
    {
      id: "emotional",
      title: "The Inner Weather",
      eyebrow: "Chapter",
      tags: ["Emotions", moonSign],
      body: composeLong(name, [
        `The moments when ${name} feels safest often reveal their emotional sky. With ${moonSign} themes: ${moon.emotion}`,
        `You may notice your own calm becoming their scaffolding. When you stay soft and steady, their nervous system borrows your weather.`,
        `Name feelings early, allow tears without panic, and treat emotional honesty as intelligence — never as inconvenience.`,
      ]),
    },
    {
      id: "confidence",
      title: "Standing in Their Own Light",
      eyebrow: "Chapter",
      tags: ["Confidence", sunSign],
      body: composeLong(name, [
        `Confidence grows from evidence, not pep talks alone. Sun in ${sunSign} thrives when: ${sun.warmth}`,
        `Collect proof jars: tiny wins written down. Shame shrinks in the presence of remembered competence.`,
      ]),
    },
    {
      id: "parenting",
      title: "How Love Can Meet Them",
      eyebrow: "Chapter",
      tags: ["Parenting"],
      body: composeLong(name, [
        `Parenting ${name} well is less about perfect technique and more about accurate attunement. From the Sun–Moon story: protect ${sun.growth.toLowerCase()} while honoring ${moon.growth.toLowerCase()}`,
        `Practical rhythm: connect before correct; preview transitions; repair quickly after rupture. The sky story supports reflection — you remain the living guide.`,
        daySky
          ? `Day Sky reminder: without birth time, keep Rising interpretations offline. Precision can wait; love cannot.`
          : `With birth time present, Rising themes may inform first impressions — still optional, still non-deterministic.`,
      ]),
    },
    {
      id: "life_purpose",
      title: "Meaning, Not Mandate",
      eyebrow: "Meaning, not mandate",
      tags: ["Purpose"],
      body: composeLong(name, [
        `Purpose themes are invitations, not assignments. For ${name}, daylight purpose tones echo ${sunSign}: ${sun.essence}`,
        `Inner purpose tones echo ${moonSign}: ${moon.essence}`,
        `Let ${name} collect many possible futures. Purpose clarifies through lived joy and service, not early branding.`,
      ]),
    },
    {
      id: "career",
      title: "Interest Climates",
      eyebrow: "Interest climates",
      tags: ["Interests"],
      body: composeLong(name, [
        `Career talk for children should stay playful. Inclinations are climates of interest — environments where ${name} might feel alive — never a fixed job title written in the stars.`,
        `Sun in ${sunSign} may enjoy arenas that reward ${sun.learning.toLowerCase()} Moon in ${moonSign} needs workplaces (someday) that respect ${moon.warmth.toLowerCase()}`,
        `Today’s job is exposure and curiosity, not specialization under pressure.`,
      ]),
    },
    {
      id: "health_awareness",
      title: "Care, Not Diagnosis",
      eyebrow: "Care, not diagnosis",
      tags: ["Wellbeing"],
      body: composeLong(name, [
        `This section is wellness awareness only — never medical advice or diagnosis. Notice sleep, food rhythm, outdoor light, and nervous-system load.`,
        `Sun/Moon stories remind us that ${name} may need both activation (${sunSign} daylight) and restoration (${moonSign} moonlight). Balance effort with recovery.`,
        `If anything concerns you medically, ask a clinician — the sky is not a doctor.`,
      ]),
    },
    {
      id: "spiritual",
      title: "Wonder & Meaning",
      eyebrow: "Wonder & meaning",
      tags: ["Spirit"],
      body: composeLong(name, [
        `Spiritual tendency here means capacity for wonder, reverence, and quiet meaning — across any tradition your family holds, or none.`,
        `Moon-phase framing (${moonPhaseLabel}) can be a family ritual metaphor: gathering, fullness, release — never superstition as control.`,
      ]),
    },
    {
      id: "growth",
      title: "Gentle Edges",
      eyebrow: "Gentle edges",
      tags: ["Growth"],
      body: composeLong(name, [
        `Growth edges are places for compassion, not criticism. Sun growth: ${sun.growth}`,
        `Moon growth: ${moon.growth}`,
        rise ? `Rising growth doorway: ${rise.growth}` : `Rising growth awaits birth time if you choose to add it later.`,
      ]),
    },
    {
      id: "lucky_symbols",
      title: "Poetic Tokens",
      eyebrow: "Poetic tokens",
      tags: ["Symbols"],
      body: composeLong(name, [
        `Symbols are poetry, not power objects that guarantee outcomes. Families sometimes enjoy motifs as bonding aesthetics.`,
        `From ${sunSign}: ${sun.symbols.join(", ")}. From ${moonSign}: ${moon.symbols.join(", ")}.`,
        `Use them in art, bedtime stories, or room accents if they delight you — never as fear-based rules.`,
      ]),
    },
    {
      id: "planet_strengths",
      title: "Where Light Feels Steady",
      eyebrow: "Dignity language",
      tags: ["Graha", "Cultural"],
      body: composeLong(name, [
        `In cultural astrology language, “strength” describes symbolic emphasis — not scientific force and not fixed fate.`,
        `Sun in ${sunSign} can be read as a dignified daylight theme when parents notice vitality, pride, and creative heat showing up in healthy ways.`,
        `Moon in ${moonSign} can be read as emotional intelligence strength when care, memory, and bonding are honored.`,
        `Treat dignity talk as vocabulary for reflection. If a traditional reader uses Shadbala or exaltation terms, ask them to explain gently — and keep AmyNest’s boundary: awareness, not prediction.`,
      ]),
    },
    {
      id: "planet_soft_spots",
      title: "Where Softness Needs Care",
      eyebrow: "Sensitivity, not weakness",
      tags: ["Graha", "Cultural"],
      body: composeLong(name, [
        `Soft spots are places needing more support, not proof of defect. Every chart — and every child — has tender zones.`,
        `For ${name}, soft spots may appear when Sun themes (${sunSign}) meet stress without rest, or when Moon themes (${moonSign}) meet abrupt change.`,
        `Parent move: reduce shame, increase scaffolding, celebrate repair.`,
      ]),
    },
    {
      id: "house_themes",
      title: "Rooms of a Life",
      eyebrow: daySky ? "Waiting on birth time" : "Life areas (symbolic)",
      tags: ["Bhava"],
      body: composeLong(name, [
        daySky
          ? `House (bhava) analysis needs a reliable birth time. Your Day Sky remains complete and beautiful without it. If you add time later, house themes can unlock as optional cultural structure — still never destiny.`
          : `With Rising in ${risingSign ?? "—"}, traditional house frameworks may be discussed as symbolic life-area lenses (self, family, learning, creativity, etc.). AmyNest presents this as cultural literacy, not engineered fate.`,
        `If you explore houses with a practitioner, insist on non-fearful language and parent agency.`,
      ]),
    },
    {
      id: "nakshatra",
      title: "A Lunar Mansion Story",
      eyebrow: "Lunar mansion poetry",
      tags: ["Nakshatra", "Cultural", moonSign],
      body: composeLong(name, [
        `You may hear the word nakshatra — a traditional lunar mansion story keyed to where the Moon rested. AmyNest treats it as cultural poetry, never as scientific proof.`,
        `With a ${moonPhaseLabel.toLowerCase()} Moon in ${moonSign}, families sometimes use mansion lore as a bedtime metaphor for belonging and rhythm.`,
        `If a practitioner names a mansion, ask them to translate it into parenting language: What should I notice? What should I never fear? Keep agency in your hands.`,
      ]),
    },
    {
      id: "planet_combinations",
      title: "How the Lights Converse",
      eyebrow: "How lights converse",
      tags: [sunSign, moonSign, "Combination"],
      body: composeLong(name, [
        `One quiet pattern worth watching is the conversation between daylight (${sunSign}) and inner weather (${moonSign}).`,
        `You may notice ${name} looks bold in public and tender in private — or the reverse. Combinations are invitations to curiosity, not equations that lock a personality.`,
        risingSign
          ? `Rising ${risingSign} can soften or brighten first contact. Still optional. Still non-deterministic.`
          : `Without Rising, enjoy the Sun–Moon duet as a complete Day Sky story.`,
      ]),
    },
    {
      id: "yogas_cultural",
      title: "Pattern Poems",
      eyebrow: "Pattern poetry",
      tags: ["Yoga", "Cultural"],
      body: composeLong(name, [
        `Yogas in classical literature are pattern poems — combinations storytellers used to talk about emphasis. They are not scientific proofs and must never be used to frighten families.`,
        `Amy Astro Intelligence does not invent rare yogas from incomplete data. Instead, we invite you to notice combination themes already present: Sun–Moon dialogue (${sunSign} / ${moonSign})${risingSign ? ` with Rising ${risingSign}` : ""}.`,
        `If a yoga name appears in conversation elsewhere, translate it back into parenting language: support, curiosity, and care.`,
      ]),
    },
    {
      id: "family_dynamics",
      title: "The Room Around Them",
      eyebrow: "The room around the child",
      tags: ["Family", moonSign],
      body: composeLong(name, [
        `As ${name} grows, the family room becomes part of their sky. ${moon.warmth}`,
        `You may notice that when adults repair quickly after conflict, ${name}'s nervous system learns that love can bend without breaking.`,
        `Parenting suggestions here are gentle: narrate feelings, keep rituals small and reliable, protect sleep like treasure. The chart does not assign family roles — love does.`,
      ]),
    },
    {
      id: "reflection",
      title: "A Closing Lantern",
      eyebrow: "A closing lantern",
      tags: ["Reflect"],
      body: composeLong(name, [
        `Before you leave this sky, pause with one question: What did I notice about ${name} this week that no chart could have told me?`,
        `Write it down. That sentence is more precious than any yoga name.`,
        `Return when you need wonder. Leave when you need simplicity. Both are wise parenting.`,
      ]),
    },
    {
      id: "life_themes",
      title: "The Longer Story",
      eyebrow: "The longer story",
      tags: ["Themes"],
      body: composeLong(name, [
        `Zooming out, you may sense recurring themes around ${name}: vitality and identity (${sunSign}), belonging and feeling (${moonSign})${risingSign ? `, first contact with the world (${risingSign})` : ""}.`,
        `Your family’s culture, values, and daily love will write the actual chapters. The sky is a preface — luminous, optional, unfinished on purpose.`,
        `Return to this module when you need wonder. Leave it when you need simplicity. Both are wise.`,
      ]),
    },
  ];

  return sections;
}
