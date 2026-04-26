import { useState, useMemo, type ReactNode } from "react";
import { Music2, Wind, ChevronDown, ChevronUp, Volume2, VolumeX, Info, Heart } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type NoiseType = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  bestFor: string;
};

type Song = {
  emoji: string;
  title: string;
  howTo: string;
  whyItHelps: string;
  duration: string;
  fromMonths: number;
  toMonths: number;
};

// ─── White Noise Data ───────────────────────────────────────────────────────
const NOISE_TYPES: NoiseType[] = [
  {
    id: "shush",
    emoji: "🫁",
    label: "Shushing",
    desc: "A rhythmic 'shhhh' sound — the closest thing to what baby heard in the womb. Air rushing through blood vessels + muffled heartbeat = built-in white noise.",
    bestFor: "Newborns (0–4 months), overtired or inconsolable crying",
  },
  {
    id: "rain",
    emoji: "🌧️",
    label: "Rain / Static",
    desc: "Consistent broadband noise that masks household sounds — TV, voices, traffic. Rain is the most universally soothing for babies.",
    bestFor: "All ages, especially 2–12 months for naps in noisy homes",
  },
  {
    id: "fan",
    emoji: "🌀",
    label: "Fan / Hair Dryer",
    desc: "Low-frequency rumble that deeply masks sound and has a grounding effect. Many parents swear by a real fan rather than a recording.",
    bestFor: "Overtired newborns, summer sleep, colicky phases",
  },
  {
    id: "heartbeat",
    emoji: "💓",
    label: "Heartbeat",
    desc: "Mimics the sound baby heard for 9 months inside the womb. Deeply familiar and calming, especially in the 4th trimester (first 3 months).",
    bestFor: "Newborns 0–3 months, transition from arms to cot",
  },
  {
    id: "pink",
    emoji: "🔊",
    label: "Pink Noise",
    desc: "Like white noise but weighted to lower frequencies — more like rushing water than static. Many babies and toddlers prefer it over pure white noise.",
    bestFor: "Older babies 6 months+, toddlers who've outgrown white noise",
  },
  {
    id: "womb",
    emoji: "🫀",
    label: "Womb Sounds",
    desc: "Recordings combining heartbeat, blood flow, and muffled voice. The most complete recreation of the womb sound environment.",
    bestFor: "Newborns 0–6 weeks, especially premature or NICU graduates",
  },
];

type AgeTip = {
  band: string;
  fromMonths: number;
  toMonths: number;
  headline: string;
  tip: string;
  volume: string;
};

const AGE_TIPS: AgeTip[] = [
  {
    band: "0–3 months", fromMonths: 0, toMonths: 3,
    headline: "White noise is a lifesaver right now",
    tip: "The 4th trimester — baby is adjusting to a world that is too quiet, too bright, and too still. White noise recreates the womb environment. Use it freely during sleep and fussy periods.",
    volume: "About as loud as a shower — roughly 60–65 dB. Never louder.",
  },
  {
    band: "3–6 months", fromMonths: 3, toMonths: 6,
    headline: "Keep using it, but start fading volume",
    tip: "White noise is still helpful — especially for naps — but you can start to gradually lower the volume as baby becomes more settled. They're also responding to music now, so songs are great for awake time.",
    volume: "50–60 dB. Keep the source at least 30 cm from baby's head.",
  },
  {
    band: "6–12 months", fromMonths: 6, toMonths: 12,
    headline: "Use for sleep, shift to music for play",
    tip: "White noise for naps and night sleep is fine at this age. During awake play, songs and rhythmic music do more developmental work. Start to view them as different tools — noise for sleep, music for play.",
    volume: "Keep at 50 dB or below for this age. A quiet fan is a good reference.",
  },
  {
    band: "12–24 months", fromMonths: 12, toMonths: 24,
    headline: "Begin gentle weaning from white noise",
    tip: "If your toddler still needs white noise for every sleep, start fading it slowly — reduce volume by a notch each week, then try turning it off 30 minutes after they've fallen asleep. Aim to be free of it by 2 years.",
    volume: "40–50 dB maximum. If they can talk over it easily, that's about right.",
  },
];

// ─── Songs & Lullabies Data ─────────────────────────────────────────────────
const SONGS: Song[] = [
  // 0-3 months
  {
    emoji: "🌙", title: "Gentle Humming", fromMonths: 0, toMonths: 4,
    howTo: "Hold baby close and hum a single long note — no melody needed. Let them feel the vibration through your chest.",
    whyItHelps: "The vibration + warmth + heartbeat combo is the closest thing to the womb. More soothing than any recording.",
    duration: "As long as needed",
  },
  {
    emoji: "⭐", title: "Twinkle Twinkle Little Star", fromMonths: 0, toMonths: 8,
    howTo: "Sing slowly — much slower than you think. Pause after each line. Eye contact throughout. Slow blink when they blink.",
    whyItHelps: "Simple melody, repeated vowel sounds ('twin-kle'), and your face + voice together is the most stimulating thing a newborn can experience.",
    duration: "2–3 min · anytime",
  },
  {
    emoji: "🌊", title: "Laa Laa Lullaby (hummed)", fromMonths: 0, toMonths: 4,
    howTo: "Just hum 'laa laa laa' to any melody you know. The 'laa' vowel is especially soothing to babies.",
    whyItHelps: "Open vowel sounds vibrate in your chest. Baby hears AND feels the sound — a multisensory experience.",
    duration: "3–5 min · at sleep time",
  },

  // 3-6 months
  {
    emoji: "🐑", title: "Baa Baa Black Sheep", fromMonths: 3, toMonths: 8,
    howTo: "Hold baby upright and gently bounce on your knee in rhythm. One bounce per beat. Exaggerate the last word of each line.",
    whyItHelps: "The bouncing stimulates the vestibular (balance) system while the rhythmic syllables map language patterns into the developing brain.",
    duration: "5 min · 2–3× daily",
  },
  {
    emoji: "🤸", title: "Row Row Row Your Boat", fromMonths: 3, toMonths: 10,
    howTo: "Sit baby on your lap facing you. Hold their hands and gently rock forward and backward with each word. Rock faster on 'merrily merrily merrily merrily'.",
    whyItHelps: "Gentle whole-body movement synced to language rhythm. Babies who experience this type of rhythmic motion + song show earlier language development.",
    duration: "3 min · anytime",
  },
  {
    emoji: "🌟", title: "Johny Johny Yes Papa", fromMonths: 3, toMonths: 12,
    howTo: "Tap baby's hands gently on each syllable. Make eye contact. Pause before 'Ha ha ha!' and make a surprised face.",
    whyItHelps: "The surprise pause before the punchline teaches prediction and cause-and-effect — two major cognitive leaps at this age.",
    duration: "2–3 min · 2× daily",
  },

  // 6-12 months
  {
    emoji: "👏", title: "If You're Happy and You Know It", fromMonths: 6, toMonths: 14,
    howTo: "Clap baby's hands together for 'clap your hands'. Stomp feet for 'stomp your feet'. Do it slowly enough that they can anticipate the action.",
    whyItHelps: "Anticipatory music play teaches sequencing — a cognitive skill that underlies maths, reading, and planning.",
    duration: "3–5 min · playfully",
  },
  {
    emoji: "👐", title: "Pat-a-Cake", fromMonths: 6, toMonths: 14,
    howTo: "Take baby's hands and clap them together, then roll them, then poke their tummy gently on 'prick it and pat it'. Build speed over repeat plays.",
    whyItHelps: "Cross-body hand movements in rhythm help integrate left-right brain communication — directly supports later reading and coordination.",
    duration: "2 min · 3–4× daily",
  },
  {
    emoji: "🏠", title: "Wheels on the Bus", fromMonths: 7, toMonths: 15,
    howTo: "Add a new action each verse — swipe hands for wipers, bounce for bumpy ride, shush for 'babies go waa'. Invent new verses about your own life.",
    whyItHelps: "Each action is a gesture-symbol pair. Baby starts connecting physical movements to meanings — precursor to sign language and word association.",
    duration: "5 min · works anywhere",
  },

  // 12-24 months
  {
    emoji: "💃", title: "Dance Party", fromMonths: 12, toMonths: 24,
    howTo: "Put on any upbeat music and go wild. Jump, spin, clap, fall down, get up. Let toddler lead — follow their moves and mirror them.",
    whyItHelps: "Free dance builds gross motor confidence, rhythm internalisation, and joyful connection. The joy itself is the development — shared positive emotion is deeply bonding.",
    duration: "10–15 min · daily",
  },
  {
    emoji: "🦵", title: "Heads, Shoulders, Knees & Toes", fromMonths: 13, toMonths: 24,
    howTo: "Touch each body part as you name it. Sing slowly at first, then speed up each repeat — the speeding up is what makes it funny and challenging.",
    whyItHelps: "Body part vocabulary + proprioception (knowing where your body is). This single song builds both spatial awareness and receptive language simultaneously.",
    duration: "2–3 min · 3–4× daily",
  },
  {
    emoji: "🌈", title: "Old MacDonald Had a Farm", fromMonths: 14, toMonths: 24,
    howTo: "Ask 'what does the cow say?' before doing the sound yourself. Pause and wait — even if they just smile. Celebrate any attempt at the animal sound.",
    whyItHelps: "The question-before-answer structure directly teaches conversational turn-taking. Animal sound attempts are early words — celebrate every one.",
    duration: "5 min · story + song combo",
  },
];

// ─── Helper ─────────────────────────────────────────────────────────────────
function getAgeTip(months: number): AgeTip {
  return (
    AGE_TIPS.find((t) => months >= t.fromMonths && months < t.toMonths) ??
    AGE_TIPS[AGE_TIPS.length - 1]
  );
}

function getSongs(months: number): Song[] {
  return SONGS.filter((s) => months >= s.fromMonths && months < s.toMonths);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function WhiteNoiseLullaby({ ageMonths }: { ageMonths: number }) {
  const [tab, setTab] = useState<"noise" | "songs">("noise");
  const [selectedNoise, setSelectedNoise] = useState<string | null>(null);
  const [expandedSong, setExpandedSong] = useState<string | null>(null);

  const ageTip = useMemo(() => getAgeTip(ageMonths), [ageMonths]);
  const songs = useMemo(() => getSongs(ageMonths), [ageMonths]);

  return (
    <div className="space-y-3">

      {/* ── Tab toggle ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10">
        <TabBtn
          active={tab === "noise"}
          onClick={() => setTab("noise")}
          icon={<Wind className="h-3.5 w-3.5" />}
          label="White Noise"
          activeClass="bg-indigo-500 text-white shadow-[0_4px_12px_-2px_rgba(99,102,241,0.5)]"
        />
        <TabBtn
          active={tab === "songs"}
          onClick={() => setTab("songs")}
          icon={<Music2 className="h-3.5 w-3.5" />}
          label="Songs & Lullabies"
          activeClass="bg-fuchsia-500 text-white shadow-[0_4px_12px_-2px_rgba(217,70,239,0.5)]"
        />
      </div>

      {/* ── White Noise tab ─────────────────────────────────────────── */}
      {tab === "noise" && (
        <div className="space-y-3 animate-in fade-in duration-200">

          {/* Age-specific guidance card */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-100/80 via-violet-100/60 to-purple-100/80 dark:from-indigo-900/30 dark:via-violet-900/20 dark:to-purple-900/30 border border-indigo-200/60 dark:border-indigo-400/20 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="h-4 w-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">{ageTip.headline}</p>
            </div>
            <p className="text-[12px] text-indigo-800/90 dark:text-indigo-100/80 leading-relaxed mb-2.5">{ageTip.tip}</p>
            <div className="flex items-start gap-1.5 rounded-lg bg-indigo-200/50 dark:bg-indigo-500/20 px-2.5 py-2">
              <VolumeX className="h-3 w-3 text-indigo-700 dark:text-indigo-300 shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-800 dark:text-indigo-200 leading-snug">
                <span className="font-bold">Volume rule:</span> {ageTip.volume}
              </p>
            </div>
          </div>

          {/* Noise type picker */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Tap a type to learn more
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {NOISE_TYPES.map((n) => {
                const isSelected = selectedNoise === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNoise(isSelected ? null : n.id)}
                    className={[
                      "rounded-xl py-2.5 px-1 text-center border-2 transition-all",
                      isSelected
                        ? "bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-600/60 text-white shadow-[0_6px_16px_-4px_rgba(99,102,241,0.5)]"
                        : "bg-white/60 dark:bg-white/5 border-border hover:border-indigo-300 dark:hover:border-indigo-500",
                    ].join(" ")}
                  >
                    <div className="text-xl mb-1">{n.emoji}</div>
                    <p className={`text-[10px] font-bold leading-tight ${isSelected ? "text-white" : "text-foreground"}`}>
                      {n.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expanded noise type detail */}
          {selectedNoise && (() => {
            const n = NOISE_TYPES.find((x) => x.id === selectedNoise)!;
            return (
              <div className="rounded-xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-400/20 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{n.emoji}</span>
                  <p className="font-bold text-sm text-indigo-900 dark:text-indigo-100">{n.label}</p>
                </div>
                <p className="text-[12px] text-indigo-800/90 dark:text-indigo-100/80 leading-relaxed">{n.desc}</p>
                <div className="flex items-start gap-1.5 rounded-lg bg-indigo-200/40 dark:bg-indigo-500/20 px-2 py-1.5">
                  <Info className="h-3 w-3 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-200 leading-snug">
                    <span className="font-bold">Best for:</span> {n.bestFor}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Universal tips */}
          <div className="rounded-xl bg-white/50 dark:bg-white/[0.04] border border-border p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Universal rules</p>
            {[
              { emoji: "📏", tip: "Keep the source at least 30 cm (1 foot) from baby's head." },
              { emoji: "🔇", tip: "Never exceed 65 dB — roughly the volume of a shower." },
              { emoji: "⏰", tip: "Use it as a sleep cue, not background noise all day." },
              { emoji: "🌅", tip: "Fade it gradually — volume down 5 dB per week — rather than stopping suddenly." },
            ].map(({ emoji, tip }) => (
              <div key={tip} className="flex items-start gap-2">
                <span className="text-base leading-none shrink-0">{emoji}</span>
                <p className="text-[12px] text-foreground/80 leading-snug">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Songs & Lullabies tab ────────────────────────────────────── */}
      {tab === "songs" && (
        <div className="space-y-2.5 animate-in fade-in duration-200">
          <div className="rounded-2xl bg-gradient-to-br from-fuchsia-100/80 via-pink-100/60 to-rose-100/80 dark:from-fuchsia-900/30 dark:via-pink-900/20 dark:to-rose-900/30 border border-fuchsia-200/60 dark:border-fuchsia-400/20 p-3 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1">
              <Music2 className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-300" />
              <p className="text-xs font-bold text-fuchsia-900 dark:text-fuchsia-100">Songs for this age</p>
            </div>
            <p className="text-[12px] text-fuchsia-800/80 dark:text-fuchsia-100/70 leading-snug">
              Singing to your baby is one of the highest-impact things you can do — it builds language, emotion regulation, and connection simultaneously. Your voice — even imperfect — is always better than a recording.
            </p>
          </div>

          {songs.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border/60 px-3 py-6 text-center">
              <Music2 className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">Song suggestions for this age coming soon.</p>
            </div>
          )}

          {songs.map((s) => {
            const isOpen = expandedSong === s.title;
            return (
              <div
                key={s.title}
                className="rounded-2xl border-2 border-border bg-white/60 dark:bg-white/[0.04] backdrop-blur-md overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedSong(isOpen ? null : s.title)}
                  className="w-full flex items-start gap-3 p-3 text-left"
                >
                  <span className="text-2xl leading-none shrink-0 mt-0.5">{s.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-foreground leading-tight mb-0.5">{s.title}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Music2 className="h-2.5 w-2.5" />
                        {s.duration}
                      </span>
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* How to */}
                    <div className="rounded-lg bg-fuchsia-50/80 dark:bg-fuchsia-500/10 border border-fuchsia-200 dark:border-fuchsia-400/20 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-700 dark:text-fuchsia-300 mb-1">How to do it</p>
                      <p className="text-[12px] text-fuchsia-900/90 dark:text-fuchsia-100/90 leading-snug">{s.howTo}</p>
                    </div>
                    {/* Why */}
                    <div className="rounded-lg bg-violet-50/80 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/20 p-2.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Heart className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Why it helps</p>
                      </div>
                      <p className="text-[12px] text-violet-900/90 dark:text-violet-100/90 leading-snug">{s.whyItHelps}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom reminder */}
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/60 dark:border-amber-400/20 p-3">
            <div className="flex items-start gap-2">
              <span className="text-lg shrink-0">🎤</span>
              <p className="text-[12px] text-amber-900/90 dark:text-amber-100/80 leading-relaxed">
                <span className="font-bold">Your voice is the instrument.</span> Pitch-perfect doesn't matter — familiar does. A song baby hears from you 100 times becomes a lifelong comfort anchor.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({
  active, onClick, icon, label, activeClass,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
        active ? activeClass : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
