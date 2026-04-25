import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown,
  Lightbulb, RotateCcw, Heart, Eye, MessageCircle,
} from "lucide-react";

// ─── Cue Categories ───────────────────────────────────────────────────────────
type CueCategory = "hunger" | "sleep" | "overstim" | "discomfort";

const CATEGORY_META: Record<CueCategory, { label: string; emoji: string; color: string; bg: string }> = {
  hunger:     { label: "Hunger",          emoji: "🍼", color: "text-amber-700 dark:text-amber-300",   bg: "bg-amber-100 dark:bg-amber-500/20" },
  sleep:      { label: "Sleep",           emoji: "😴", color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-100 dark:bg-indigo-500/20" },
  overstim:   { label: "Overstimulation", emoji: "🌀", color: "text-rose-700 dark:text-rose-300",     bg: "bg-rose-100 dark:bg-rose-500/20" },
  discomfort: { label: "Discomfort",      emoji: "🤕", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-500/20" },
};

// ─── Cue Library ──────────────────────────────────────────────────────────────
type Cue = {
  id: string;
  emoji: string;
  label: string;
  category: CueCategory;
  insight: string;   // what baby is communicating
  reason: string;    // why this behavior happens
  action: string;    // what parent should do
  /** inclusive lower bound months — for filtering by age */
  fromMonths: number;
  /** exclusive upper bound months */
  toMonths: number;
};

const CUES: Cue[] = [
  // ── HUNGER ──────────────────────────────────────────────────────────────
  {
    id: "rooting",
    emoji: "👶",
    label: "Rooting / mouth open",
    category: "hunger",
    insight: "Baby is asking for milk — early hunger cue.",
    reason: "Newborns instinctively turn their head and open their mouth toward anything that touches their cheek. It's a reflex hard-wired for finding the breast.",
    action: "Offer breast or bottle now. Catching hunger early means a calmer, more efficient feed than waiting until crying starts.",
    fromMonths: 0, toMonths: 8,
  },
  {
    id: "lip_smacking",
    emoji: "👄",
    label: "Lip smacking",
    category: "hunger",
    insight: "Baby is hungry — early signal.",
    reason: "Anticipating food. Saliva glands activate before crying does — this is your earliest window to feed.",
    action: "Begin a feed in the next 5 minutes for the easiest latch and least fuss.",
    fromMonths: 0, toMonths: 12,
  },
  {
    id: "hands_to_mouth",
    emoji: "🤲",
    label: "Hands to mouth",
    category: "hunger",
    insight: "Mid-stage hunger cue.",
    reason: "Baby uses their own hands as a substitute for the breast/bottle. Self-soothing while waiting.",
    action: "Feed now. If you wait, hunger will escalate to crying within 5–10 minutes.",
    fromMonths: 0, toMonths: 8,
  },
  {
    id: "fussy_feed_time",
    emoji: "😤",
    label: "Fussy near usual feed time",
    category: "hunger",
    insight: "Late-stage hunger — feed urgently.",
    reason: "Once a baby starts crying from hunger, it gets harder to latch and they swallow more air.",
    action: "Calm baby first (cuddle, swaying), then offer milk. Don't try to feed mid-cry.",
    fromMonths: 0, toMonths: 12,
  },
  {
    id: "biting_food",
    emoji: "🍴",
    label: "Reaching for your food",
    category: "hunger",
    insight: "Ready for solids exploration.",
    reason: "Around 6 months babies show real interest in family food — a developmental signal of solid-food readiness.",
    action: "Offer a small spoon of soft puree (banana, dal water, sweet potato). One new food at a time.",
    fromMonths: 5, toMonths: 24,
  },

  // ── SLEEP ────────────────────────────────────────────────────────────────
  {
    id: "yawning",
    emoji: "🥱",
    label: "Yawning",
    category: "sleep",
    insight: "Sleep window is opening — wind down.",
    reason: "Yawning increases oxygen flow as the body prepares for rest. The first yawn is the START of the sleep window.",
    action: "Begin nap routine NOW: dim lights, quiet voice, swaddle (if under 4m). Aim to be in the cot within 10 min.",
    fromMonths: 0, toMonths: 24,
  },
  {
    id: "eye_rubbing",
    emoji: "😪",
    label: "Eye rubbing",
    category: "sleep",
    insight: "Tired — sleep window is mid-stage.",
    reason: "Eyes water as melatonin rises; rubbing soothes the dryness and is a clear sign baby is past the early sleepy phase.",
    action: "Skip stimulating play. Move straight to nap routine. Past this point, overtiredness is close.",
    fromMonths: 0, toMonths: 24,
  },
  {
    id: "staring",
    emoji: "👀",
    label: "Glazed staring into space",
    category: "sleep",
    insight: "Earliest sleep cue — easy to miss.",
    reason: "When baby disengages from stimuli, the brain is starting to slow down. This is the BEST window to start nap.",
    action: "Stop play, dim lights, start nap routine. Catching this cue means an easy fall-asleep.",
    fromMonths: 0, toMonths: 18,
  },
  {
    id: "ear_pulling",
    emoji: "👂",
    label: "Pulling at ears",
    category: "sleep",
    insight: "Could be tired — or teething/ear issue.",
    reason: "Tired babies often touch their face/ears as self-soothing. But persistent ear-pulling with fever could be ear infection.",
    action: "If close to nap time, treat as sleep cue. If with fever or pain crying, check with paediatrician.",
    fromMonths: 0, toMonths: 18,
  },
  {
    id: "head_turn_away",
    emoji: "↩️",
    label: "Turning head away from toys",
    category: "sleep",
    insight: "Baby has had enough — needs sleep.",
    reason: "When baby actively breaks from interaction, their nervous system is asking for downtime.",
    action: "Move to a quiet, dim space and start the nap routine.",
    fromMonths: 0, toMonths: 18,
  },
  {
    id: "whiny_crying",
    emoji: "😭",
    label: "Whiny crying (no other cause)",
    category: "sleep",
    insight: "Already overtired — recover gently.",
    reason: "Past the sleep window, cortisol rises and makes falling asleep harder. Whiny crying without hunger/discomfort is the late-stage signal.",
    action: "Skip stimulating play. Use motion (rocking, stroller, carrier) plus white noise to break through the overtired barrier.",
    fromMonths: 0, toMonths: 24,
  },

  // ── OVERSTIMULATION ─────────────────────────────────────────────────────
  {
    id: "gaze_aversion",
    emoji: "🙈",
    label: "Looking away during play",
    category: "overstim",
    insight: "Sensory system needs a break.",
    reason: "Baby's brain processes sensory input slowly. Looking away is their only way to say 'too much, give me a moment'.",
    action: "Pause. Speak softly, lower stimulation. Wait for them to re-engage on their own — don't force eye contact.",
    fromMonths: 0, toMonths: 12,
  },
  {
    id: "arching_back",
    emoji: "🌀",
    label: "Arching back / pushing away",
    category: "overstim",
    insight: "Too much stimulation — back off.",
    reason: "When the nervous system is flooded, the body physically tries to escape the source. This is not rejection of you — it's overload.",
    action: "Move to a calmer environment. Hold baby close upright with no toys/sounds for 2–3 min until they settle.",
    fromMonths: 0, toMonths: 12,
  },
  {
    id: "rigid_body",
    emoji: "🥶",
    label: "Tense / rigid body",
    category: "overstim",
    insight: "Stress response activated.",
    reason: "Stiffness signals the sympathetic ('fight') nervous system has taken over. Common after long visits or noisy environments.",
    action: "Walk to a quiet room. Hum softly while gently swaying. Skin-to-skin works wonders here.",
    fromMonths: 0, toMonths: 18,
  },
  {
    id: "intense_crying_no_cause",
    emoji: "🆘",
    label: "Intense crying, no obvious cause",
    category: "overstim",
    insight: "Overstimulated and dysregulated.",
    reason: "When fed, dry, and rested but still crying intensely — usually overload from a busy day, too many people, too much noise.",
    action: "Quiet, dim room + white noise + close hold. Reduce all input. Recovery takes 10–20 min.",
    fromMonths: 0, toMonths: 12,
  },
  {
    id: "hands_over_face",
    emoji: "🫣",
    label: "Hands over face / eyes",
    category: "overstim",
    insight: "Visually overwhelmed.",
    reason: "Blocking the visual field is a self-protection reflex when the brain can't process more input.",
    action: "Reduce visual stimulation: turn off screens, dim lights. Carry baby facing inward toward your chest.",
    fromMonths: 0, toMonths: 18,
  },

  // ── DISCOMFORT ───────────────────────────────────────────────────────────
  {
    id: "legs_to_belly",
    emoji: "🥒",
    label: "Pulling legs to belly",
    category: "discomfort",
    insight: "Possibly gassy or constipated.",
    reason: "Trapped wind or stool causes belly cramps — pulling legs up tries to relieve the pressure.",
    action: "Bicycle baby's legs gently. Tummy massage clockwise. Burp upright. If worse than 2 hrs, check with doctor.",
    fromMonths: 0, toMonths: 12,
  },
  {
    id: "sudden_scream",
    emoji: "📢",
    label: "Sudden sharp scream",
    category: "discomfort",
    insight: "Sharp pain spike — investigate.",
    reason: "A high-pitched sudden cry differs from regular fussing. Can be reflux, gas, a hair tourniquet, or something poking.",
    action: "Check: nappy area, fingers and toes for hair wraps, clothing tags, ears. Hold upright. Persistent → call doctor.",
    fromMonths: 0, toMonths: 12,
  },
  {
    id: "clenched_fists",
    emoji: "✊",
    label: "Tightly clenched fists + crying",
    category: "discomfort",
    insight: "Body is in distress.",
    reason: "Clenched fists with stiff body and crying = pain or significant discomfort, not hunger or tiredness.",
    action: "Check temperature, nappy, clothing. Try upright cuddle with skin-to-skin. If unrelenting, call paediatrician.",
    fromMonths: 0, toMonths: 12,
  },
  {
    id: "red_face_strain",
    emoji: "😡",
    label: "Red face + straining",
    category: "discomfort",
    insight: "Often pooping or trying to.",
    reason: "Babies grunt and turn red while passing stool — abdominal muscles aren't fully coordinated yet. Usually normal.",
    action: "Don't intervene unless distressed. Bicycle legs help. If no poo for 3+ days with hard stools, call doctor.",
    fromMonths: 0, toMonths: 12,
  },
  {
    id: "squirming_after_feed",
    emoji: "↩️",
    label: "Squirming after feeding",
    category: "discomfort",
    insight: "Possibly trapped wind or reflux.",
    reason: "Air swallowed during feed needs to come out, or stomach acid is flowing back up the oesophagus.",
    action: "Hold upright 20–30 min after feed. Burp every few minutes. If frequent vomiting, mention to doctor.",
    fromMonths: 0, toMonths: 9,
  },
  {
    id: "teething_drool",
    emoji: "💧",
    label: "Lots of drool + chewing fists",
    category: "discomfort",
    insight: "Teeth pushing through gums.",
    reason: "Inflammation around erupting teeth causes gum pain and excess saliva. Usually starts 4–7 months.",
    action: "Cold teething ring (not frozen). Gentle gum rub with clean finger. NO benzocaine gels.",
    fromMonths: 4, toMonths: 24,
  },
];

// ─── Serve-and-Return Micro-interactions ──────────────────────────────────────
type MicroAction = {
  id: string;
  emoji: string;
  title: string;
  body: string;
  fromMonths: number;
  toMonths: number;
};

const MICRO_ACTIONS: MicroAction[] = [
  { id: "ma1", emoji: "👁️", title: "Catch their gaze", body: "Get face-to-face about 30 cm away. When baby makes eye contact, hold it and smile. Wait — they'll smile back. That's a 'serve' returned.", fromMonths: 0, toMonths: 6 },
  { id: "ma2", emoji: "🗣️", title: "Mirror their sound", body: "When baby coos or babbles, copy the exact sound back. Pause. They'll often try again — you've started a conversation.", fromMonths: 1, toMonths: 12 },
  { id: "ma3", emoji: "🎶", title: "Sing the same song", body: "Pick ONE song and sing it during a regular activity (bath, change). Repetition builds anticipation — they'll soon move with the rhythm.", fromMonths: 0, toMonths: 24 },
  { id: "ma4", emoji: "🤲", title: "Offer two choices", body: "Hold up two items: 'Spoon or cup?' Wait. Baby will reach toward one. You've handed over agency — even at this age.", fromMonths: 8, toMonths: 24 },
  { id: "ma5", emoji: "📖", title: "One-page reading", body: "Open a book, point to one picture and name it slowly. 'Cat. Meow.' Close. That's enough — quality > duration.", fromMonths: 4, toMonths: 24 },
  { id: "ma6", emoji: "🎈", title: "Slow surprise", body: "Cover a toy with a cloth, pause 2 seconds, then reveal. Watch their face — anticipation is a learning superpower.", fromMonths: 5, toMonths: 18 },
  { id: "ma7", emoji: "👏", title: "Clap when they try", body: "When baby attempts ANYTHING new (rolling, babbling, reaching), clap and cheer. Celebration cements neural pathways.", fromMonths: 2, toMonths: 24 },
  { id: "ma8", emoji: "🤫", title: "Pause for the pause", body: "After speaking to baby, count 5 seconds silently. Babies need processing time. Most parents jump in too fast.", fromMonths: 0, toMonths: 24 },
  { id: "ma9", emoji: "🧸", title: "Name what they touch", body: "Whatever baby reaches for, calmly name it: 'Yes, that's the spoon. Cool spoon.' Vocabulary grows from joint attention.", fromMonths: 6, toMonths: 24 },
  { id: "ma10", emoji: "💃", title: "Move to their rhythm", body: "Watch how baby is moving — kicking, swaying. Move with them in the same rhythm. They'll feel SEEN, the deepest bond builder.", fromMonths: 0, toMonths: 12 },
  { id: "ma11", emoji: "🌈", title: "Narrate one moment", body: "While dressing or feeding, narrate one full sentence in slow, sing-song tone: 'Now we put your little arm in the SOFT sleeve.' Heard words = future spoken words.", fromMonths: 0, toMonths: 18 },
  { id: "ma12", emoji: "🦶", title: "Joyful foot play", body: "Sit baby on your lap. Hold their feet, do 'This Little Piggy' on each toe. Predictable rhythm + touch = bonding gold.", fromMonths: 3, toMonths: 18 },
];

function getCuesForAge(months: number): Cue[] {
  return CUES.filter((c) => months >= c.fromMonths && months < c.toMonths);
}

function getMicroActions(months: number): MicroAction[] {
  return MICRO_ACTIONS.filter((m) => months >= m.fromMonths && months < m.toMonths);
}

// ─── Baby Cues Engine ─────────────────────────────────────────────────────────
export function BabyCuesEngine({ childName, ageMonths }: { childName: string; ageMonths: number }) {
  const { toast } = useToast();
  const cues = useMemo(() => getCuesForAge(ageMonths), [ageMonths]);
  const [activeCueId, setActiveCueId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<CueCategory | "all">("all");
  const [feedbackKey, setFeedbackKey] = useState(0);

  const filtered = useMemo(
    () => filterCat === "all" ? cues : cues.filter((c) => c.category === filterCat),
    [cues, filterCat],
  );

  const activeCue = activeCueId ? cues.find((c) => c.id === activeCueId) ?? null : null;
  const activeIdx = activeCue ? filtered.findIndex((c) => c.id === activeCue.id) : -1;

  const goPrev = () => {
    if (activeIdx <= 0) return;
    setActiveCueId(filtered[activeIdx - 1].id);
    setFeedbackKey((k) => k + 1);
  };
  const goNext = () => {
    if (activeIdx < 0 || activeIdx >= filtered.length - 1) return;
    setActiveCueId(filtered[activeIdx + 1].id);
    setFeedbackKey((k) => k + 1);
  };

  return (
    <div className="space-y-3">
      {/* Intro */}
      <p className="text-[12px] text-muted-foreground leading-snug">
        Tap any behaviour you're noticing in {childName}. The engine will explain what it means and what to do.
      </p>

      {/* Category Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        <button
          onClick={() => setFilterCat("all")}
          className={[
            "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border backdrop-blur-md",
            filterCat === "all"
              ? "bg-violet-500 text-white border-violet-500 shadow-[0_4px_12px_-2px_rgba(139,92,246,0.5)]"
              : "bg-white/50 dark:bg-white/5 border-border text-muted-foreground hover:border-violet-300",
          ].join(" ")}
        >
          All
        </button>
        {(Object.entries(CATEGORY_META) as [CueCategory, typeof CATEGORY_META[CueCategory]][]).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setFilterCat(key)}
            className={[
              "shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border backdrop-blur-md",
              filterCat === key
                ? `${meta.bg} ${meta.color} border-current shadow-[0_0_0_1px_currentColor]`
                : "bg-white/50 dark:bg-white/5 border-border text-muted-foreground hover:border-violet-300",
            ].join(" ")}
          >
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
          </button>
        ))}
      </div>

      {/* Cue Buttons Grid */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.map((cue) => {
          const meta = CATEGORY_META[cue.category];
          const isActive = activeCueId === cue.id;
          return (
            <button
              key={cue.id}
              onClick={() => { setActiveCueId(cue.id); setFeedbackKey((k) => k + 1); }}
              className={[
                "rounded-xl px-3 py-2.5 text-left transition-all border-2 backdrop-blur-md",
                isActive
                  ? `${meta.bg} border-current ${meta.color} shadow-[0_0_0_2px_currentColor,0_8px_24px_-8px_rgba(139,92,246,0.4)]`
                  : "bg-white/60 dark:bg-white/5 border-border hover:border-primary/40",
              ].join(" ")}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl leading-none shrink-0">{cue.emoji}</span>
                <span className={`text-[12px] font-semibold leading-tight ${isActive ? meta.color : "text-foreground"}`}>
                  {cue.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Cue Detail Card with swipe nav */}
      {activeCue && (
        <div
          key={activeCue.id}
          className="relative rounded-2xl bg-gradient-to-br from-white/90 to-violet-50/60 dark:from-white/10 dark:to-violet-900/20 border-2 border-violet-300/60 dark:border-violet-400/30 backdrop-blur-xl p-4 shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_18px_50px_-12px_rgba(168,85,247,0.45)] animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {/* Header with category pill */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${CATEGORY_META[activeCue.category].bg} ${CATEGORY_META[activeCue.category].color}`}>
              <span>{CATEGORY_META[activeCue.category].emoji}</span>
              <span className="uppercase tracking-wide">{CATEGORY_META[activeCue.category].label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {activeIdx + 1} / {filtered.length}
            </p>
          </div>

          {/* Cue title */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl leading-none">{activeCue.emoji}</span>
            <p className="font-bold text-base text-foreground leading-tight">{activeCue.label}</p>
          </div>

          {/* Insight / Reason / Action */}
          <div className="space-y-2.5">
            <div className="rounded-lg bg-violet-50/80 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">What it means</p>
              </div>
              <p className="text-[13px] text-violet-900 dark:text-violet-100 leading-snug font-semibold">{activeCue.insight}</p>
            </div>
            <div className="rounded-lg bg-sky-50/80 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-400/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Eye className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">Why this happens</p>
              </div>
              <p className="text-[12px] text-sky-900/90 dark:text-sky-100/90 leading-snug">{activeCue.reason}</p>
            </div>
            <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-400/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Lightbulb className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">What to do</p>
              </div>
              <p className="text-[12px] text-emerald-900/90 dark:text-emerald-100/90 leading-snug">{activeCue.action}</p>
            </div>
          </div>

          {/* Feedback + Swipe Nav */}
          <div key={feedbackKey} className="mt-3.5 flex items-center justify-between gap-2 pt-3 border-t border-border/40">
            <button
              onClick={goPrev}
              disabled={activeIdx <= 0}
              className="p-1.5 rounded-full bg-white/60 dark:bg-white/10 border border-border disabled:opacity-30 hover:border-violet-400 transition-all"
              aria-label="Previous cue"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-muted-foreground mr-1">Helpful?</p>
              <button
                onClick={() => toast({ description: "Glad it helped 💜" })}
                className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:scale-110 transition-transform"
                aria-label="Helpful"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => toast({ description: "Got it — try the next cue or check Sleep Module." })}
                className="p-1.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:scale-110 transition-transform"
                aria-label="Not helpful"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={goNext}
              disabled={activeIdx < 0 || activeIdx >= filtered.length - 1}
              className="p-1.5 rounded-full bg-white/60 dark:bg-white/10 border border-border disabled:opacity-30 hover:border-violet-400 transition-all"
              aria-label="Next cue"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {!activeCue && filtered.length > 0 && (
        <div className="rounded-xl border-2 border-dashed border-border/60 px-3 py-4 text-center">
          <p className="text-[11px] text-muted-foreground">Tap a behaviour above to decode it</p>
        </div>
      )}
    </div>
  );
}

// ─── Communication Coaching — "Try This Now" rotating micro-actions ──────────
export function CommunicationCoaching({ ageMonths }: { ageMonths: number }) {
  const actions = useMemo(() => getMicroActions(ageMonths), [ageMonths]);

  // Pick action contextually: time-of-day + age band rotate
  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${Math.floor(d.getHours() / 4)}`;
  }, []);

  // Stable but rotating index across the day
  const startIdx = useMemo(() => {
    if (actions.length === 0) return 0;
    let h = 0;
    for (let i = 0; i < todayKey.length; i++) h = (h * 31 + todayKey.charCodeAt(i)) | 0;
    return Math.abs(h) % actions.length;
  }, [todayKey, actions.length]);

  const [idx, setIdx] = useState(startIdx);
  useEffect(() => { setIdx(startIdx); }, [startIdx]);

  const { toast } = useToast();

  if (actions.length === 0) {
    return <p className="text-xs text-muted-foreground">No micro-actions for this age yet.</p>;
  }

  const action = actions[idx % actions.length];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-100/80 to-rose-100/80 dark:from-fuchsia-900/30 dark:to-rose-900/30 border border-fuchsia-300/60 dark:border-fuchsia-400/30 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">Try This Now</p>
          </div>
          <span className="text-[10px] text-fuchsia-600/80 dark:text-fuchsia-400/80">Serve & Return</span>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none shrink-0">{action.emoji}</span>
          <div className="min-w-0">
            <p className="font-bold text-base text-fuchsia-900 dark:text-fuchsia-100 leading-tight mb-1">{action.title}</p>
            <p className="text-[12px] text-fuchsia-800/85 dark:text-fuchsia-100/85 leading-relaxed">{action.body}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-fuchsia-300/40 dark:border-fuchsia-400/20">
          <button
            onClick={() => toast({ description: "Logged — keep it up 🌟" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-500 text-white text-[11px] font-bold hover:bg-fuchsia-600 transition-colors"
          >
            <Heart className="h-3 w-3" />
            I tried this
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % actions.length)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 border border-fuchsia-300/40 text-fuchsia-700 dark:text-fuchsia-300 text-[11px] font-bold hover:border-fuchsia-500 transition-all"
          >
            <RotateCcw className="h-3 w-3" />
            Another idea
          </button>
        </div>

        <p className="mt-2 text-[10px] text-fuchsia-600/70 dark:text-fuchsia-400/70 text-center">
          {idx + 1} / {actions.length} · refreshes during the day
        </p>
      </div>

      {/* Mini explainer */}
      <div className="rounded-xl bg-white/50 dark:bg-white/5 border border-border p-3 flex items-start gap-2">
        <Sparkles className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-snug">
          <span className="font-bold text-foreground">Serve and return</span> means responding to baby's signals — a sound, a look, a gesture — so they learn that what they do matters. It's the #1 brain-builder in the first 2 years.
        </p>
      </div>
    </div>
  );
}
