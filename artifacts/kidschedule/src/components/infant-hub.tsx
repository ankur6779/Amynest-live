import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain, ThumbsUp, RotateCcw, CheckCircle2, ShieldAlert,
  ChevronDown, ChevronUp, Syringe, Heart, Zap, BookOpen,
  Activity, Star, AlertTriangle, Lightbulb, Baby,
  Moon, Sun, Clock, Flame,
} from "lucide-react";
import {
  INFANT_CATEGORIES,
  type InfantCategory,
  type Lang,
  getTipsForAge,
  getAmyInsight,
  pickLang,
} from "@workspace/infant-hub";
import { formatAge } from "@/lib/age-groups";
import { useToast } from "@/hooks/use-toast";

interface InfantHubProps {
  childName: string;
  ageMonths: number;
}

function langOf(i18nLang: string | undefined): Lang {
  if (i18nLang?.startsWith("hi") && !i18nLang.includes("ng")) return "hi";
  if (i18nLang === "hinglish" || i18nLang?.startsWith("hin")) return "hin";
  return "en";
}

// ─── Sub-band helper ─────────────────────────────────────────────────────────
function getBand(months: number): "0-3" | "3-6" | "6-9" | "9-12" | "12-18" | "18-24" {
  if (months < 3) return "0-3";
  if (months < 6) return "3-6";
  if (months < 9) return "6-9";
  if (months < 12) return "9-12";
  if (months < 18) return "12-18";
  return "18-24";
}

// ─── Milestone Data ───────────────────────────────────────────────────────────
type Milestone = { id: string; label: string; delayAlert?: string };

const MILESTONES: Record<string, Milestone[]> = {
  "0-3": [
    { id: "m0_lift_head", label: "Lifts head briefly during tummy time" },
    { id: "m0_eye_track", label: "Eyes track a moving face or toy" },
    { id: "m0_social_smile", label: "Shows first social smile (by 6–8 wks)", delayAlert: "No social smile by 2 months — mention to paediatrician" },
    { id: "m0_coo", label: "Makes cooing / soft vowel sounds" },
    { id: "m0_voice_react", label: "Reacts to your voice by turning head" },
  ],
  "3-6": [
    { id: "m3_roll_front", label: "Rolls from tummy to back" },
    { id: "m3_laughs", label: "Laughs and squeals with delight" },
    { id: "m3_reach", label: "Reaches for and bats at objects", delayAlert: "Not reaching for objects by 5 months — worth a check-up" },
    { id: "m3_babble", label: "Babbles ('ba-ba', 'da-da' sounds)" },
    { id: "m3_head_steady", label: "Holds head steady without support" },
    { id: "m3_mirror", label: "Recognises self / others in mirror" },
  ],
  "6-9": [
    { id: "m6_sit", label: "Sits with minimal support", delayAlert: "Cannot sit with support by 9 months — discuss with doctor" },
    { id: "m6_solids", label: "Shows interest in solid foods" },
    { id: "m6_bye_wave", label: "Waves bye-bye when prompted" },
    { id: "m6_pass_hands", label: "Passes objects hand to hand" },
    { id: "m6_stranger", label: "Shows stranger anxiety (normal stage)" },
    { id: "m6_object_perm", label: "Looks for a toy when it's hidden" },
  ],
  "9-12": [
    { id: "m9_crawl", label: "Crawls or bottom-shuffles to move", delayAlert: "No movement method (crawl, roll, shuffle) by 12 months — mention to doctor" },
    { id: "m9_pull_stand", label: "Pulls to standing with support" },
    { id: "m9_pincer", label: "Uses pincer grip (thumb + forefinger)" },
    { id: "m9_mama_dada", label: "Says 'mama' / 'dada' meaningfully" },
    { id: "m9_points", label: "Points at interesting things" },
    { id: "m9_imitate", label: "Imitates simple gestures / actions" },
  ],
  "12-18": [
    { id: "m12_walk", label: "Walks independently (±3 months is normal)", delayAlert: "Not walking by 18 months — paediatrician visit recommended" },
    { id: "m12_words", label: "Says 5–10 single words meaningfully" },
    { id: "m12_commands", label: "Follows simple one-step commands" },
    { id: "m12_spoon", label: "Attempts to self-feed with a spoon" },
    { id: "m12_stack", label: "Stacks 2–3 blocks or cups" },
    { id: "m12_scribble", label: "Scribbles with a crayon" },
  ],
  "18-24": [
    { id: "m18_run", label: "Runs (though unsteadily)" },
    { id: "m18_words50", label: "Vocabulary of 20–50+ words", delayAlert: "Fewer than 15 words by 18 months — early speech evaluation recommended" },
    { id: "m18_two_word", label: "Begins two-word phrases ('more milk')" },
    { id: "m18_body_parts", label: "Points to 4–5 body parts when named" },
    { id: "m18_pretend", label: "Engages in simple pretend play" },
    { id: "m18_stairs", label: "Climbs stairs with support" },
  ],
};

// ─── Wake Windows ─────────────────────────────────────────────────────────────
type WakeWindowEntry = { range: string; window: string; naps: string; nightSleep: string };

function getWakeWindow(months: number): WakeWindowEntry {
  if (months < 1)  return { range: "0–1 month", window: "45–60 min", naps: "5–7 micro-naps", nightSleep: "8–9 hrs (interrupted)" };
  if (months < 2)  return { range: "1–2 months", window: "60–90 min", naps: "4–5 naps", nightSleep: "8–10 hrs (interrupted)" };
  if (months < 3)  return { range: "2–3 months", window: "1.5–2 hrs", naps: "4–5 naps", nightSleep: "10–11 hrs" };
  if (months < 5)  return { range: "3–5 months", window: "1.5–2.5 hrs", naps: "3–4 naps", nightSleep: "10–11 hrs" };
  if (months < 7)  return { range: "5–7 months", window: "2–2.5 hrs", naps: "3 naps", nightSleep: "11 hrs" };
  if (months < 9)  return { range: "7–9 months", window: "2.5–3 hrs", naps: "2–3 naps", nightSleep: "11 hrs" };
  if (months < 12) return { range: "9–12 months", window: "3–4 hrs", naps: "2 naps", nightSleep: "11 hrs" };
  if (months < 15) return { range: "12–15 months", window: "4–5 hrs", naps: "1–2 naps", nightSleep: "11–12 hrs" };
  if (months < 18) return { range: "15–18 months", window: "5–6 hrs", naps: "1 nap", nightSleep: "11–12 hrs" };
  return { range: "18–24 months", window: "5–6 hrs", naps: "1 nap (1.5–3 hrs)", nightSleep: "11–12 hrs" };
}

function getFeedingGuide(months: number): { type: string; freq: string; tip: string } {
  if (months < 6) return {
    type: "Breast milk / Formula only",
    freq: "Every 2–3 hrs · 8–12 times/day",
    tip: "Watch hunger cues — rooting, lip-smacking, sucking fists. Crying is a late hunger sign.",
  };
  if (months < 9) return {
    type: "Breast milk + Puree start (6 m+)",
    freq: "Breast 5–6×/day + 1–2 meals",
    tip: "Start single-ingredient purees: banana, carrot, sweet potato. No honey, salt or sugar before 12 months.",
  };
  if (months < 12) return {
    type: "Breast milk + Soft solids",
    freq: "Breast 4–5×/day + 2–3 meals",
    tip: "Introduce family textures slowly. Finger foods (soft): banana slices, soft dal pieces, khichdi.",
  };
  if (months < 18) return {
    type: "Family meals + Milk top-up",
    freq: "3 meals + 2 snacks · Milk 2–3×/day",
    tip: "Offer cow's milk (full fat) from 12 months. Serve small, soft portions of everything the family eats.",
  };
  return {
    type: "Full family meals",
    freq: "3 meals + 1–2 snacks",
    tip: "Self-feeding is great — let them make mess! Keeps 300–400 ml cow's milk/day for calcium.",
  };
}

// ─── Daily Activities ─────────────────────────────────────────────────────────
type Activity = { emoji: string; title: string; desc: string; duration: string };

const ACTIVITIES: Record<string, Activity[]> = {
  "0-3": [
    { emoji: "🤰", title: "Tummy Time", desc: "Place baby on tummy on a firm surface while awake & supervised. Start with 1–2 min, build to 10–15 min/day.", duration: "5–15 min" },
    { emoji: "🎵", title: "Sing & Talk", desc: "Narrate everything you do. Babies love your voice — this builds language pathways months before first words.", duration: "All day" },
    { emoji: "🖤🤍", title: "High-Contrast Visuals", desc: "Show black-and-white patterns or simple faces 20–30 cm from baby's eyes. Vision is still developing.", duration: "5 min" },
  ],
  "3-6": [
    { emoji: "🎪", title: "Peekaboo", desc: "Hide your face behind your hands, then reveal with a big smile. This teaches object permanence and brings big laughs.", duration: "5 min" },
    { emoji: "🎯", title: "Reach & Grab", desc: "Hang soft colourful toys within reach. Let baby bat at them — this builds hand-eye coordination.", duration: "10 min" },
    { emoji: "🎶", title: "Bouncing Songs", desc: "Hold baby upright and bounce gently to rhythm. 'Twinkle Twinkle', 'Baa Baa Black Sheep' — repetition is key.", duration: "5–10 min" },
  ],
  "6-9": [
    { emoji: "🧺", title: "Object Hide & Seek", desc: "Hide a toy under a cloth while baby watches. Let them uncover it — this builds object permanence.", duration: "5 min" },
    { emoji: "🛁", title: "Bath Play", desc: "Add cups and soft toys to bath. Pouring water in and out is perfect sensory play at this age.", duration: "10–15 min" },
    { emoji: "📚", title: "Board Book Story", desc: "Point to pictures and name them slowly. 'Dog! Woof woof.' Short, repetitive board books work best.", duration: "5 min" },
  ],
  "9-12": [
    { emoji: "🏗️", title: "Stacking & Knocking", desc: "Stack 3 cups or blocks and let baby knock them over. They'll find this hilarious and will want to repeat.", duration: "10 min" },
    { emoji: "⚽", title: "Roll the Ball", desc: "Sit opposite each other, roll a soft ball back and forth. Teaches turn-taking — a foundation of conversation.", duration: "5–10 min" },
    { emoji: "🏡", title: "Safe Exploration Crawl", desc: "Create a safe floor area with cushions and tunnels. Let baby crawl and explore freely.", duration: "15–20 min" },
  ],
  "12-18": [
    { emoji: "🎨", title: "Finger Painting", desc: "Use edible or non-toxic paint on paper. Squishing, smearing — all sensory gold. Expect mess, embrace it!", duration: "15 min" },
    { emoji: "🎭", title: "Pretend Play", desc: "Offer toy phone, cups, spoons. Toddlers love imitating — 'Hello? Yes, I want samosa.' Follow their lead.", duration: "15 min" },
    { emoji: "🚶", title: "Outdoor Stroll & Name", desc: "Walk outside, name everything — dog, flower, car, sky. Every word heard now is a word spoken later.", duration: "20 min" },
  ],
  "18-24": [
    { emoji: "🧩", title: "Simple Shape Sorters", desc: "Match shapes to holes — great for problem-solving, patience, and hand precision.", duration: "10 min" },
    { emoji: "📖", title: "Interactive Storytime", desc: "Ask 'Where's the doggie?' and wait. At this age, babies can point and participate.", duration: "10 min" },
    { emoji: "💃", title: "Dance & Jump", desc: "Put on music, dance together. Jumping, spinning, clapping — gross motor + joy combo.", duration: "10–15 min" },
  ],
};

// ─── Vaccination Schedule (India NIS + IAP) ───────────────────────────────────
type VaxEntry = { ageLabel: string; ageMonths: number; vaccines: string[]; done?: boolean };

const VACCINATIONS: VaxEntry[] = [
  { ageLabel: "Birth", ageMonths: 0, vaccines: ["BCG", "OPV-0", "Hep B-1"] },
  { ageLabel: "6 weeks", ageMonths: 1.5, vaccines: ["DTwP/DTaP-1", "IPV-1", "Hep B-2", "Hib-1", "Rotavirus-1", "PCV-1"] },
  { ageLabel: "10 weeks", ageMonths: 2.5, vaccines: ["DTwP/DTaP-2", "IPV-2", "Hib-2", "Rotavirus-2", "PCV-2"] },
  { ageLabel: "14 weeks", ageMonths: 3.5, vaccines: ["DTwP/DTaP-3", "IPV-3", "Hib-3", "Rotavirus-3", "PCV-3"] },
  { ageLabel: "6 months", ageMonths: 6, vaccines: ["OPV-1", "Hep B-3"] },
  { ageLabel: "9 months", ageMonths: 9, vaccines: ["OPV-2", "MMR-1", "Vitamin A-1"] },
  { ageLabel: "12 months", ageMonths: 12, vaccines: ["PCV Booster", "Hep A-1", "Varicella-1"] },
  { ageLabel: "15 months", ageMonths: 15, vaccines: ["MMR-2", "Varicella-2"] },
  { ageLabel: "18 months", ageMonths: 18, vaccines: ["DTwP Booster-1", "IPV Booster-1", "Hib Booster", "Hep A-2"] },
  { ageLabel: "24 months", ageMonths: 24, vaccines: ["Typhoid (TCV)"] },
];

// ─── Common Issues ─────────────────────────────────────────────────────────────
const COMMON_ISSUES = [
  {
    id: "colic",
    emoji: "😭",
    title: "Colic / Excessive Crying",
    bands: ["0-3", "3-6"],
    content: "Rule of 3: crying >3 hrs/day, >3 days/week, >3 weeks in a healthy baby. Try: gentle tummy massage clockwise, bicycle legs, white noise, feeding position upright 30 min after feed, check for gas. Usually peaks at 6 weeks and resolves by 3–4 months. See doctor if baby has fever or isn't eating.",
  },
  {
    id: "teething",
    emoji: "🦷",
    title: "Teething",
    bands: ["6-9", "9-12", "12-18"],
    content: "First tooth usually arrives 6–10 months. Signs: drooling, gum rubbing, fussiness, mild fever (under 38°C). Help: cold teething ring, gentle gum massage with clean finger. Do NOT use teething gels with benzocaine. Mild symptoms are normal — high fever, rash or diarrhoea are not teething symptoms.",
  },
  {
    id: "fever",
    emoji: "🌡️",
    title: "Fever",
    bands: ["0-3", "3-6", "6-9", "9-12", "12-18", "18-24"],
    content: "Under 3 months: any temp ≥38°C → go to hospital immediately. 3–6 months: call doctor if ≥38°C or baby seems unwell. 6 months+: treat if uncomfortable with paracetamol (correct dose for weight). Keep hydrated. Go to ER if: temp ≥40°C, seizure, rash, stiff neck, won't stop crying, very lethargic.",
  },
  {
    id: "cold",
    emoji: "🤧",
    title: "Cold / Stuffy Nose",
    bands: ["3-6", "6-9", "9-12", "12-18", "18-24"],
    content: "Babies can't blow their nose — use a nasal aspirator and saline drops before feeds. Keep room humidified. Slightly elevate head end of mattress (not pillow). Under 2 years: NO over-the-counter cough/cold medicine. Breastfeed frequently — milk transfers antibodies. See doctor if breathing is laboured or symptoms worsen after 10 days.",
  },
];

// ─── Parent Coaching ──────────────────────────────────────────────────────────
type CoachTip = { emoji: string; title: string; desc: string };

function getCoachingTips(months: number): CoachTip[] {
  if (months < 4) return [
    { emoji: "🤝", title: "Serve & Return", desc: "When baby coos, coo back. When baby looks, look back and smile. These micro-interactions wire the brain more than any toy." },
    { emoji: "🤗", title: "Skin-to-Skin Time", desc: "20–30 min of skin-to-skin daily regulates baby's temperature, heart rate, and stress hormones. It builds secure attachment." },
    { emoji: "🗣️", title: "Narrate Your Day", desc: "Say what you're doing: 'Now we're putting on your blue socks.' Babies absorb language months before using it." },
  ];
  if (months < 9) return [
    { emoji: "🔁", title: "Repetition is Learning", desc: "Babies need to hear a word 50–100 times before they store it. Repeat songs, games, and phrases — it's not boring, it's teaching." },
    { emoji: "👀", title: "Follow Their Gaze", desc: "When baby looks at something, name it. This 'joint attention' is one of the biggest predictors of language development." },
    { emoji: "🙏", title: "Respond to Cues", desc: "Consistently responding to baby's cries does NOT spoil them. It builds trust and reduces stress hormones in the developing brain." },
  ];
  if (months < 15) return [
    { emoji: "📖", title: "Read Together Daily", desc: "Even 10 minutes of pointing at pictures and naming them each day makes a measurable difference in vocabulary by age 3." },
    { emoji: "🎭", title: "Let Them Lead Play", desc: "Follow baby's interest rather than directing. If they're fascinated by the water bottle, narrate that. Child-led play builds executive function." },
    { emoji: "⛔", title: "Redirect, Don't Just Say No", desc: "Say 'That's for grown-ups, here's your toy' rather than just 'No'. Toddlers respond better to what they CAN do." },
  ];
  return [
    { emoji: "🌪️", title: "Tantrums Are Communication", desc: "Under 2 years, tantrums happen because the emotional brain is maturing faster than the reasoning brain. Stay calm, name the feeling: 'You're frustrated.'" },
    { emoji: "💬", title: "Baby Sign Language", desc: "Teach 5–6 signs (milk, more, done, water, eat, sleep). This dramatically reduces frustration tantrums while speech develops." },
    { emoji: "🧸", title: "Parallel Play is Normal", desc: "Toddlers 18–24 months play alongside, not with, other children. Don't force sharing yet — it's developmentally ahead of them." },
  ];
}

// ─── Weekly Insight ───────────────────────────────────────────────────────────
function getWeeklyInsight(name: string, months: number): { headline: string; body: string; next: string } {
  const band = getBand(months);
  const map: Record<string, { headline: string; body: string; next: string }> = {
    "0-3": {
      headline: `${name} is building the brain's first 'trust map'`,
      body: "Every time you respond to crying, you're literally growing neural connections. The brain grows 1 mm³ per second in the first 3 months — more than any other time in life.",
      next: "Watch for the first social smile this week — it's the beginning of intentional communication.",
    },
    "3-6": {
      headline: `${name}'s brain is craving new sensations`,
      body: "This is the prime window for sensory experiences. Different textures, sounds, faces, and environments all build rich neural networks. The more varied (and safe) inputs, the better.",
      next: "Start tummy time daily and notice how head control is improving week by week.",
    },
    "6-9": {
      headline: `${name} is entering the world of solid foods & big emotions`,
      body: "Stranger anxiety peaking right now is actually a great sign — it means attachment is forming perfectly. Separation anxiety and clinginess at 6–9 months is healthy, not a problem.",
      next: "Try one new solid food this week. Wait 3 days before introducing the next to watch for reactions.",
    },
    "9-12": {
      headline: `${name}'s first word is closer than you think`,
      body: "Babbling is shadow speech — the brain is rehearsing. Every 'ba-da-ma-ga' is practice. Your response (treating babble as meaningful) accelerates the process.",
      next: "Point and name everything this week: door, shoe, spoon, ball. Repetition + pointing = fastest vocabulary path.",
    },
    "12-18": {
      headline: `${name} is moving from baby to toddler at speed`,
      body: "The switch from 2 naps to 1 often happens between 14–18 months and causes a rough patch. Stick to consistent timing and it usually settles within 2–3 weeks.",
      next: "Introduce a simple 2-step routine: 'First shoes, then outside.' This builds executive function.",
    },
    "18-24": {
      headline: `${name}'s language is about to explode`,
      body: "Between 18–24 months, most toddlers go from 20 words to 50+. The 'word spurt' usually hits suddenly after a quiet patch — it's coming. Keep reading and narrating.",
      next: "Start asking 'where is the...?' questions and give them a moment to point. This builds vocabulary comprehension faster than drilling.",
    },
  };
  return map[band] ?? map["0-3"];
}

// ─── Collapsible Section ──────────────────────────────────────────────────────
function IHSection({
  icon, title, badge, defaultOpen = false, children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-primary">{icon}</span>
          <span className="font-bold text-sm text-foreground truncate">{title}</span>
          {badge && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── Milestone Tracker ────────────────────────────────────────────────────────
function MilestoneTracker({ childName, ageMonths }: { childName: string; ageMonths: number }) {
  const band = getBand(ageMonths);
  const milestones = MILESTONES[band] ?? [];
  const storageKey = `amynest:milestones:${childName}`;

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    } catch {
      return {};
    }
  });

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const doneCount = milestones.filter((m) => checked[m.id]).length;
  const pct = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;

  const bandLabel: Record<string, string> = {
    "0-3": "0–3 months", "3-6": "3–6 months", "6-9": "6–9 months",
    "9-12": "9–12 months", "12-18": "12–18 months", "18-24": "18–24 months",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold">{bandLabel[band]} milestones</span>
        <span className="font-bold text-primary">{doneCount}/{milestones.length} done</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {milestones.map((m) => (
          <div key={m.id} className="space-y-1">
            <button
              onClick={() => toggle(m.id)}
              className={[
                "w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                checked[m.id]
                  ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-400/20"
                  : "bg-white/50 dark:bg-white/5 border border-border hover:border-primary/40",
              ].join(" ")}
            >
              <div className={[
                "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-all",
                checked[m.id]
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-muted-foreground",
              ].join(" ")}>
                {checked[m.id] && <span className="text-white text-[9px] font-bold">✓</span>}
              </div>
              <span className={`text-sm leading-snug ${checked[m.id] ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {m.label}
              </span>
            </button>
            {!checked[m.id] && m.delayAlert && (
              <div className="flex items-start gap-1.5 px-3 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{m.delayAlert}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {doneCount === milestones.length && milestones.length > 0 && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-400/20 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400 font-semibold text-center">
          🎉 All milestones checked for this stage!
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-snug">
        Milestones are ranges, not deadlines. A few weeks' variation is completely normal.
      </p>
    </div>
  );
}

// ─── Feeding & Sleep Module ───────────────────────────────────────────────────
function FeedingSleepModule({ ageMonths }: { ageMonths: number }) {
  const ww = getWakeWindow(ageMonths);
  const feed = getFeedingGuide(ageMonths);

  return (
    <div className="space-y-3">
      {/* Feeding */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-400/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Feeding Guide</p>
        </div>
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{feed.type}</p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{feed.freq}</p>
        <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1.5 leading-snug">{feed.tip}</p>
      </div>

      {/* Sleep / Wake windows */}
      <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-400/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Sleep Reference</p>
          <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 ml-auto">{ww.range}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Clock className="h-3 w-3" />, label: "Wake window", val: ww.window },
            { icon: <Sun className="h-3 w-3" />, label: "Day naps", val: ww.naps },
            { icon: <Moon className="h-3 w-3" />, label: "Night sleep", val: ww.nightSleep },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-indigo-100/60 dark:bg-indigo-900/30 px-2 py-2 text-center">
              <div className="flex justify-center text-indigo-500 dark:text-indigo-400 mb-1">{item.icon}</div>
              <p className="text-[9px] uppercase tracking-wide text-indigo-500 dark:text-indigo-400 font-bold">{item.label}</p>
              <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-200 leading-tight mt-0.5">{item.val}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-2 leading-snug">
          Put baby down drowsy-but-awake at each nap to build self-settling skills over time.
        </p>
      </div>
    </div>
  );
}

// ─── Daily Activities ─────────────────────────────────────────────────────────
function DailyActivities({ ageMonths }: { ageMonths: number }) {
  const band = getBand(ageMonths);
  const activities = ACTIVITIES[band] ?? [];

  return (
    <div className="space-y-2.5">
      {activities.map((a) => (
        <div key={a.title} className="rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/60 dark:border-sky-400/20 p-3 flex gap-3">
          <span className="text-2xl leading-none shrink-0">{a.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-sm text-sky-900 dark:text-sky-100">{a.title}</p>
              <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400 ml-auto shrink-0">{a.duration}</span>
            </div>
            <p className="text-[12px] text-sky-800/80 dark:text-sky-200/80 leading-snug">{a.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Health & Care ────────────────────────────────────────────────────────────
function HealthCare({ ageMonths }: { ageMonths: number }) {
  const band = getBand(ageMonths);
  const [openIssue, setOpenIssue] = useState<string | null>(null);

  const upcoming = VACCINATIONS.filter((v) => v.ageMonths >= ageMonths && v.ageMonths <= ageMonths + 2);
  const done = VACCINATIONS.filter((v) => v.ageMonths < ageMonths);
  const relevantIssues = COMMON_ISSUES.filter((i) => i.bands.includes(band));

  return (
    <div className="space-y-3">
      {/* Vaccination status */}
      <div className="rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-400/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Syringe className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <p className="text-xs font-bold text-teal-900 dark:text-teal-200">Vaccination Schedule</p>
        </div>

        {upcoming.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">Upcoming / Due Now</p>
            {upcoming.map((v) => (
              <div key={v.ageLabel} className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 px-2 py-1.5 mb-1">
                <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">{v.ageLabel}</p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">{v.vaccines.join(", ")}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] font-bold uppercase tracking-wide text-teal-600 dark:text-teal-400 mb-1">
          Completed ({done.length}/{VACCINATIONS.length})
        </p>
        <div className="h-1.5 rounded-full bg-teal-100 dark:bg-teal-900/40 overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${Math.round((done.length / VACCINATIONS.length) * 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-teal-700/70 dark:text-teal-400/70 leading-snug">
          Always confirm schedule with your paediatrician — some states or doctors use slightly different timings.
        </p>
      </div>

      {/* Common Issues */}
      {relevantIssues.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Common Issues at This Age</p>
          {relevantIssues.map((issue) => (
            <div key={issue.id} className="rounded-xl border border-border bg-white/50 dark:bg-white/[0.03] overflow-hidden">
              <button
                onClick={() => setOpenIssue(openIssue === issue.id ? null : issue.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              >
                <span className="text-lg">{issue.emoji}</span>
                <span className="font-semibold text-sm text-foreground flex-1">{issue.title}</span>
                {openIssue === issue.id
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {openIssue === issue.id && (
                <div className="px-3 pb-3 text-[12px] text-foreground/80 leading-relaxed border-t border-border/40">
                  <div className="pt-2">{issue.content}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Parent Coaching ──────────────────────────────────────────────────────────
function ParentCoaching({ ageMonths }: { ageMonths: number }) {
  const tips = getCoachingTips(ageMonths);

  return (
    <div className="space-y-2.5">
      {tips.map((tip) => (
        <div key={tip.title} className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-400/20 p-3 flex gap-3">
          <span className="text-xl leading-none shrink-0">{tip.emoji}</span>
          <div className="min-w-0">
            <p className="font-bold text-sm text-rose-900 dark:text-rose-100 mb-0.5">{tip.title}</p>
            <p className="text-[12px] text-rose-800/80 dark:text-rose-200/80 leading-snug">{tip.desc}</p>
          </div>
        </div>
      ))}
      <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-400/20 p-3 text-center">
        <p className="text-xs font-bold text-violet-800 dark:text-violet-200">
          💜 You're doing better than you think
        </p>
        <p className="text-[11px] text-violet-700/80 dark:text-violet-300/80 mt-1 leading-snug">
          Research shows that parents who seek out information and support are already above-average parents. The worry itself is evidence of love.
        </p>
      </div>
    </div>
  );
}

// ─── Weekly AI Insight ────────────────────────────────────────────────────────
function WeeklyInsight({ childName, ageMonths }: { childName: string; ageMonths: number }) {
  const insight = getWeeklyInsight(childName, ageMonths);

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-violet-100/80 to-fuchsia-100/80 dark:from-violet-900/30 dark:to-fuchsia-900/30 border border-violet-200/60 dark:border-violet-400/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-4 w-4 text-violet-600 dark:text-violet-400 fill-violet-400" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">This Week's Insight</p>
        </div>
        <p className="font-bold text-sm text-violet-900 dark:text-violet-100 leading-snug mb-2">
          {insight.headline}
        </p>
        <p className="text-[12px] text-violet-800/80 dark:text-violet-200/80 leading-relaxed">
          {insight.body}
        </p>
      </div>
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-400/20 p-3 flex gap-2.5">
        <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-0.5">Try This Week</p>
          <p className="text-[12px] text-emerald-800/90 dark:text-emerald-200/90 leading-snug">{insight.next}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function InfantHub({ childName, ageMonths }: InfantHubProps) {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const { toast } = useToast();

  const [active, setActive] = useState<InfantCategory>("sleep");
  const [tipIndex, setTipIndex] = useState(0);

  const tips = useMemo(() => getTipsForAge(ageMonths, active), [ageMonths, active]);
  const insight = useMemo(() => getAmyInsight(ageMonths, active), [ageMonths, active]);

  const currentTip = tips.length > 0 ? tips[tipIndex % tips.length] : null;
  const ageLabel = formatAge(Math.floor(ageMonths / 12), ageMonths % 12);

  const handleNext = () => {
    if (tips.length === 0) return;
    setTipIndex((i) => (i + 1) % tips.length);
  };

  return (
    <div className="space-y-3">
      {/* ── Header card with tips ──────────────────────────────────────────── */}
      <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-pink-50/60 via-violet-50/40 to-sky-50/60 dark:from-pink-950/20 dark:via-violet-950/20 dark:to-sky-950/20 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-300 mb-0.5">
                👶 {t("infant_hub.title")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("infant_hub.subtitle", { name: childName, age: ageLabel })}
              </p>
            </div>
          </div>

          {/* Glass Tabs */}
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
            {INFANT_CATEGORIES.map((cat) => {
              const isActive = active === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => { setActive(cat.key); setTipIndex(0); }}
                  className={[
                    "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all duration-200",
                    "backdrop-blur-md border",
                    isActive
                      ? "bg-white/80 dark:bg-white/10 border-violet-400/60 dark:border-violet-300/40 text-violet-900 dark:text-violet-100 shadow-[0_0_0_1px_rgba(168,85,247,0.35),0_8px_24px_-8px_rgba(168,85,247,0.45)]"
                      : "bg-white/40 dark:bg-white/5 border-white/60 dark:border-white/10 text-muted-foreground hover:border-violet-300/60",
                  ].join(" ")}
                  aria-pressed={isActive}
                >
                  <span className="text-base leading-none">{cat.emoji}</span>
                  <span>{t(`infant_hub.tabs.${cat.key}`)}</span>
                </button>
              );
            })}
          </div>

          {/* Amy AI Insight */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-100/70 to-fuchsia-100/70 dark:from-violet-900/30 dark:to-fuchsia-900/30 border border-violet-200/60 dark:border-violet-400/20 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Brain className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              <p className="text-xs font-bold text-violet-900 dark:text-violet-100">
                {t("infant_hub.amy_suggests")}
              </p>
            </div>
            <p className="text-sm text-violet-900/90 dark:text-violet-50 leading-snug">
              <span className="mr-1">{insight.emoji}</span>
              {pickLang(insight, lang)}
            </p>
          </div>

          {/* Current Tip */}
          {currentTip ? (
            <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-4 backdrop-blur-md">
              <div className="flex items-start gap-3 mb-2">
                <div className="text-3xl leading-none shrink-0">{currentTip.emoji}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-quicksand font-bold text-foreground text-[15px] leading-tight">
                    {pickLang(currentTip.title, lang)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5 font-bold">
                    {t("infant_hub.based_on")}
                  </p>
                </div>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {pickLang(currentTip.body, lang)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3.5">
                <button
                  onClick={() => toast({ description: t("infant_hub.thanks") })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition-colors"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {t("infant_hub.helpful")}
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-xs font-bold hover:bg-violet-200 dark:hover:bg-violet-500/25 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("infant_hub.next_tip")}
                </button>
                <button
                  onClick={() => toast({ description: t("infant_hub.tried_logged") })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-200 dark:hover:bg-amber-500/25 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("infant_hub.tried_this")}
                </button>
              </div>
              {tips.length > 1 && (
                <p className="mt-2.5 text-[11px] text-muted-foreground text-center">
                  {tipIndex + 1} / {tips.length}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-muted/40 p-5 text-center text-sm text-muted-foreground">
              {t("infant_hub.no_tips")}
            </div>
          )}

          {/* Safety footer */}
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600/70" />
            <p className="leading-snug">{t("infant_hub.safe_disclaimer")}</p>
          </div>
        </CardContent>
      </Card>

      {/* ── 1. Weekly AI Insight ─────────────────────────────────────────────── */}
      <IHSection icon={<Star className="h-4 w-4" />} title="Weekly Insight" badge="New" defaultOpen>
        <WeeklyInsight childName={childName} ageMonths={ageMonths} />
      </IHSection>

      {/* ── 2. Milestone Tracker ─────────────────────────────────────────────── */}
      <IHSection icon={<Activity className="h-4 w-4" />} title="Milestone Tracker">
        <MilestoneTracker childName={childName} ageMonths={ageMonths} />
      </IHSection>

      {/* ── 3. Feeding & Sleep Module ────────────────────────────────────────── */}
      <IHSection icon={<Moon className="h-4 w-4" />} title="Feeding & Sleep Reference">
        <FeedingSleepModule ageMonths={ageMonths} />
      </IHSection>

      {/* ── 4. Daily Activities ──────────────────────────────────────────────── */}
      <IHSection icon={<Zap className="h-4 w-4" />} title="Today's Activities" badge="3 ideas">
        <DailyActivities ageMonths={ageMonths} />
      </IHSection>

      {/* ── 5. Health & Care ─────────────────────────────────────────────────── */}
      <IHSection icon={<Syringe className="h-4 w-4" />} title="Health & Care">
        <HealthCare ageMonths={ageMonths} />
      </IHSection>

      {/* ── 6. Parent Coaching ───────────────────────────────────────────────── */}
      <IHSection icon={<Heart className="h-4 w-4" />} title="Parent Coaching">
        <ParentCoaching ageMonths={ageMonths} />
      </IHSection>
    </div>
  );
}
