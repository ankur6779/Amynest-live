import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play, Square, SkipForward, Heart, CheckCircle2, ChevronRight,
  Volume2, VolumeX, Star, Camera, Plus, ChevronDown, ChevronUp, Clock
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function getAgeRange(months: number): "0_3" | "3_6" | "6_9" | "9_12" {
  if (months < 3) return "0_3";
  if (months < 6) return "3_6";
  if (months < 9) return "6_9";
  return "9_12";
}

function getAgeRangeLabel(months: number): string {
  if (months < 3) return "0–3 Month Baby";
  if (months < 6) return "3–6 Month Baby";
  if (months < 9) return "6–9 Month Baby";
  return "9–12 Month Baby";
}

function getTodaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function isNightTime(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

function formatAge(years: number, months: number): string {
  if (years === 0 && months === 0) return "Newborn";
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years}yr ${months}mo`;
}

// ─────────────────────────────────────────────────────────────
// TIP DATA — Month-based, 4 categories × 4 age ranges
// ─────────────────────────────────────────────────────────────
type TipCategory = "feeding" | "health" | "development" | "bonding";
type AgeRange = "0_3" | "3_6" | "6_9" | "9_12";

type Tip = { text: string; emoji: string };
type TipData = Record<AgeRange, Tip[]>;

const TIPS: Record<TipCategory, TipData> = {
  feeding: {
    "0_3": [
      { emoji: "🤱", text: "Breastfeed every 1.5–3 hours — newborns have tiny tummies! Feed on demand, not on schedule." },
      { emoji: "🍼", text: "Rooting (turning head side to side with mouth open) is a hunger cue — feed before baby cries." },
      { emoji: "❤️", text: "Breast milk changes composition as your baby grows — the early colostrum is liquid gold, packed with antibodies." },
      { emoji: "⏱️", text: "Each feeding session usually lasts 10–20 minutes per breast. Offer both sides at each feed." },
      { emoji: "💧", text: "You don't need water in the first 6 months — breast milk or formula provides all fluids your baby needs." },
      { emoji: "🌙", text: "Night feedings are normal and crucial for milk supply. Cluster feeding in evenings is completely expected." },
    ],
    "3_6": [
      { emoji: "🍼", text: "At 3–4 months, feeding sessions may get shorter (5–10 min) — baby is becoming an efficient nurser!" },
      { emoji: "📊", text: "By 4 months, most babies feed 5–6 times/day. Formula-fed babies need about 150–200 ml per kg of body weight daily." },
      { emoji: "🚫", text: "No solids yet! The WHO recommends exclusive breastfeeding until 6 months. Early solids can increase allergy risk." },
      { emoji: "💤", text: "Growth spurts around 3 and 6 months cause more frequent feeding — this is normal, not a sign of low milk supply." },
      { emoji: "🌡️", text: "Breast milk stored at room temperature is good for 4 hours; in the fridge for up to 4 days; frozen for 6 months." },
      { emoji: "🥛", text: "If formula feeding, always follow preparation instructions exactly — water-to-powder ratio matters for nutrition." },
    ],
    "6_9": [
      { emoji: "🥄", text: "Start solids at 6 months! Begin with single-ingredient purees: mashed banana, sweet potato, or rice porridge." },
      { emoji: "⏳", text: "Introduce one new food every 3 days to watch for allergic reactions — signs include rash, vomiting, or wheezing." },
      { emoji: "🥦", text: "At 6–7 months, offer 1–2 tablespoons of puree, 2–3 times a day alongside continued breastmilk or formula." },
      { emoji: "🍽️", text: "Texture matters! Progress from smooth purees (6m) to mashed foods (7m) to soft lumpy textures (8–9m)." },
      { emoji: "🚫", text: "Avoid honey, salt, sugar, and whole cow's milk as a main drink until 1 year old." },
      { emoji: "😊", text: "Don't give up on a new food after one try — babies may need 10–15 exposures before accepting a new flavor." },
    ],
    "9_12": [
      { emoji: "🤲", text: "By 9–10 months, try finger foods! Soft cubes of banana, cooked carrot, or tofu are perfect starter finger foods." },
      { emoji: "🍳", text: "At 10–12 months, baby can start joining family mealtimes with soft versions of what you eat (no added salt/sugar)." },
      { emoji: "💪", text: "Offer 3 meals + 2 healthy snacks daily. Iron-rich foods (lentils, pureed meat, fortified cereal) are especially important." },
      { emoji: "🥤", text: "You can introduce a cup (not a bottle) for water from 6 months — this helps transition away from bottles later." },
      { emoji: "🍼", text: "Continue breast milk or formula as the primary drink until 12 months — food is for exploring, not replacing milk yet." },
      { emoji: "🥕", text: "Common allergenic foods (egg, peanut butter, fish) can now be introduced — early introduction actually reduces allergy risk!" },
    ],
  },

  health: {
    "0_3": [
      { emoji: "🌡️", text: "A fever above 38°C in babies under 3 months is always an emergency — go to hospital immediately, no waiting." },
      { emoji: "😴", text: "Always place baby on their BACK to sleep. This reduces SIDS risk by 50%. The 'Back to Sleep' rule saves lives." },
      { emoji: "🛏️", text: "Safe sleep surface: firm, flat mattress. No pillows, blankets, bumpers, or soft toys in the crib." },
      { emoji: "🧴", text: "Cradle cap (yellowish flaky scalp) is harmless and common — gently massage baby oil in, comb softly, then wash." },
      { emoji: "🌬️", text: "Newborns get hiccups often — this is normal and doesn't bother them. Just wait it out or try a short feed." },
      { emoji: "💉", text: "Make sure BCG and Hepatitis B doses are given at birth. Keep your vaccination card safe — you'll need it every visit." },
    ],
    "3_6": [
      { emoji: "💉", text: "Major vaccine series starts at 6 weeks: DPT, OPV, Hib, Rotavirus, PCV. Don't delay — these protect against deadly diseases." },
      { emoji: "🤧", text: "Mild sneezing and congestion is normal — babies breathe through their noses and need to clear out amniotic fluid." },
      { emoji: "😭", text: "Colic peaks around 6 weeks and usually resolves by 3–4 months. Try gentle bicycle legs, warm baths, or baby massage." },
      { emoji: "🌡️", text: "Normal baby temperature is 36.5–37.5°C. Fever above 38°C at this age needs a doctor's visit same day." },
      { emoji: "👁️", text: "Around 2–3 months, your baby will start tracking objects and faces — this is vision development working properly." },
      { emoji: "🦷", text: "Oral care starts before teeth — wipe baby's gums with a clean damp cloth after each feed to prevent bacterial buildup." },
    ],
    "6_9": [
      { emoji: "🦷", text: "First teeth often appear between 6–8 months. Drooling and fussiness are signs — give a cool teething ring for relief." },
      { emoji: "💉", text: "Hepatitis B dose 2 is due at 6 months. Check your vaccination schedule and book with your pediatrician." },
      { emoji: "🤒", text: "Low-grade fever after vaccinations is normal and can last 1–2 days. Consult doctor before giving any paracetamol." },
      { emoji: "😴", text: "Sleep regressions are common around 6–8 months. Keep your bedtime routine consistent — it passes in 2–4 weeks." },
      { emoji: "🏋️", text: "Tummy time is crucial now — aim for 20–30 minutes total per day to build the strength needed for sitting and crawling." },
      { emoji: "🌊", text: "Separation anxiety starts around 8 months — this is healthy! Baby has learned you're a person who can leave. Stay consistent." },
    ],
    "9_12": [
      { emoji: "🦷", text: "By 12 months most babies have 2–8 teeth. Brush twice daily with a rice-grain-sized smear of fluoride toothpaste." },
      { emoji: "💉", text: "MMR vaccine is due at 9–12 months. This protects against measles, mumps, and rubella — all serious diseases." },
      { emoji: "🚶", text: "Babies standing and 'cruising' (walking along furniture) is healthy — don't rush walking, but do ensure safe spaces." },
      { emoji: "🤧", text: "Baby is now interacting with more people and may catch more colds. Frequent minor illness at this age builds immunity." },
      { emoji: "☀️", text: "Introduce sunscreen (SPF 30+, mineral-based) before outdoor play. Keep away from direct midday sun." },
      { emoji: "🍽️", text: "Schedule your baby's 9–12 month well-baby check — growth, milestones, iron levels, and hearing are all assessed." },
    ],
  },

  development: {
    "0_3": [
      { emoji: "👁️", text: "Newborns can see 20–30 cm clearly — exactly the distance to your face while feeding. Look into their eyes while nursing." },
      { emoji: "🗣️", text: "Talk, sing, and narrate your day from day 1. Babies are absorbing language patterns even before they can respond." },
      { emoji: "🖐️", text: "Newborns have a grasp reflex — touch their palm and they'll curl their fingers around yours. Treasure this!" },
      { emoji: "😊", text: "Social smiling appears around 6–8 weeks. The first real smile (not gas!) is a huge milestone — celebrate it!" },
      { emoji: "🦴", text: "Tummy time from day one! Start with 2–3 minutes, 3–4 times/day on your chest or a firm surface to build neck strength." },
      { emoji: "🎵", text: "High-pitched sing-song voices (motherese) help babies tune into language. Your silly baby voice is scientifically beneficial!" },
    ],
    "3_6": [
      { emoji: "🙌", text: "Baby is discovering their hands — watch them stare at them in fascination! Swatting at hanging toys starts now." },
      { emoji: "😄", text: "Laughing and squealing with delight appears around 3–4 months. Respond to every vocalization to encourage communication." },
      { emoji: "🔄", text: "Rolling over (tummy to back first) happens around 4–5 months. Always supervise on elevated surfaces — it's sudden!" },
      { emoji: "👂", text: "Baby now turns toward sounds and recognizes your voice among others. Use their name often when talking to them." },
      { emoji: "🧸", text: "Introduce simple high-contrast toys, soft rattles, and mirrors. Babies love looking at faces, especially their own!" },
      { emoji: "💪", text: "Sitting with support begins around 4–5 months. Use a Boppy pillow or tripod-sit position to practice." },
    ],
    "6_9": [
      { emoji: "🤲", text: "Transferring objects hand-to-hand starts around 7 months — this is fine motor development in action!" },
      { emoji: "📦", text: "Object permanence develops around 8 months — baby now understands things exist even when hidden. Peek-a-boo teaches this!" },
      { emoji: "🐛", text: "Crawling usually starts between 7–10 months — some babies skip it and go straight to walking, both are normal." },
      { emoji: "🗣️", text: "Babbling ('bababa', 'mamama', 'dadada') starts! These aren't words yet, but respond as if they are — it encourages language." },
      { emoji: "🌊", text: "Pincer grasp (thumb + forefinger) begins around 9 months — this is a critical fine motor skill. Encourage with small puffs." },
      { emoji: "🎭", text: "Cause-and-effect toys are perfect now — drums, pop-up toys, and stacking cups all teach this important concept." },
    ],
    "9_12": [
      { emoji: "👋", text: "Waving bye-bye and clapping appear around 9–10 months! These social gestures show huge cognitive leaps." },
      { emoji: "🗣️", text: "First words usually appear between 10–14 months. 'Mama', 'dada', 'baba' count! Read aloud every day to boost vocabulary." },
      { emoji: "🧩", text: "Shape sorters, stacking rings, and simple puzzles are perfect for this stage — they build problem-solving and hand-eye coordination." },
      { emoji: "🚶", text: "Pulling to stand and cruising (walking along furniture) prepares for first steps. Encourage by placing toys slightly out of reach." },
      { emoji: "🎭", text: "Imitation is learning! Baby will copy your actions — clapping, making sounds, using a spoon. Always show and repeat." },
      { emoji: "📚", text: "Books with textures, flaps, and simple pictures are irresistible now. Point and name everything: 'This is a duck!'" },
    ],
  },

  bonding: {
    "0_3": [
      { emoji: "🤗", text: "Skin-to-skin contact lowers baby's cortisol, regulates their temperature, and deepens your bond. Do it as much as possible." },
      { emoji: "🎵", text: "Sing the same song every night — it becomes an anchor for baby. They'll recognize your voice and it helps signal sleep time." },
      { emoji: "💆", text: "Baby massage (after bathtime) releases oxytocin in both of you. Use gentle strokes with warm baby oil." },
      { emoji: "👀", text: "Eye gazing during feeds is powerful bonding — put away your phone and look into baby's eyes. It activates their social brain." },
      { emoji: "🎤", text: "Narrate everything you do: 'Now I'm changing your diaper. Here are your legs!' Language-rich environments wire better brains." },
      { emoji: "😴", text: "Dads can bond through diaper changes, bath time, and soothing — these 1:1 moments build attachment too." },
    ],
    "3_6": [
      { emoji: "😂", text: "Make silly faces and wait for a response — copying facial expressions is how babies practice social interaction." },
      { emoji: "🎵", text: "Dance with baby! Gentle swaying and bouncing to music releases happy hormones for both of you." },
      { emoji: "🔍", text: "Narrate what you see on walks: 'Look at that red car! Here's a big tree!' This builds observation and vocabulary together." },
      { emoji: "📚", text: "Start reading aloud every day — even at this age. The rhythm, your voice, and time together all matter." },
      { emoji: "🤲", text: "Gentle touch games like 'This Little Piggy' or 'Round and Round the Garden' create joy and anticipation in your baby." },
      { emoji: "📸", text: "Capture moments in a photo book or journal — reviewing these together later becomes a cherished ritual." },
    ],
    "6_9": [
      { emoji: "🎭", text: "Peek-a-boo is more than fun — it teaches object permanence and that people come back. Play it often." },
      { emoji: "🏊", text: "Baby swim classes from 6 months are a beautiful bonding activity — also reduces fear of water and builds confidence." },
      { emoji: "🌳", text: "Nature walks with baby facing outward (in a carrier) stimulate their senses and give them a natural dopamine boost." },
      { emoji: "🎨", text: "Sensory play: let baby touch safe materials — cooled cooked pasta, fabric scraps, jelly. Describe textures as you play." },
      { emoji: "🎶", text: "Babble back at baby in their 'language' — this 'serve and return' interaction is the foundation of communication." },
      { emoji: "💪", text: "Floor play together — get on the floor at baby's level, roll the ball, stack blocks, let them explore YOU as a safe base." },
    ],
    "9_12": [
      { emoji: "📖", text: "Let baby turn the pages of board books. Point and name: 'Dog! Woof woof!' Repetition builds real word understanding." },
      { emoji: "🎭", text: "Simple pretend play starts now — pretend to drink from a cup or feed a stuffed animal. Baby will imitate and delight!" },
      { emoji: "🏡", text: "Create a safe 'yes space' in your home — an area baby can explore freely without hearing 'no'. This builds confidence." },
      { emoji: "🎵", text: "Action songs like 'If You're Happy and You Know It' or 'Wheels on the Bus' teach body awareness and turn-taking." },
      { emoji: "🤗", text: "Consistent goodbye and greeting rituals reduce separation anxiety — always say goodbye and always come back." },
      { emoji: "🎊", text: "Celebrate every milestone loudly — first wave, first clap, first pull-to-stand! Your joy is their fuel for trying again." },
    ],
  },
};

const TIP_CATEGORY_META: Record<TipCategory, { label: string; emoji: string; color: string; bgColor: string; borderColor: string; badgeColor: string; iconBg: string }> = {
  feeding:     { label: "Feeding Tip",       emoji: "🍼", color: "text-amber-700 dark:text-amber-200",   bgColor: "bg-amber-50 dark:bg-amber-500/15",  borderColor: "border-amber-200 dark:border-amber-400/30",  badgeColor: "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200", iconBg: "bg-amber-100 dark:bg-amber-500/20" },
  health:      { label: "Health Tip",        emoji: "🏥", color: "text-blue-700 dark:text-blue-200",    bgColor: "bg-blue-50 dark:bg-blue-500/15",   borderColor: "border-blue-200 dark:border-blue-400/30",   badgeColor: "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200",   iconBg: "bg-blue-100 dark:bg-blue-500/20" },
  development: { label: "Development Tip",   emoji: "🧠", color: "text-violet-700 dark:text-violet-200",  bgColor: "bg-violet-50 dark:bg-violet-500/15", borderColor: "border-violet-200 dark:border-violet-400/30", badgeColor: "bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-200", iconBg: "bg-violet-100 dark:bg-violet-500/20" },
  bonding:     { label: "Bonding Activity",  emoji: "❤️", color: "text-rose-700 dark:text-rose-200",    bgColor: "bg-rose-50 dark:bg-rose-500/15",   borderColor: "border-rose-200 dark:border-rose-400/30",   badgeColor: "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200",   iconBg: "bg-rose-100 dark:bg-rose-500/20" },
};

// ─────────────────────────────────────────────────────────────
// LULLABY TRACKS (Web Audio API — zero cost)
// ─────────────────────────────────────────────────────────────
type LullabyTrack = { name: string; emoji: string; notes: number[]; tempo: number; timeOfDay?: "any" | "night" | "day" };

const LULLABY_TRACKS: LullabyTrack[] = [
  { name: "Twinkle Twinkle", emoji: "⭐", timeOfDay: "night", tempo: 0.45,
    notes: [261.63, 261.63, 392, 392, 440, 440, 392, 349.23, 349.23, 329.63, 329.63, 293.66, 293.66, 261.63] },
  { name: "Sleep Little One", emoji: "🌙", timeOfDay: "night", tempo: 0.6,
    notes: [329.63, 293.66, 261.63, 293.66, 329.63, 329.63, 329.63, 293.66, 293.66, 293.66, 329.63, 392, 392] },
  { name: "Gentle Lullaby", emoji: "🌸", timeOfDay: "any", tempo: 0.55,
    notes: [392, 349.23, 329.63, 293.66, 261.63, 293.66, 329.63, 349.23, 392, 392, 392, 349.23, 329.63] },
  { name: "Soft Cradle Song", emoji: "🧸", timeOfDay: "night", tempo: 0.5,
    notes: [261.63, 293.66, 329.63, 349.23, 392, 349.23, 329.63, 293.66, 261.63, 261.63, 261.63] },
  { name: "Happy Playtime", emoji: "☀️", timeOfDay: "day", tempo: 0.35,
    notes: [392, 440, 494, 392, 440, 494, 523, 494, 440, 392, 349.23, 392] },
  { name: "White Noise Dream", emoji: "🌊", timeOfDay: "any", tempo: 0.02,
    notes: Array.from({ length: 30 }, () => 100 + Math.random() * 50) },
];

function useLullabyPlayer() {
  const ctxRef = useRef<AudioContext | null>(null);
  const cancelRef = useRef(false);
  const oscRefs = useRef<OscillatorNode[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);

  const stopAll = useCallback(() => {
    cancelRef.current = true;
    oscRefs.current.forEach((o) => { try { o.stop(); } catch {} });
    oscRefs.current = [];
    setPlaying(null);
  }, []);

  const playTrack = useCallback((track: LullabyTrack) => {
    stopAll();
    setTimeout(() => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!ctxRef.current || ctxRef.current.state === "closed") ctxRef.current = new AudioCtx();
        const ctx = ctxRef.current;
        if (ctx.state === "suspended") ctx.resume();
        cancelRef.current = false;

        const schedule = (startTime: number) => {
          if (cancelRef.current) return;
          track.notes.forEach((freq, i) => {
            const t = startTime + i * track.tempo;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = track.name === "White Noise Dream" ? "sawtooth" : "sine";
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(track.name === "White Noise Dream" ? 0.04 : 0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + track.tempo * 0.85);
            osc.start(t);
            osc.stop(t + track.tempo);
            oscRefs.current.push(osc);
            if (i === track.notes.length - 1) {
              osc.onended = () => { if (!cancelRef.current) schedule(ctx.currentTime + 0.05); };
            }
          });
        };

        schedule(ctx.currentTime + 0.1);
        setPlaying(track.name);
      } catch (e) { console.error("Audio err", e); }
    }, 100);
  }, [stopAll]);

  useEffect(() => () => { stopAll(); }, [stopAll]);
  return { playTrack, stopAll, playing };
}

// ─────────────────────────────────────────────────────────────
// TipCard — interactive card with Next / I Understand
// ─────────────────────────────────────────────────────────────
function TipCard({ category, tips, ageRange }: { category: TipCategory; tips: Tip[]; ageRange: AgeRange }) {
  const storageKey = `amynest_tip_${category}_${ageRange}`;
  const meta = TIP_CATEGORY_META[category];

  const [index, setIndex] = useState<number>(() => {
    try {
      const seed = getTodaySeed();
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.date === seed) return parsed.index % tips.length;
      const startIdx = (seed + category.length) % tips.length;
      localStorage.setItem(storageKey, JSON.stringify({ date: seed, index: startIdx }));
      return startIdx;
    } catch { return 0; }
  });

  const [understood, setUnderstood] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_understood`);
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });

  const [justUnderstood, setJustUnderstood] = useState(false);

  const saveIndex = (i: number) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ date: getTodaySeed(), index: i }));
    } catch {}
  };

  const handleNext = () => {
    const next = (index + 1) % tips.length;
    setIndex(next);
    saveIndex(next);
    setJustUnderstood(false);
  };

  const handleUnderstand = () => {
    const next = (index + 1) % tips.length;
    const newSet = new Set(understood).add(index);
    setUnderstood(newSet);
    setJustUnderstood(true);
    try { localStorage.setItem(`${storageKey}_understood`, JSON.stringify([...newSet])); } catch {}
    setTimeout(() => {
      setJustUnderstood(false);
      setIndex(next);
      saveIndex(next);
    }, 900);
  };

  const tip = tips[index];
  const completedCount = understood.size;
  const totalCount = tips.length;

  return (
    <Card className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/40 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10 ${meta.iconBg}`}>
              <span className="text-2xl">{meta.emoji}</span>
            </div>
            <div>
              <h3 className={`font-quicksand text-base font-bold ${meta.color}`}>{meta.label}</h3>
              <p className="text-xs text-muted-foreground">{index + 1} of {totalCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <Badge className={`text-xs font-bold ${meta.badgeColor} border-0`}>
                ✅ {completedCount}/{totalCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Tip body */}
        <div className="px-5 py-4">
          {/* Progress dots */}
          <div className="flex gap-1 mb-4">
            {tips.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                  understood.has(i) ? "bg-green-400" :
                  i === index ? "bg-current opacity-70" : "bg-white/60"
                }`}
                style={{ color: meta.color.replace("text-", "") }}
              />
            ))}
          </div>

          <div className={`flex items-start gap-3 min-h-[64px] transition-all duration-300 ${justUnderstood ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
            <span className="text-2xl shrink-0 mt-0.5">{tip.emoji}</span>
            <p className={`text-sm leading-relaxed font-medium ${meta.color}`}>{tip.text}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className={`px-5 pb-5 flex gap-2`}>
          <Button
            size="sm"
            variant="outline"
            onClick={handleUnderstand}
            disabled={justUnderstood}
            className={`flex-1 rounded-full h-9 font-bold border-2 ${meta.borderColor} ${meta.color} bg-white/80 hover:bg-white transition-all`}
          >
            {justUnderstood ? (
              <><CheckCircle2 className="h-4 w-4 mr-1.5 text-green-500" />Got it!</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-1.5" />I Understand</>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleNext}
            className="rounded-full h-9 px-4 font-bold bg-foreground/10 text-foreground hover:bg-foreground/15 border-0 shadow-none"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Vaccination Timeline
// ─────────────────────────────────────────────────────────────
const VACCINES = [
  { age: "At Birth",  vaccines: ["BCG", "Hepatitis B (1)", "OPV 0"] },
  { age: "6 Weeks",   vaccines: ["DPT (1)", "OPV 1", "Hib", "Rotavirus", "PCV"] },
  { age: "10 Weeks",  vaccines: ["DPT (2)", "OPV 2", "Hib", "Rotavirus", "PCV"] },
  { age: "14 Weeks",  vaccines: ["DPT (3)", "OPV 3", "IPV", "Hib", "Rotavirus", "PCV"] },
  { age: "6 Months",  vaccines: ["Hepatitis B (2)", "OPV 4"] },
  { age: "9 Months",  vaccines: ["MMR (1)", "MR Vaccine"] },
  { age: "12 Months", vaccines: ["Hepatitis A", "Typhoid", "Varicella"] },
];

function monthToWeekApprox(months: number): number {
  return months * 4.33;
}

function getVaccineStatus(ageMonths: number, vaccineAgeStr: string): "done" | "due_soon" | "upcoming" {
  const map: Record<string, number> = {
    "At Birth": 0, "6 Weeks": 1.5, "10 Weeks": 2.5, "14 Weeks": 3.5,
    "6 Months": 6, "9 Months": 9, "12 Months": 12,
  };
  const vaccineMonth = map[vaccineAgeStr] ?? 99;
  if (ageMonths > vaccineMonth + 0.5) return "done";
  if (ageMonths >= vaccineMonth - 0.5) return "due_soon";
  return "upcoming";
}

// ─────────────────────────────────────────────────────────────
// Memory Moments
// ─────────────────────────────────────────────────────────────
interface Moment {
  id: string;
  text: string;
  date: string;
  emoji: string;
}

const MOMENT_EMOJIS = ["💫", "🌟", "❤️", "🎉", "😍", "✨", "🏆", "🥰"];

function MemoryMoments({ childName }: { childName: string }) {
  const storageKey = `amynest_moments_${childName}`;
  const [moments, setMoments] = useState<Moment[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const save = () => {
    if (!text.trim()) return;
    const newMoment: Moment = {
      id: Date.now().toString(),
      text: text.trim(),
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      emoji: MOMENT_EMOJIS[Math.floor(Math.random() * MOMENT_EMOJIS.length)],
    };
    const updated = [newMoment, ...moments].slice(0, 20);
    setMoments(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
    setText("");
    setAdding(false);
  };

  const remove = (id: string) => {
    const updated = moments.filter((m) => m.id !== id);
    setMoments(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
  };

  return (
    <Card className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-yellow-100 dark:bg-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
              <span className="text-2xl">📸</span>
            </div>
            <div>
              <h3 className="font-quicksand text-base font-bold text-foreground">Today's Moments</h3>
              <p className="text-xs text-muted-foreground">Save precious milestones & memories</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setAdding(!adding)}
            className="rounded-full h-8 px-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs border-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />Save Moment
          </Button>
        </div>

        {adding && (
          <div className="mb-4 flex gap-2">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder={`e.g. ${childName} laughed for the first time!`}
              className="flex-1 rounded-2xl border border-border bg-white/70 dark:bg-white/[0.06] px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
            <Button size="sm" onClick={save} className="rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold border-0 px-4">
              Save
            </Button>
          </div>
        )}

        {moments.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-sm text-yellow-700 dark:text-yellow-200 font-medium">No moments saved yet</p>
            <p className="text-xs text-yellow-600 mt-1">Tap "Save Moment" to capture today's memories</p>
          </div>
        ) : (
          <div className="space-y-2">
            {moments.map((m) => (
              <div key={m.id} className="flex items-start gap-3 bg-white/70 dark:bg-white/[0.05] rounded-2xl p-3 border border-white/60 dark:border-white/10 group">
                <span className="text-xl shrink-0">{m.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{m.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.date}</p>
                </div>
                <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-yellow-400 hover:text-rose-500 shrink-0 p-1">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// InfantMode — main component
// ─────────────────────────────────────────────────────────────
export type InfantShowOnly = "feeding" | "health" | "development" | "bonding" | "lullaby" | "vaccines" | "memory";

interface InfantModeProps {
  childName: string;
  ageYears: number;
  ageMonths: number;
  showOnly?: InfantShowOnly | null;
}

export function InfantMode({ childName, ageYears, ageMonths, showOnly }: InfantModeProps) {
  const totalMonths = ageYears * 12 + ageMonths;
  const ageRange = getAgeRange(totalMonths);
  const ageRangeLabel = getAgeRangeLabel(totalMonths);
  const isNight = isNightTime();

  const { playTrack, stopAll, playing } = useLullabyPlayer();

  const lullabyStorageKey = "amynest_lullaby_index";
  const [lullabyIndex, setLullabyIndex] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(lullabyStorageKey) || "0") % LULLABY_TRACKS.length; } catch { return 0; }
  });

  const [vacOpen, setVacOpen] = useState(false);

  const handleNextLullaby = () => {
    const next = (lullabyIndex + 1) % LULLABY_TRACKS.length;
    setLullabyIndex(next);
    try { localStorage.setItem(lullabyStorageKey, String(next)); } catch {}
    if (playing) playTrack(LULLABY_TRACKS[next]);
  };

  const currentTrack = LULLABY_TRACKS[lullabyIndex];

  // Suggested track based on time
  const suggestedTrack = isNight
    ? LULLABY_TRACKS.find((t) => t.timeOfDay === "night") ?? LULLABY_TRACKS[0]
    : LULLABY_TRACKS.find((t) => t.timeOfDay === "day") ?? LULLABY_TRACKS[4];

  const show = (section: InfantShowOnly) => !showOnly || showOnly === section;

  return (
    <div className="space-y-5">

      {/* ── Hero Banner — hidden when focused on a single category ── */}
      {!showOnly && <div className="bg-gradient-to-br from-pink-50 dark:from-pink-500/15 via-purple-50 dark:via-purple-500/15 to-indigo-50 dark:to-indigo-500/15 border-2 border-pink-200 dark:border-pink-400/30 rounded-3xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl animate-bounce-slow">👶</div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge className="bg-pink-100 dark:bg-pink-500/20 text-pink-800 dark:text-pink-200 border-pink-300 font-bold text-xs">Infant Mode</Badge>
              <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-200 border-purple-300 font-bold text-xs">
                Tips for {ageRangeLabel}
              </Badge>
            </div>
            <h2 className="font-quicksand text-xl font-bold text-foreground">{childName}'s Care Guide</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Age: {formatAge(ageYears, ageMonths)} • Personalized tips update each month
            </p>
          </div>
        </div>

        {/* Month progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5 font-medium">
            <span>Month {totalMonths}</span>
            <span>12 months</span>
          </div>
          <div className="h-2.5 bg-white/70 rounded-full overflow-hidden border border-pink-200 dark:border-pink-400/30">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (totalMonths / 12) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-purple-600 mt-1.5 font-medium text-center">
            {12 - Math.min(12, totalMonths)} month{12 - totalMonths !== 1 ? "s" : ""} until first birthday 🎂
          </p>
        </div>
      </div>}

      {/* ── 4 Interactive Tip Cards ── */}
      {(["feeding", "health", "development", "bonding"] as TipCategory[]).map((cat) =>
        show(cat as InfantShowOnly) ? (
          <TipCard
            key={cat}
            category={cat}
            tips={TIPS[cat][ageRange]}
            ageRange={ageRange}
          />
        ) : null
      )}

      {/* ── Lullaby Player ── */}
      {show("lullaby") && <Card className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-purple-100 dark:bg-purple-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
              <span className="text-2xl">🎵</span>
            </div>
            <div className="flex-1">
              <h3 className="font-quicksand text-base font-bold text-foreground">Lullaby Player</h3>
              <p className="text-xs text-muted-foreground">
                {isNight ? "🌙 Night mode — sleep melodies" : "☀️ Daytime — soft play sounds"}
              </p>
            </div>
            {playing && (
              <div className="flex gap-0.5 items-end h-5">
                {[3, 5, 4, 6, 3].map((h, i) => (
                  <div key={i} className="w-1 bg-purple-500 rounded-full animate-bounce" style={{ height: `${h * 3}px`, animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            )}
          </div>

          {/* Time-based suggestion */}
          {!playing && (
            <div className="bg-white/60 border border-purple-100 dark:border-purple-400/30 rounded-2xl p-3 mb-3 flex items-center gap-2">
              <span className="text-lg">{suggestedTrack.emoji}</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-purple-800 dark:text-purple-200">Recommended now</p>
                <p className="text-xs text-purple-600">{suggestedTrack.name}</p>
              </div>
              <Button
                size="sm"
                onClick={() => { setLullabyIndex(LULLABY_TRACKS.indexOf(suggestedTrack)); playTrack(suggestedTrack); }}
                className="rounded-full h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold border-0"
              >
                <Play className="h-3 w-3 mr-1" />Play
              </Button>
            </div>
          )}

          {/* Now playing / track list */}
          <div className="space-y-2">
            {LULLABY_TRACKS.map((track, i) => {
              const isPlaying = playing === track.name;
              const isCurrent = i === lullabyIndex;
              return (
                <div
                  key={track.name}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 border transition-all ${
                    isCurrent ? "bg-purple-100 dark:bg-purple-500/20 border-purple-300" : "bg-white/60 border-purple-100 dark:border-purple-400/30"
                  }`}
                >
                  <span className="text-lg">{track.emoji}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${isCurrent ? "text-purple-900 dark:text-purple-100" : "text-purple-800 dark:text-purple-200"}`}>{track.name}</p>
                    {track.timeOfDay !== "any" && (
                      <p className="text-[10px] text-purple-500 font-medium">{track.timeOfDay === "night" ? "🌙 Night" : "☀️ Daytime"}</p>
                    )}
                  </div>
                  {isPlaying ? (
                    <Button size="sm" variant="outline" onClick={stopAll} className="rounded-full h-7 px-2 border-purple-300 text-purple-700 dark:text-purple-200 text-xs">
                      <Square className="h-3 w-3 mr-1" />Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => { setLullabyIndex(i); playTrack(track); }} className="rounded-full h-7 px-2 bg-purple-600 hover:bg-purple-700 text-white text-xs border-0">
                      <Play className="h-3 w-3 mr-1" />Play
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Next song button */}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextLullaby}
              className="flex-1 rounded-full h-9 border-purple-300 text-purple-700 dark:text-purple-200 font-bold text-sm hover:bg-purple-100 dark:bg-purple-500/20"
            >
              <SkipForward className="h-4 w-4 mr-1.5" />Next Song
            </Button>
            {playing && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopAll}
                className="rounded-full h-9 px-4 border-rose-300 text-rose-700 dark:text-rose-200 font-bold text-sm hover:bg-rose-50 dark:bg-rose-500/15"
              >
                <Square className="h-4 w-4 mr-1" />Stop
              </Button>
            )}
          </div>

          <p className="text-[10px] text-purple-500 mt-3 text-center">
            🎵 All melodies generated by your browser — no internet needed
          </p>
        </CardContent>
      </Card>}

      {/* ── Vaccination Timeline (Collapsible) ── */}
      {show("vaccines") && <Card className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]">
        <button
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/40 dark:hover:bg-white/[0.03] transition-colors"
          onClick={() => setVacOpen(!vacOpen)}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
              <span className="text-2xl">💉</span>
            </div>
            <div className="text-left">
              <h3 className="font-quicksand text-base font-bold text-foreground">Vaccination Schedule</h3>
              <p className="text-xs text-muted-foreground">Track your baby's immunization journey</p>
            </div>
          </div>
          <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border border-border/50 bg-white/50 dark:bg-white/5 transition-transform duration-300 ${vacOpen ? "rotate-180 text-primary border-primary/40" : "text-muted-foreground"}`}>
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
        {vacOpen && (
          <CardContent className="px-5 pb-5 pt-0 space-y-2">
            <p className="text-xs text-blue-600 font-medium mb-3">⚠️ Always follow your pediatrician's advice. General Indian IAP schedule.</p>
            {VACCINES.map((v) => {
              const status = getVaccineStatus(totalMonths, v.age);
              return (
                <div key={v.age} className={`rounded-xl p-3 border flex items-start gap-3 transition-all ${
                  status === "done" ? "bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-400/30" :
                  status === "due_soon" ? "bg-amber-50 dark:bg-amber-500/15 border-amber-300 ring-1 ring-amber-300" :
                  "bg-white border-blue-100 dark:border-blue-400/30"
                }`}>
                  <div className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 whitespace-nowrap ${
                    status === "done" ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-200" :
                    status === "due_soon" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200" :
                    "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200"
                  }`}>
                    {status === "done" ? "✅" : status === "due_soon" ? "⚡" : "📅"} {v.age}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {v.vaccines.map((vac) => (
                      <span key={vac} className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                        status === "done" ? "bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-400/30 text-green-800 dark:text-green-200" :
                        status === "due_soon" ? "bg-amber-50 dark:bg-amber-500/15 border-amber-300 text-amber-900 dark:text-amber-100" :
                        "bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-400/30 text-blue-800 dark:text-blue-200"
                      }`}>{vac}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>}

      {/* ── Memory Moments ── */}
      {show("memory") && <MemoryMoments childName={childName} />}

    </div>
  );
}
