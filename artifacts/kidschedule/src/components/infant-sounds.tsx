import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, ChevronDown, Volume2, VolumeX, Info, Play, Pause, X, Clock, Sparkles, Plus } from "lucide-react";
import { useSoundEngine, type SoundId, type SoundEngine } from "@/hooks/use-sound-engine";
import { InfantPoems } from "./infant-poems";

// ─── Types ─────────────────────────────────────────────────────────────────
import { useTranslation } from "react-i18next";
type NoiseType = {
  id: SoundId;
  emoji: string;
  label: string;
  desc: string;
  bestFor: string;
  /** Tailwind gradient classes for the active state + fullscreen background. */
  gradient: string;
  /** Hex tint used in inline styles where Tailwind JIT can't reach (e.g. orb glow). */
  tint: string;
  /** Animation type for the tile icon while playing. */
  iconAnim: "spin" | "pulse" | "float" | "bounce" | "wave";
};

// ─── White Noise Data ───────────────────────────────────────────────────────
const NOISE_TYPES: NoiseType[] = [{
  id: "shush",
  emoji: "🫁",
  label: "Shushing",
  desc: "A rhythmic 'shhhh' sound — the closest thing to what baby heard in the womb. Air rushing through blood vessels + muffled heartbeat = built-in white noise.",
  bestFor: "Newborns (0–4 months), overtired or inconsolable crying",
  gradient: "from-primary via-primary to-primary",
  tint: "hsl(var(--brand-cyan-500))",
  iconAnim: "wave"
}, {
  id: "rain",
  emoji: "🌧️",
  label: "Rain",
  desc: "Consistent broadband noise that masks household sounds — TV, voices, traffic. Rain is the most universally soothing for babies.",
  bestFor: "All ages, especially 2–12 months for naps in noisy homes",
  gradient: "from-primary via-primary to-muted",
  tint: "hsl(var(--brand-indigo-600))",
  iconAnim: "float"
}, {
  id: "fan",
  emoji: "🌀",
  label: "Fan",
  desc: "Low-frequency rumble that deeply masks sound and has a grounding effect. Many parents swear by a real fan rather than a recording.",
  bestFor: "Overtired newborns, summer sleep, colicky phases",
  gradient: "from-muted via-muted to-muted",
  tint: "#71717a",
  iconAnim: "spin"
}, {
  id: "heartbeat",
  emoji: "💓",
  label: "Heartbeat",
  desc: "Mimics the sound baby heard for 9 months inside the womb. Deeply familiar and calming, especially in the 4th trimester (first 3 months).",
  bestFor: "Newborns 0–3 months, transition from arms to cot",
  gradient: "from-primary via-primary to-primary",
  tint: "hsl(var(--brand-pink-500))",
  iconAnim: "pulse"
}, {
  id: "pink",
  emoji: "🔊",
  label: "Pink Noise",
  desc: "Like white noise but weighted to lower frequencies — more like rushing water than static. Many babies and toddlers prefer it over pure white noise.",
  bestFor: "Older babies 6 months+, toddlers who've outgrown white noise",
  gradient: "from-primary via-primary to-primary",
  tint: "hsl(var(--brand-purple-500))",
  iconAnim: "wave"
}, {
  id: "white",
  emoji: "📻",
  label: "White Noise",
  desc: "Pure broadband static — every frequency at equal energy. The classic 'TV between channels' sound. Most universally tested with newborns.",
  bestFor: "Newborns 0–4 months, masking loud household noise",
  gradient: "from-muted via-muted to-muted",
  tint: "#9ca3af",
  iconAnim: "wave"
}, {
  id: "womb",
  emoji: "🫀",
  label: "Womb",
  desc: "Recordings combining heartbeat, blood flow, and muffled voice. The most complete recreation of the womb sound environment.",
  bestFor: "Newborns 0–6 weeks, especially premature or NICU graduates",
  gradient: "from-primary via-primary to-primary",
  tint: "hsl(var(--brand-rose-500))",
  iconAnim: "pulse"
}];
type AgeTip = {
  band: string;
  fromMonths: number;
  toMonths: number;
  headline: string;
  tip: string;
  volume: string;
  /** Sound IDs that work best at this age — used by the smart suggestion strip. */
  recommended: SoundId[];
};
const AGE_TIPS: AgeTip[] = [{
  band: "0–3 months",
  fromMonths: 0,
  toMonths: 3,
  headline: "White noise is a lifesaver right now",
  tip: "The 4th trimester — baby is adjusting to a world that is too quiet, too bright, and too still. White noise recreates the womb environment. Use it freely during sleep and fussy periods.",
  volume: "About as loud as a shower — roughly 60–65 dB. Never louder.",
  recommended: ["shush", "heartbeat", "womb"]
}, {
  band: "3–6 months",
  fromMonths: 3,
  toMonths: 6,
  headline: "Keep using it, but start fading volume",
  tip: "White noise is still helpful — especially for naps — but you can start to gradually lower the volume as baby becomes more settled. They're also responding to music now, so songs are great for awake time.",
  volume: "50–60 dB. Keep the source at least 30 cm from baby's head.",
  recommended: ["rain", "shush", "white"]
}, {
  band: "6–12 months",
  fromMonths: 6,
  toMonths: 12,
  headline: "Use for sleep, shift to music for play",
  tip: "White noise for naps and night sleep is fine at this age. During awake play, songs and rhythmic music do more developmental work. Start to view them as different tools — noise for sleep, music for play.",
  volume: "Keep at 50 dB or below for this age. A quiet fan is a good reference.",
  recommended: ["rain", "fan", "pink"]
}, {
  band: "12–24 months",
  fromMonths: 12,
  toMonths: 24,
  headline: "Begin gentle weaning from white noise",
  tip: "If your toddler still needs white noise for every sleep, start fading it slowly — reduce volume by a notch each week, then try turning it off 30 minutes after they've fallen asleep. Aim to be free of it by 2 years.",
  volume: "40–50 dB maximum. If they can talk over it easily, that's about right.",
  recommended: ["rain", "pink"]
}];

// NOTE: The old `SONGS` catalogue + `getSongs()` helper were removed when the
// "Songs & Lullabies" tab was replaced by the new age-wise Poems module
// (Spec 3). The poem catalogue lives in `@/data/infant-poems` and is rendered
// by `InfantPoems` from `./infant-poems`.

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getAgeTip(months: number): AgeTip {
  return AGE_TIPS.find(t => months >= t.fromMonths && months < t.toMonths) ?? AGE_TIPS[AGE_TIPS.length - 1];
}

/** Pick the single "best for sleep RIGHT NOW" recommendation for the strip
 *  based on age + clock time. Evening + young baby → heartbeat. Late night
 *  for any age → rain. Nap window for older baby → fan. */
function getSmartSuggestion(months: number, hour: number): {
  id: SoundId;
  reason: string;
} {
  if (hour >= 22 || hour < 6) {
    return {
      id: "rain",
      reason: "Late-night masking — keeps deep sleep undisturbed"
    };
  }
  if (months <= 3) {
    return {
      id: "heartbeat",
      reason: "4th-trimester favourite — most calming for newborns"
    };
  }
  if (hour >= 12 && hour < 16) {
    return {
      id: "fan",
      reason: "Afternoon nap window — low rumble works best"
    };
  }
  if (months >= 6) {
    return {
      id: "pink",
      reason: "Softer than white noise for older babies"
    };
  }
  return {
    id: "shush",
    reason: "The classic settle-down sound for fussy phases"
  };
}
function formatRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}
const TIMER_OPTIONS: {
  label: string;
  ms: number | null;
}[] = [{
  label: "Off",
  ms: null
}, {
  label: "15m",
  ms: 15 * 60 * 1000
}, {
  label: "30m",
  ms: 30 * 60 * 1000
}, {
  label: "1h",
  ms: 60 * 60 * 1000
}];

// ─── Main Component ──────────────────────────────────────────────────────────
export function WhiteNoiseLullaby({
  ageMonths
}: {
  ageMonths: number;
}) {
  const {
    t
  } = useTranslation();
  // Tab state: "noise" → immersive WebAudio engine; "poems" → age-wise
  // local-only poems module (Spec 3, replaces the old singing-guide list).
  const [tab, setTab] = useState<"noise" | "poems">("noise");
  const [openFullscreen, setOpenFullscreen] = useState(false);
  const [infoTileId, setInfoTileId] = useState<SoundId | null>(null);
  const ageTip = useMemo(() => getAgeTip(ageMonths), [ageMonths]);
  const engine = useSoundEngine();

  // Smart suggestion is recomputed when the active hour ticks over (every
  // ~5 min is enough — don't bind to per-second for re-renders).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  const suggestion = useMemo(() => getSmartSuggestion(ageMonths, now.getHours()), [ageMonths, now]);
  const suggestedNoise = NOISE_TYPES.find(n => n.id === suggestion.id)!;
  return <div className="space-y-3">

      {/* ── Tab toggle ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10">
        <TabBtn active={tab === "noise"} onClick={() => setTab("noise")} icon={<Wind className="h-3.5 w-3.5" />} label="White Noise" activeClass="bg-primary text-white shadow-[0_4px_12px_-2px_rgba(99,102,241,0.5)]" />
        <TabBtn active={tab === "poems"} onClick={() => setTab("poems")} icon={<Sparkles className="h-3.5 w-3.5" />} label="Poems" activeClass="bg-primary text-white shadow-[0_4px_12px_-2px_rgba(139,92,246,0.5)]" />
      </div>

      {/* ── White Noise tab ─────────────────────────────────────────── */}
      {tab === "noise" && <div className="space-y-3 animate-in fade-in duration-200">

          {/* Smart suggestion strip — "Best for sleep now" */}
          <SmartSuggestion noise={suggestedNoise} reason={suggestion.reason} engine={engine} onOpenFullscreen={() => setOpenFullscreen(true)} />

          {/* Animated tile grid */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>{t("components.infant_sounds.tap_to_play_long_press_info")}</span>
              {engine.isPlaying && <button onClick={() => setOpenFullscreen(true)} className="text-[10px] font-bold text-primary dark:text-muted-foreground hover:underline normal-case tracking-normal" data-testid="open-fullscreen-from-tilegrid">
                  {t("components.infant_sounds.open_player")}
                </button>}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {NOISE_TYPES.map(n => <SoundTile key={n.id} noise={n} active={engine.active.has(n.id)} onToggle={() => {
            engine.toggle(n.id);
            // First play opens the immersive player automatically so
            // parents see the timer + mixer surface — they can dismiss
            // it back to the tile grid if they prefer.
            if (!engine.active.has(n.id)) setOpenFullscreen(true);
          }} onInfo={() => setInfoTileId(infoTileId === n.id ? null : n.id)} />)}
            </div>
          </div>

          {/* Expanded detail card (info button on a tile) */}
          <AnimatePresence>
            {infoTileId && (() => {
          const n = NOISE_TYPES.find(x => x.id === infoTileId)!;
          return <motion.div key={infoTileId} initial={{
            opacity: 0,
            y: -6
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -6
          }} transition={{
            duration: 0.18
          }} className="rounded-xl bg-muted dark:bg-primary border border-border dark:border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{n.emoji}</span>
                    <p className="font-bold text-sm text-primary dark:text-muted-foreground">{n.label}</p>
                  </div>
                  <p className="text-[12px] text-primary dark:text-muted-foreground leading-relaxed">{n.desc}</p>
                  <div className="flex items-start gap-1.5 rounded-lg bg-muted dark:bg-primary px-2 py-1.5">
                    <Info className="h-3 w-3 text-primary dark:text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[11px] text-primary dark:text-muted-foreground leading-snug">
                      <span className="font-bold">{t("components.infant_sounds.best_for")}</span> {n.bestFor}
                    </p>
                  </div>
                </motion.div>;
        })()}
          </AnimatePresence>

          {/* Mini-player bar (visible whenever something is playing) */}
          <AnimatePresence>
            {engine.isPlaying && <MiniPlayer engine={engine} onOpenFullscreen={() => setOpenFullscreen(true)} />}
          </AnimatePresence>

          {/* Age-specific guidance card */}
          <div className="rounded-2xl bg-gradient-to-br from-muted via-muted to-muted dark:from-primary dark:via-primary dark:to-primary border border-border dark:border-border p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="h-4 w-4 text-primary dark:text-muted-foreground shrink-0" />
              <p className="text-xs font-bold text-primary dark:text-muted-foreground">{ageTip.headline}</p>
            </div>
            <p className="text-[12px] text-primary dark:text-muted-foreground leading-relaxed mb-2.5">{ageTip.tip}</p>
            <div className="flex items-start gap-1.5 rounded-lg bg-muted dark:bg-primary px-2.5 py-2">
              <VolumeX className="h-3 w-3 text-primary dark:text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-primary dark:text-muted-foreground leading-snug">
                <span className="font-bold">{t("components.infant_sounds.volume_rule")}</span> {ageTip.volume}
              </p>
            </div>
          </div>

          {/* Universal tips */}
          <div className="rounded-xl bg-white/50 dark:bg-white/[0.04] border border-border p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("components.infant_sounds.universal_rules")}</p>
            {[{
          emoji: "📏",
          tip: "Keep the source at least 30 cm (1 foot) from baby's head."
        }, {
          emoji: "🔇",
          tip: "Never exceed 65 dB — roughly the volume of a shower."
        }, {
          emoji: "⏰",
          tip: "Use it as a sleep cue, not background noise all day."
        }, {
          emoji: "🌅",
          tip: "Fade it gradually — volume down 5 dB per week — rather than stopping suddenly."
        }].map(({
          emoji,
          tip
        }) => <div key={tip} className="flex items-start gap-2">
                <span className="text-base leading-none shrink-0">{emoji}</span>
                <p className="text-[12px] text-foreground/80 leading-snug">{tip}</p>
              </div>)}
          </div>
        </div>}

      {/* ── Poems tab (Spec 3 — local poems, no external API) ──────────── */}
      {tab === "poems" && <div className="animate-in fade-in duration-200">
          <InfantPoems ageMonths={ageMonths} />
        </div>}

      {/* ── Fullscreen immersive player ─────────────────────────────── */}
      <FullscreenPlayer open={openFullscreen} onClose={() => setOpenFullscreen(false)} engine={engine} />
    </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart suggestion strip — single hero CTA at the top of the noise tab
// ─────────────────────────────────────────────────────────────────────────────
function SmartSuggestion({
  noise,
  reason,
  engine,
  onOpenFullscreen
}: {
  noise: NoiseType;
  reason: string;
  engine: SoundEngine;
  onOpenFullscreen: () => void;
}) {
  const {
    t
  } = useTranslation();
  const isActive = engine.active.has(noise.id);
  return <div className={`relative rounded-2xl overflow-hidden border border-white/30 dark:border-white/10 p-3.5 bg-gradient-to-br ${noise.gradient}`} data-testid="smart-suggestion">
      <div className="absolute inset-0 backdrop-blur-[1px] bg-black/10" />
      <div className="relative flex items-center gap-3">
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="h-3 w-3 text-white/90" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">
              {t("components.infant_sounds.best_for_sleep_now")}
            </p>
          </div>
          <p className="text-base font-bold text-white leading-tight">
            {noise.emoji} {noise.label}
          </p>
          <p className="text-[11px] text-white/80 leading-snug mt-1">{reason}</p>
        </div>
        <button onClick={() => {
        engine.toggle(noise.id);
        if (!isActive) onOpenFullscreen();
      }} aria-label={isActive ? `Stop ${noise.label}` : `Play ${noise.label}`} data-testid="smart-suggestion-play" className="shrink-0 h-12 w-12 rounded-full bg-white/95 hover:bg-white text-foreground shadow-lg flex items-center justify-center transition-transform active:scale-95">
          {isActive ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}
        </button>
      </div>
    </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SoundTile — animated card per noise type
// ─────────────────────────────────────────────────────────────────────────────
function SoundTile({
  noise,
  active,
  onToggle,
  onInfo
}: {
  noise: NoiseType;
  active: boolean;
  onToggle: () => void;
  onInfo: () => void;
}) {
  return <div className={["relative rounded-2xl overflow-hidden border-2 transition-all", active ? "border-white/50 shadow-[0_8px_28px_-6px_var(--tile-glow)] scale-[1.02]" : "border-border bg-white/60 dark:bg-white/[0.04] hover:border-border dark:hover:border-primary"].join(" ")} style={{
    // Custom CSS var so the inline shadow above can pick up the per-tile tint.
    "--tile-glow": active ? `${noise.tint}60` : "transparent"
  } as React.CSSProperties}>
      {/* Active background gradient */}
      {active && <div className={`absolute inset-0 bg-gradient-to-br ${noise.gradient} opacity-100`} />}
      {/* Active glow pulse */}
      {active && <motion.div aria-hidden className="absolute inset-0 pointer-events-none" style={{
      background: `radial-gradient(circle at 50% 50%, ${noise.tint}40, transparent 70%)`
    }} animate={{
      opacity: [0.4, 0.9, 0.4]
    }} transition={{
      duration: 2.4,
      repeat: Infinity,
      ease: "easeInOut"
    }} />}

      <button onClick={onToggle} aria-label={active ? `Stop ${noise.label}` : `Play ${noise.label}`} aria-pressed={active} data-testid={`tile-${noise.id}`} data-active={active ? "true" : "false"} className="relative w-full py-3 px-1 text-center">
        <AnimatedIcon emoji={noise.emoji} anim={noise.iconAnim} active={active} />
        <p className={`text-[10px] font-bold leading-tight mt-1 ${active ? "text-white" : "text-foreground"}`}>
          {noise.label}
        </p>
        {active && <Pause className="h-3 w-3 text-white/90 absolute top-1.5 right-1.5" fill="currentColor" />}
      </button>
      <button onClick={e => {
      e.stopPropagation();
      onInfo();
    }} aria-label={`What is ${noise.label}?`} data-testid={`tile-info-${noise.id}`} className={["absolute top-1 left-1 h-5 w-5 rounded-full flex items-center justify-center transition-colors", active ? "bg-white/20 hover:bg-white/30 text-white" : "bg-muted/60 hover:bg-muted text-muted-foreground"].join(" ")}>
        <Info className="h-3 w-3" />
      </button>
    </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedIcon — emoji with per-sound motion
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedIcon({
  emoji,
  anim,
  active
}: {
  emoji: string;
  anim: NoiseType["iconAnim"];
  active: boolean;
}) {
  if (!active) {
    return <div className="text-2xl leading-none mb-0.5">{emoji}</div>;
  }
  switch (anim) {
    case "spin":
      return <motion.div className="text-2xl leading-none mb-0.5" animate={{
        rotate: 360
      }} transition={{
        duration: 3,
        repeat: Infinity,
        ease: "linear"
      }}>{emoji}</motion.div>;
    case "pulse":
      return <motion.div className="text-2xl leading-none mb-0.5" animate={{
        scale: [1, 1.18, 1]
      }} transition={{
        duration: 0.85,
        repeat: Infinity,
        ease: "easeInOut"
      }}>{emoji}</motion.div>;
    case "float":
      return <motion.div className="text-2xl leading-none mb-0.5" animate={{
        y: [0, 2, 0, -2, 0]
      }} transition={{
        duration: 1.6,
        repeat: Infinity,
        ease: "easeInOut"
      }}>{emoji}</motion.div>;
    case "bounce":
      return <motion.div className="text-2xl leading-none mb-0.5" animate={{
        y: [0, -3, 0]
      }} transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: "easeOut"
      }}>{emoji}</motion.div>;
    case "wave":
      return <motion.div className="text-2xl leading-none mb-0.5" animate={{
        scale: [1, 1.08, 1],
        opacity: [0.85, 1, 0.85]
      }} transition={{
        duration: 1.6,
        repeat: Infinity,
        ease: "easeInOut"
      }}>{emoji}</motion.div>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MiniPlayer — sticky bar shown when sounds are active (compact view)
// ─────────────────────────────────────────────────────────────────────────────
function MiniPlayer({
  engine,
  onOpenFullscreen
}: {
  engine: SoundEngine;
  onOpenFullscreen: () => void;
}) {
  const {
    t
  } = useTranslation();
  const activeIds = Array.from(engine.active);
  return <motion.div initial={{
    opacity: 0,
    y: 8
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: 8
  }} transition={{
    duration: 0.2
  }} className="rounded-2xl border border-border dark:border-border bg-gradient-to-br from-muted to-muted dark:from-primary dark:to-primary backdrop-blur-md p-2.5 flex items-center gap-2.5 shadow-lg" data-testid="mini-player">
      <div className="flex -space-x-1.5 shrink-0">
        {activeIds.slice(0, 3).map(id => {
        const n = NOISE_TYPES.find(x => x.id === id)!;
        return <div key={id} className="h-7 w-7 rounded-full border-2 border-white dark:border-primary flex items-center justify-center text-base shadow" style={{
          background: n.tint
        }}>{n.emoji}</div>;
      })}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-primary dark:text-muted-foreground leading-tight">
          {activeIds.length} {t("components.infant_sounds.sound")}{activeIds.length === 1 ? "" : "s"} {t("components.infant_sounds.playing")}
        </p>
        {engine.remainingMs !== null && engine.remainingMs > 0 && <p className="text-[10px] text-primary dark:text-muted-foreground flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> {formatRemaining(engine.remainingMs)} {t("components.infant_sounds.left")}
          </p>}
      </div>
      <button onClick={onOpenFullscreen} className="text-[11px] font-bold text-primary dark:text-muted-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted dark:hover:bg-primary">{t("components.infant_sounds.open")}</button>
      <button onClick={() => engine.stopAll()} aria-label={t("components.infant_sounds.stop_all_sounds")} data-testid="mini-stop-all" className="h-8 w-8 rounded-full bg-primary hover:bg-primary text-white flex items-center justify-center shadow">
        <X className="h-4 w-4" />
      </button>
    </motion.div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// FullscreenPlayer — immersive modal with reactive orb + mixer + timer
// ─────────────────────────────────────────────────────────────────────────────
function FullscreenPlayer({
  open,
  onClose,
  engine
}: {
  open: boolean;
  onClose: () => void;
  engine: SoundEngine;
}) {
  const {
    t
  } = useTranslation();
  // Refs for focus management — the close button receives initial focus when
  // the modal opens, and we restore focus to whichever element opened it on
  // close. The container is used to scope the focus trap.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Body scroll lock + ESC dismissal + focus trap while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    function getFocusable(): HTMLElement[] {
      const root = containerRef.current;
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Basic focus trap — keep tab focus inside the modal container.
      const focusables = getFocusable();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);

    // Move initial focus to the close button on the next frame so the modal
    // content has a chance to mount before we focus into it.
    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      // Restore focus to whichever element originally opened the modal.
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [open, onClose]);

  // Render via portal so the modal escapes parent stacking contexts (the
  // infant-hub uses heavy backdrop blur + z-indexed cards that would clip).
  if (typeof document === "undefined") return null;

  // Pick the dominant active sound for the background gradient. Falls back
  // to the first noise type so the modal still has a colour identity even
  // when nothing is playing yet (e.g., user opened it manually).
  const primary = NOISE_TYPES.find(n => engine.active.has(n.id)) ?? NOISE_TYPES[0];
  return createPortal(<AnimatePresence>
      {open && <motion.div ref={containerRef} initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} transition={{
      duration: 0.25
    }} className="fixed inset-0 z-[100] flex items-stretch justify-center" role="dialog" aria-modal="true" aria-label={t("components.infant_sounds.immersive_sound_player")} data-testid="fullscreen-player">
          {/* Backdrop with smooth gradient transition between primary sounds */}
          <motion.div key={primary.id} initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        duration: 0.6
      }} className={`absolute inset-0 bg-gradient-to-br ${primary.gradient}`} />
          {/* Black layer for depth */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Floating particles */}
          <Particles tint={primary.tint} />

          <div className="relative w-full max-w-md mx-auto flex flex-col px-5 py-6 text-white">
            {/* Top bar: close + timer pill */}
            <div className="flex items-center justify-between mb-4">
              <button ref={closeBtnRef} onClick={onClose} aria-label={t("components.infant_sounds.close_immersive_player")} data-testid="fullscreen-close" className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center">
                <ChevronDown className="h-5 w-5" />
              </button>
              {engine.remainingMs !== null && engine.remainingMs > 0 && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold">
                  <Clock className="h-3 w-3" />
                  {formatRemaining(engine.remainingMs)}
                </div>}
            </div>

            {/* Reactive orb — center of attention */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
              <ReactiveOrb getAnalyser={engine.getAnalyser} tint={primary.tint} active={engine.isPlaying} />
              <p className="mt-6 text-2xl font-bold tracking-tight">
                {primary.emoji} {primary.label}
              </p>
              {engine.isPlaying ? <p className="text-[12px] text-white/70 mt-1">
                  {t("components.infant_sounds.playing_2")} {engine.active.size} {t("components.infant_sounds.sound_2")}{engine.active.size === 1 ? "" : "s"}
                </p> : <p className="text-[12px] text-white/70 mt-1">{t("components.infant_sounds.tap_a_sound_below_to_begin")}</p>}
            </div>

            {/* Active mixer — one row per playing sound with volume slider */}
            <AnimatePresence>
              {engine.active.size > 0 && <motion.div initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: 10
          }} className="space-y-1.5 mb-4" data-testid="fullscreen-mixer">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">
                    {t("components.infant_sounds.mix")}
                  </p>
                  {Array.from(engine.active).map(id => {
              const n = NOISE_TYPES.find(x => x.id === id)!;
              return <div key={id} className="flex items-center gap-2.5 rounded-xl bg-white/10 backdrop-blur-md px-2.5 py-2">
                        <span className="text-base shrink-0" aria-hidden>{n.emoji}</span>
                        <span className="text-[11px] font-bold w-16 shrink-0">{n.label}</span>
                        <input type="range" min={0} max={1} step={0.01} value={engine.volumes[id]} onChange={e => engine.setVolume(id, parseFloat(e.target.value))} aria-label={`${n.label} volume`} data-testid={`fullscreen-volume-${id}`} className="flex-1 h-1 accent-white" />
                        <button onClick={() => engine.stop(id)} aria-label={`Stop ${n.label}`} className="h-6 w-6 rounded-full bg-white/15 hover:bg-primary flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                      </div>;
            })}
                </motion.div>}
            </AnimatePresence>

            {/* Add-sound chips (sounds NOT currently active) */}
            {engine.active.size < NOISE_TYPES.length && <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">
                  {t("components.infant_sounds.add_to_mix")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {NOISE_TYPES.filter(n => !engine.active.has(n.id)).map(n => <button key={n.id} onClick={() => engine.play(n.id)} aria-label={`Add ${n.label}`} data-testid={`fullscreen-add-${n.id}`} className="px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5">
                      <Plus className="h-3 w-3" />
                      <span>{n.emoji}</span>
                      <span>{n.label}</span>
                    </button>)}
                </div>
              </div>}

            {/* Timer + stop-all controls */}
            <div className="space-y-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">
                  {t("components.infant_sounds.sleep_timer")}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIMER_OPTIONS.map(t => <button key={t.label} onClick={() => engine.setTimer(t.ms)} aria-pressed={engine.timerMs === t.ms} data-testid={`fullscreen-timer-${t.label}`} className={["py-2 rounded-lg text-[11px] font-bold transition-colors", engine.timerMs === t.ms ? "bg-white text-foreground shadow-lg" : "bg-white/15 hover:bg-white/25 text-white"].join(" ")}>{t.label}</button>)}
                </div>
              </div>
              {engine.isPlaying && <button onClick={() => {
            engine.stopAll();
            engine.setTimer(null);
          }} data-testid="fullscreen-stop-all" className="w-full py-3 rounded-xl bg-primary hover:bg-primary backdrop-blur-md text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
                  <X className="h-4 w-4" /> {t("components.infant_sounds.stop_everything")}
                </button>}
            </div>
          </div>
        </motion.div>}
    </AnimatePresence>, document.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// ReactiveOrb — main visualization. Scales with audio amplitude, gentle idle
// pulse when nothing is playing. Reads the master AnalyserNode in its own RAF
// loop and writes scale/opacity directly to the DOM via refs — keeping the
// 60fps animation completely outside the React render tree so the parent
// WhiteNoiseLullaby component never re-renders on audio frames.
// ─────────────────────────────────────────────────────────────────────────────
function ReactiveOrb({
  getAnalyser,
  tint,
  active
}: {
  getAnalyser: () => AnalyserNode | null;
  tint: string;
  active: boolean;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const haloRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!active) {
      // Reset to idle visuals when nothing is playing.
      if (bodyRef.current) bodyRef.current.style.transform = "scale(1)";
      if (haloRef.current) haloRef.current.style.opacity = "0.45";
      return;
    }
    const analyser = getAnalyser();
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    let smoothed = 0;
    let rafId: number | null = null;
    let mounted = true;
    function tick() {
      if (!mounted) return;
      analyser!.getByteTimeDomainData(buf);
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / buf.length);
      // EMA smoothing so the orb breathes calmly instead of jittering.
      smoothed = smoothed * 0.7 + rms * 0.3;
      const amp = Math.min(1, smoothed * 2.2);
      // amp 0..1 → scale 1..1.35 — gentle, calming, not jarring.
      const scale = 1 + amp * 0.35;
      if (bodyRef.current) bodyRef.current.style.transform = `scale(${scale.toFixed(3)})`;
      if (haloRef.current) haloRef.current.style.opacity = (0.55 + amp * 0.35).toFixed(3);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [active, getAnalyser]);
  return <div className="relative h-44 w-44 flex items-center justify-center" aria-hidden>
      {/* Outer halo — opacity driven by amplitude via ref */}
      <div ref={haloRef} className="absolute inset-0 rounded-full transition-opacity duration-100" style={{
      background: `radial-gradient(circle at 50% 50%, ${tint}88, transparent 70%)`,
      filter: "blur(20px)",
      opacity: 0.45
    }} />
      {/* Outer ring — soft idle pulse via framer-motion (no audio coupling) */}
      <motion.div className="absolute h-40 w-40 rounded-full border-2 border-white/40" animate={active ? {
      scale: [1, 1.12, 1],
      opacity: [0.3, 0.6, 0.3]
    } : {
      scale: 1,
      opacity: 0.25
    }} transition={{
      duration: 2.4,
      repeat: Infinity,
      ease: "easeInOut"
    }} />
      {/* Audio-reactive body — transform driven by amplitude via ref */}
      <div ref={bodyRef} className="h-32 w-32 rounded-full" style={{
      background: `radial-gradient(circle at 35% 30%, white, ${tint} 55%, ${tint}88 100%)`,
      boxShadow: `0 0 60px ${tint}, 0 0 120px ${tint}80`,
      transform: "scale(1)",
      transition: "transform 80ms ease-out"
    }} />
      {/* Inner highlight */}
      <div className="absolute h-8 w-8 rounded-full bg-white/80" style={{
      filter: "blur(6px)",
      top: "30%",
      left: "32%"
    }} />
    </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Particles — soft floating dots in the fullscreen background
// ─────────────────────────────────────────────────────────────────────────────
function Particles({
  tint
}: {
  tint: string;
}) {
  // Pre-compute fixed seeds so particles don't reshuffle on every render.
  const seeds = useMemo(() => Array.from({
    length: 18
  }, (_, i) => ({
    left: i * 37 % 100,
    duration: 8 + i * 13 % 10,
    delay: i * 0.6 % 6,
    size: 4 + i * 7 % 6
  })), []);
  return <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {seeds.map((s, i) => <motion.span key={i} className="absolute rounded-full" style={{
      left: `${s.left}%`,
      bottom: -10,
      width: s.size,
      height: s.size,
      background: `${tint}aa`,
      boxShadow: `0 0 ${s.size * 2}px ${tint}`
    }} animate={{
      y: [0, -800],
      opacity: [0, 0.7, 0]
    }} transition={{
      duration: s.duration,
      delay: s.delay,
      repeat: Infinity,
      ease: "linear"
    }} />)}
    </div>;
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({
  active,
  onClick,
  icon,
  label,
  activeClass
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  activeClass: string;
}) {
  return <button onClick={onClick} className={["flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all", active ? activeClass : "text-muted-foreground hover:text-foreground"].join(" ")}>
      {icon}
      {label}
    </button>;
}