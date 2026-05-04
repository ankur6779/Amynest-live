// Infant Hub — Research-based content for parents of children 0–24 months.
// Inspired by AAP, WHO, and pediatric development literature.
// All content is guidance only — never medical diagnosis.

export type InfantCategory =
  | "sleep"
  | "feeding"
  | "development"
  | "behavior"
  | "daily_care";

export type Lang = "en";

export type LocalizedText = { en: string };

export type InfantTip = {
  id: string;
  category: InfantCategory;
  /** inclusive lower bound in months */
  fromMonths: number;
  /** exclusive upper bound in months */
  toMonths: number;
  emoji: string;
  title: LocalizedText;
  body: LocalizedText;
  /** Pediatric source family — for transparency, never shown as medical claim */
  sourceType:
    | "pediatric_guideline"
    | "who_growth"
    | "aap_safe_sleep"
    | "developmental_milestone"
    | "general_care";
};

export const INFANT_CATEGORIES: {
  key: InfantCategory;
  emoji: string;
  label: LocalizedText;
}[] = [
  {
    key: "sleep",
    emoji: "💤",
    label: { en: "Sleep" },
  },
  {
    key: "feeding",
    emoji: "🍼",
    label: { en: "Feeding" },
  },
  {
    key: "development",
    emoji: "👶",
    label: { en: "Development" },
  },
  {
    key: "behavior",
    emoji: "🧠",
    label: { en: "Behavior" },
  },
  {
    key: "daily_care",
    emoji: "❤️",
    label: { en: "Daily Care" },
  },
];

// ─── Tips dataset ────────────────────────────────────────────────────────────
// Age windows: 0–3m, 3–6m, 6–12m, 12–24m
// Keep each tip short, clear, actionable. No medical diagnosis language.

export const INFANT_TIPS: InfantTip[] = [
  // ── SLEEP ────────────────────────────────────────────────────────────────
  {
    id: "sleep_0_3_total",
    category: "sleep",
    fromMonths: 0, toMonths: 3, emoji: "😴",
    title: {
      en: "Total sleep: 14–17 hrs/day",
    },
    body: {
      en: "Newborns sleep in short stretches of 2–4 hours, day and night. Wake them gently to feed if they sleep more than 4 hrs in early weeks.",
    },
    sourceType: "aap_safe_sleep",
  },
  {
    id: "sleep_0_3_back",
    category: "sleep",
    fromMonths: 0, toMonths: 3, emoji: "🛌",
    title: {
      en: "Always place baby on back",
    },
    body: {
      en: "Place baby on their back on a firm, flat surface. No pillows, blankets or soft toys in the crib — this lowers SIDS risk.",
    },
    sourceType: "aap_safe_sleep",
  },
  {
    id: "sleep_3_6_window",
    category: "sleep",
    fromMonths: 3, toMonths: 6, emoji: "⏰",
    title: {
      en: "Wake window: 1.5–2 hrs",
    },
    body: {
      en: "Watch for sleepy cues — yawning, eye rubbing, staring. Putting baby down before overtiredness makes naps easier.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "sleep_3_6_naps",
    category: "sleep",
    fromMonths: 3, toMonths: 6, emoji: "🌙",
    title: {
      en: "3–4 naps per day",
    },
    body: {
      en: "Most babies need 3–4 naps totaling 3–5 hrs of day sleep. A short bedtime routine (bath, feed, lullaby) helps signal night sleep.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "sleep_6_12_naps",
    category: "sleep",
    fromMonths: 6, toMonths: 12, emoji: "💤",
    title: {
      en: "2–3 naps daily",
    },
    body: {
      en: "Most 6–12 month babies need 2–3 naps and 11–12 hrs of night sleep. Keep a consistent bedtime within a 30-min window.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "sleep_12_24_one_nap",
    category: "sleep",
    fromMonths: 12, toMonths: 24, emoji: "🛏️",
    title: {
      en: "Transition to 1 nap",
    },
    body: {
      en: "Around 15–18 months toddlers usually shift from 2 naps to 1 longer afternoon nap (1.5–3 hrs). Total sleep: 11–14 hrs.",
    },
    sourceType: "pediatric_guideline",
  },

  // ── FEEDING ──────────────────────────────────────────────────────────────
  {
    id: "feed_0_3_demand",
    category: "feeding",
    fromMonths: 0, toMonths: 3, emoji: "🤱",
    title: {
      en: "Feed every 2–3 hours",
    },
    body: {
      en: "Newborns feed 8–12 times in 24 hrs. Watch for hunger cues — rooting, sucking hands, smacking lips. Crying is a late sign.",
    },
    sourceType: "who_growth",
  },
  {
    id: "feed_0_6_breast",
    category: "feeding",
    fromMonths: 0, toMonths: 6, emoji: "💗",
    title: {
      en: "Exclusive breastfeeding 0–6 mo",
    },
    body: {
      en: "WHO recommends exclusive breastfeeding for the first 6 months — no water, juice or solids. It builds immunity and bonding.",
    },
    sourceType: "who_growth",
  },
  {
    id: "feed_6_solids",
    category: "feeding",
    fromMonths: 6, toMonths: 9, emoji: "🥣",
    title: {
      en: "6 months: start semi-solids",
    },
    body: {
      en: "Begin with single-grain purees (rice, dal, ragi) and mashed fruits (banana, apple). Continue breast/formula milk as main feed.",
    },
    sourceType: "who_growth",
  },
  {
    id: "feed_6_12_finger",
    category: "feeding",
    fromMonths: 6, toMonths: 12, emoji: "🍌",
    title: {
      en: "Try soft finger foods",
    },
    body: {
      en: "Around 8–9 months offer soft pieces — banana, paneer, well-cooked vegetables. Always supervise to prevent choking.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "feed_12_24_family",
    category: "feeding",
    fromMonths: 12, toMonths: 24, emoji: "🍽️",
    title: {
      en: "3 meals + 2 snacks daily",
    },
    body: {
      en: "Toddlers can join family meals — rice, dal, sabzi, roti in small soft pieces. Avoid added salt, sugar and honey before 1 year.",
    },
    sourceType: "pediatric_guideline",
  },

  // ── DEVELOPMENT ──────────────────────────────────────────────────────────
  {
    id: "dev_0_3_eye",
    category: "development",
    fromMonths: 0, toMonths: 3, emoji: "👀",
    title: {
      en: "Milestone: eye contact",
    },
    body: {
      en: "By 6–8 weeks most babies make eye contact and respond with a social smile. Hold them 8–12 inches from your face — that's their focus range.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "dev_3_6_roll",
    category: "development",
    fromMonths: 3, toMonths: 6, emoji: "🔄",
    title: {
      en: "Milestone: rolling over",
    },
    body: {
      en: "Most babies roll tummy-to-back by 4 months and back-to-tummy by 6 months. Daily tummy time (10–15 min) builds the strength.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "dev_6_9_sit",
    category: "development",
    fromMonths: 6, toMonths: 9, emoji: "🪑",
    title: {
      en: "Milestone: sitting up",
    },
    body: {
      en: "Most babies sit with support by 6 mo and without support by 8–9 mo. Place toys just out of reach to encourage trunk control.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "dev_9_12_crawl",
    category: "development",
    fromMonths: 9, toMonths: 12, emoji: "🚼",
    title: {
      en: "Milestone: crawling",
    },
    body: {
      en: "Crawling typically appears between 7–10 months. Some babies skip it and go straight to standing — both are normal. Babyproof corners now.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "dev_12_18_walk",
    category: "development",
    fromMonths: 12, toMonths: 18, emoji: "🚶",
    title: {
      en: "Milestone: first steps",
    },
    body: {
      en: "Most babies walk independently between 12–15 months — but anywhere from 9 to 18 months is normal. Bare feet on safe floors helps balance.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "dev_12_24_words",
    category: "development",
    fromMonths: 12, toMonths: 24, emoji: "🗣️",
    title: {
      en: "Milestone: first words",
    },
    body: {
      en: "By 12 mo: 1–3 words. By 18 mo: 10–20 words. By 24 mo: 2-word phrases. Talk, read and sing every day — narration builds vocabulary.",
    },
    sourceType: "developmental_milestone",
  },

  // ── BEHAVIOR ─────────────────────────────────────────────────────────────
  {
    id: "beh_0_3_cry",
    category: "behavior",
    fromMonths: 0, toMonths: 3, emoji: "😢",
    title: {
      en: "Crying decoder",
    },
    body: {
      en: "Most likely causes: hunger, dirty nappy, gas, tiredness, overstimulation. Try the 5 S's — swaddle, side-position, shush, swing, suck.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "beh_3_6_overstim",
    category: "behavior",
    fromMonths: 3, toMonths: 6, emoji: "🌒",
    title: {
      en: "Overstimulation signs",
    },
    body: {
      en: "If baby turns face away, arches back or fusses suddenly — they need a calm break. Dim lights, quiet voice, gentle rocking helps reset.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "beh_6_12_separation",
    category: "behavior",
    fromMonths: 6, toMonths: 12, emoji: "🤗",
    title: {
      en: "Separation anxiety is normal",
    },
    body: {
      en: "Around 8–10 months babies cry when you leave — this shows healthy attachment. Always say a calm goodbye; sneaking out increases anxiety.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "beh_12_24_tantrum",
    category: "behavior",
    fromMonths: 12, toMonths: 24, emoji: "🌊",
    title: {
      en: "Tantrums = big feelings",
    },
    body: {
      en: "Toddlers don't have words for big feelings yet. Stay close and calm, name the feeling: 'You feel angry — that's okay.' Reasoning comes later.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "beh_12_24_no",
    category: "behavior",
    fromMonths: 12, toMonths: 24, emoji: "🚫",
    title: {
      en: "Saying 'no' is healthy",
    },
    body: {
      en: "When a toddler says no, they're testing autonomy — not defying you. Offer simple choices: 'Red shirt or blue shirt?' to give safe control.",
    },
    sourceType: "developmental_milestone",
  },

  // ── DAILY CARE ───────────────────────────────────────────────────────────
  {
    id: "care_0_6_bath",
    category: "daily_care",
    fromMonths: 0, toMonths: 6, emoji: "🛁",
    title: {
      en: "Bathing: 2–3 times a week",
    },
    body: {
      en: "Newborn skin is delicate. Use lukewarm water (37°C), mild fragrance-free cleanser, no longer than 5–10 minutes. Pat dry, don't rub.",
    },
    sourceType: "general_care",
  },
  {
    id: "care_0_24_skin",
    category: "daily_care",
    fromMonths: 0, toMonths: 24, emoji: "🧴",
    title: {
      en: "Daily moisturizing helps",
    },
    body: {
      en: "Massage with light, fragrance-free oil or lotion after bath. Helps skin barrier and is a beautiful bonding ritual.",
    },
    sourceType: "general_care",
  },
  {
    id: "care_0_24_safe",
    category: "daily_care",
    fromMonths: 0, toMonths: 24, emoji: "🛡️",
    title: {
      en: "Safe environment basics",
    },
    body: {
      en: "No smoking near baby. Room temperature 20–22°C. Cover plug points. Once mobile, install gates on stairs and lock low cabinets.",
    },
    sourceType: "general_care",
  },
  {
    id: "care_6_24_teeth",
    category: "daily_care",
    fromMonths: 6, toMonths: 24, emoji: "🦷",
    title: {
      en: "Clean gums and first teeth",
    },
    body: {
      en: "From 6 mo, wipe gums with a clean wet cloth twice daily. Once teeth appear, use a soft baby brush with a rice-grain dab of fluoride paste.",
    },
    sourceType: "general_care",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function pickLang<T extends { en: string }>(
  text: T,
  _lang?: Lang,
): string {
  return text.en;
}

export function getTipsForAge(
  ageMonths: number,
  category: InfantCategory,
): InfantTip[] {
  return INFANT_TIPS.filter(
    (t) =>
      t.category === category &&
      ageMonths >= t.fromMonths &&
      ageMonths < t.toMonths,
  );
}

export type AmyInsight = LocalizedText & { emoji: string };

/**
 * Generate the contextual "Amy AI Suggests" line per category, deterministic
 * based on age in months. No API call — pure pattern matching on dev windows.
 */
export function getAmyInsight(
  ageMonths: number,
  category: InfantCategory,
): AmyInsight {
  switch (category) {
    case "sleep": {
      const wakeWindow =
        ageMonths < 3 ? 60 : ageMonths < 6 ? 105 : ageMonths < 12 ? 150 : 240;
      return {
        emoji: "💤",
        en: `Your baby's next sleep window is in about ${wakeWindow} mins of awake time.`,
      };
    }
    case "feeding": {
      if (ageMonths < 6) {
        return {
          emoji: "🍼",
          en: "Under 6 months — exclusive breast/formula milk is enough. No water needed.",
        };
      }
      if (ageMonths < 9) {
        return {
          emoji: "🥣",
          en: "Time to introduce single-grain purees and mashed fruit, slowly one new food at a time.",
        };
      }
      if (ageMonths < 12) {
        return {
          emoji: "🍌",
          en: "Soft finger foods are great now — paneer cubes, banana, well-cooked veg. Always supervise.",
        };
      }
      return {
        emoji: "🍽️",
        en: "Toddler can join family meals — soft, low-salt, low-sugar versions of what you eat.",
      };
    }
    case "development": {
      if (ageMonths < 3) {
        return {
          emoji: "👀",
          en: "Watch for first social smile and eye contact in the next few weeks.",
        };
      }
      if (ageMonths < 6) {
        return {
          emoji: "🔄",
          en: "Rolling over is the milestone to watch for now. Daily tummy time helps.",
        };
      }
      if (ageMonths < 9) {
        return {
          emoji: "🪑",
          en: "Sitting without support is the next milestone. Place toys just out of reach.",
        };
      }
      if (ageMonths < 12) {
        return {
          emoji: "🚼",
          en: "Crawling and pulling to stand are this window. Babyproof low corners now.",
        };
      }
      if (ageMonths < 18) {
        return {
          emoji: "🚶",
          en: "First steps and first words are appearing. Read and narrate every day.",
        };
      }
      return {
        emoji: "🗣️",
        en: "Vocabulary is growing fast. Aim for short sentences in your home language.",
      };
    }
    case "behavior": {
      if (ageMonths < 3) {
        return {
          emoji: "😢",
          en: "Most likely cause of crying: hunger or tiredness. Try a calm feed or swaddle.",
        };
      }
      if (ageMonths < 9) {
        return {
          emoji: "🌒",
          en: "Your baby may be overstimulated — reduce noise and light before sleep.",
        };
      }
      if (ageMonths < 12) {
        return {
          emoji: "🤗",
          en: "Separation anxiety is healthy at this age. Always say a calm goodbye.",
        };
      }
      return {
        emoji: "🌊",
        en: "Tantrums are big feelings without words yet. Stay close, name the feeling.",
      };
    }
    case "daily_care": {
      if (ageMonths < 6) {
        return {
          emoji: "🛁",
          en: "Bathe 2–3 times a week with lukewarm water and a fragrance-free cleanser.",
        };
      }
      if (ageMonths < 12) {
        return {
          emoji: "🦷",
          en: "Wipe gums daily; once teeth appear, use a soft baby brush with rice-grain paste.",
        };
      }
      return {
        emoji: "🛡️",
        en: "Now mobile — install stair gates, lock cabinets, cover plug points.",
      };
    }
  }
}

/** Convenience: is the child within the infant-hub age window (≤24 months)? */
export function isInfantHubAge(ageMonths: number): boolean {
  return ageMonths >= 0 && ageMonths < 24;
}

// ─── Parent-Hub-parity data (vaccinations, milestones, cues, sounds, etc.) ──
// See `./parentHub.ts` for the full set of accessors and types used by the
// mobile InfantHub featured card to match the web Parent Hub surface.
export * from "./parentHub";

// Pure-JS WAV synth used by mobile InfantSoundsTab to play the white-noise
// catalogue without bundling audio assets.
export * from "./audioSynth";
