import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Moon, CheckSquare, Square, ChevronDown, ChevronUp, Volume2, VolumeX, SkipForward, Lightbulb, Star, RefreshCw, CheckCircle2 } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
import { useTranslation } from "react-i18next";
type AgeTier = "0_3" | "3_6" | "6_12";
function getAgeTier(ageMonths: number): AgeTier {
  if (ageMonths < 3) return "0_3";
  if (ageMonths < 6) return "3_6";
  return "6_12";
}

// ─── Tip Data ───────────────────────────────────────────────────────────────────

type Tip = {
  id: string;
  emoji: string;
  text: string;
};
type TipCategory = "routine" | "environment" | "soothing";
const TIPS: Record<AgeTier, Record<TipCategory, Tip[]>> = {
  "0_3": {
    routine: [{
      id: "03-r1",
      emoji: "🤱",
      text: "Give a full feed 20–30 min before sleep — a full tummy helps baby stay asleep longer."
    }, {
      id: "03-r2",
      emoji: "🛁",
      text: "A warm sponge bath before sleep releases melatonin — keep it short, 5 minutes."
    }, {
      id: "03-r3",
      emoji: "🎵",
      text: "Sing the same short lullaby every time — babies learn the 'sleep signal' fast."
    }, {
      id: "03-r4",
      emoji: "🌙",
      text: "Start the sleep routine 30 min before you want baby to sleep, not when they're overtired."
    }, {
      id: "03-r5",
      emoji: "🤗",
      text: "Gentle skin-to-skin contact before sleep calms the nervous system and lowers cortisol."
    }],
    environment: [{
      id: "03-e1",
      emoji: "💡",
      text: "Dim all lights 15–20 min before sleep — bright light suppresses melatonin in newborns too."
    }, {
      id: "03-e2",
      emoji: "🌡️",
      text: "Keep the room at 68–72°F (20–22°C) — babies sleep deepest in cool rooms."
    }, {
      id: "03-e3",
      emoji: "🔇",
      text: "A consistent white noise level (around 65 dB — like a shower) drowns out household sounds."
    }, {
      id: "03-e4",
      emoji: "🛏️",
      text: "Always place baby on their back on a firm, flat surface — this is the safest sleep position."
    }, {
      id: "03-e5",
      emoji: "👕",
      text: "Dress baby in one layer more than you'd wear — check neck temperature, not hands or feet."
    }],
    soothing: [{
      id: "03-s1",
      emoji: "🤗",
      text: "Swaddle snugly with arms slightly bent — not straight down — this is more comfortable."
    }, {
      id: "03-s2",
      emoji: "🔊",
      text: "Loud 'shush' sounds right near baby's ear can stop crying — match the volume to their cry then slowly reduce."
    }, {
      id: "03-s3",
      emoji: "🤝",
      text: "Rhythmic patting on the back (like a heartbeat pace) signals safety to the nervous system."
    }, {
      id: "03-s4",
      emoji: "🚶",
      text: "Walk baby with a gentle, rhythmic sway — the vestibular motion triggers drowsiness."
    }, {
      id: "03-s5",
      emoji: "🫁",
      text: "Try 'suck to sleep' — a pacifier during sleep is linked to reduced SIDS risk in young babies."
    }]
  },
  "3_6": {
    routine: [{
      id: "36-r1",
      emoji: "⏰",
      text: "Pick a consistent bedtime and stick to it every single day — even on weekends."
    }, {
      id: "36-r2",
      emoji: "🛁",
      text: "Bath → Feed → Cuddle → Sleep is a powerful routine that babies learn to predict."
    }, {
      id: "36-r3",
      emoji: "📖",
      text: "Reading a board book (even at 3 months!) in the same spot becomes a sleep cue over time."
    }, {
      id: "36-r4",
      emoji: "🌅",
      text: "Wake baby at the same time every morning — this anchors the entire daily sleep schedule."
    }, {
      id: "36-r5",
      emoji: "🧸",
      text: "Introduce a small soft toy (not in crib under 12 months) during feed — it becomes a comfort object."
    }],
    environment: [{
      id: "36-e1",
      emoji: "🌑",
      text: "Blackout curtains make a huge difference — even a little light can disrupt sleep cycles at this age."
    }, {
      id: "36-e2",
      emoji: "🔊",
      text: "Keep white noise playing ALL night, not just at bedtime — it masks early-morning sounds."
    }, {
      id: "36-e3",
      emoji: "🌡️",
      text: "Check baby's temperature: warm chest = too hot, cool hands = perfectly fine."
    }, {
      id: "36-e4",
      emoji: "👶",
      text: "Try a smaller sleep space — some babies feel safer in a bassinet than a large crib at this age."
    }, {
      id: "36-e5",
      emoji: "🪟",
      text: "Open a window briefly before sleep to refresh the air — a slightly fresh room helps breathing."
    }],
    soothing: [{
      id: "36-s1",
      emoji: "😴",
      text: "Put baby down drowsy-but-awake — this is the most important skill to build at this age."
    }, {
      id: "36-s2",
      emoji: "🎵",
      text: "A soft, consistent melody (same song every night) becomes a powerful sleep trigger by week 2."
    }, {
      id: "36-s3",
      emoji: "🤲",
      text: "Gently hold a warm hand on baby's chest after laying down — the warmth and pressure is soothing."
    }, {
      id: "36-s4",
      emoji: "💨",
      text: "Fan noise at a constant, low volume is one of the most effective white noises for this age group."
    }, {
      id: "36-s5",
      emoji: "🧘",
      text: "Take 3 slow breaths yourself before settling baby — your relaxed energy is contagious."
    }]
  },
  "6_12": {
    routine: [{
      id: "612-r1",
      emoji: "📅",
      text: "Most babies consolidate to 2 naps (morning + afternoon) at 6–8 months. Adjust your schedule."
    }, {
      id: "612-r2",
      emoji: "⏰",
      text: "Keep the gap between last nap and bedtime 2.5–3 hours — longer and baby is overtired."
    }, {
      id: "612-r3",
      emoji: "🍽️",
      text: "Offer a small solid food meal 1 hour before bedtime to reduce hunger wake-ups at night."
    }, {
      id: "612-r4",
      emoji: "🛁",
      text: "A warm bath followed by a gentle 5-minute massage is highly effective at this age."
    }, {
      id: "612-r5",
      emoji: "🔔",
      text: "Give a verbal wind-down cue ('Time to sleep!') consistently — babies understand tone before words."
    }],
    environment: [{
      id: "612-e1",
      emoji: "🌑",
      text: "Blackout curtains are essential — babies at this age are extremely sensitive to light during early-morning hours."
    }, {
      id: "612-e2",
      emoji: "🌡️",
      text: "A sleep sack (wearable blanket) is safer than loose blankets and keeps temperature regulated."
    }, {
      id: "612-e3",
      emoji: "🔊",
      text: "Continue white noise but gradually reduce volume over weeks if you want to wean off it."
    }, {
      id: "612-e4",
      emoji: "📺",
      text: "No screens in the bedroom — blue light disrupts melatonin production heavily at this age."
    }, {
      id: "612-e5",
      emoji: "🪴",
      text: "Remove visually stimulating toys from the crib area — it becomes a signal that this space is for play."
    }],
    soothing: [{
      id: "612-s1",
      emoji: "🛏️",
      text: "Consistent sleep training (check-and-console, chair method) is safe and effective from 6 months."
    }, {
      id: "612-s2",
      emoji: "🧸",
      text: "A safe 'lovey' (small blanket or soft animal) can become a powerful self-soothing tool."
    }, {
      id: "612-s3",
      emoji: "🤲",
      text: "Gradually reduce rocking time each night — from 10 min → 7 → 5 → 3 over two weeks."
    }, {
      id: "612-s4",
      emoji: "🌙",
      text: "Use a dim nightlight with a warm amber colour — cool/blue light is too stimulating at bedtime."
    }, {
      id: "612-s5",
      emoji: "💬",
      text: "Narrate sleep time calmly: 'It's sleepy time, the sun went to sleep, we're safe' — tone matters."
    }]
  }
};

// ─── Checklist ──────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [{
  id: "feed",
  emoji: "🍼",
  label: "Feed completed"
}, {
  id: "diaper",
  emoji: "👶",
  label: "Diaper changed"
}, {
  id: "lights",
  emoji: "💡",
  label: "Lights dimmed"
}, {
  id: "quiet",
  emoji: "🔇",
  label: "Quiet environment"
}, {
  id: "temp",
  emoji: "🌡️",
  label: "Room temperature checked"
}, {
  id: "swaddle",
  emoji: "🤗",
  label: "Swaddle / sleep sack ready"
}];

// ─── Sounds ─────────────────────────────────────────────────────────────────────

type SoundDef = {
  id: string;
  emoji: string;
  label: string;
  color: string;
};
const SOUNDS: SoundDef[] = [{
  id: "white",
  emoji: "🌫️",
  label: "White Noise",
  color: "bg-slate-100 dark:bg-slate-500/20 border-slate-300 text-slate-800 dark:text-slate-200"
}, {
  id: "rain",
  emoji: "🌧️",
  label: "Rain",
  color: "bg-blue-100 dark:bg-blue-500/20 border-blue-300 text-blue-800 dark:text-blue-200"
}, {
  id: "heartbeat",
  emoji: "❤️",
  label: "Heartbeat",
  color: "bg-red-100 dark:bg-red-500/20 border-red-300 text-red-800 dark:text-red-200"
}, {
  id: "fan",
  emoji: "💨",
  label: "Fan",
  color: "bg-cyan-100 dark:bg-cyan-500/20 border-cyan-300 text-cyan-800 dark:text-cyan-200"
}, {
  id: "lullaby",
  emoji: "🎵",
  label: "Lullaby",
  color: "bg-purple-100 dark:bg-purple-500/20 border-purple-300 text-purple-800 dark:text-purple-200"
}, {
  id: "ocean",
  emoji: "🌊",
  label: "Ocean",
  color: "bg-teal-100 dark:bg-teal-500/20 border-teal-300 text-teal-800 dark:text-teal-200"
}];

// ─── Web Audio engine ────────────────────────────────────────────────────────────

class SleepSoundEngine {
  private ctx: AudioContext | null = null;
  private nodes: AudioNode[] = [];
  private gainNode: GainNode | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }
  private makeNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * seconds, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.nodes.forEach(n => {
      try {
        (n as AudioBufferSourceNode).stop?.();
        n.disconnect();
      } catch {}
    });
    this.nodes = [];
    this.gainNode = null;
  }
  play(soundId: string) {
    this.stop();
    const ctx = this.getCtx();
    const master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    this.gainNode = master;
    if (soundId === "white") {
      const buf = this.makeNoiseBuffer(ctx);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(master);
      src.start();
      this.nodes.push(src);
    }
    if (soundId === "fan") {
      const buf = this.makeNoiseBuffer(ctx);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 800;
      lp.Q.value = 0.5;
      src.connect(lp);
      lp.connect(master);
      src.start();
      this.nodes.push(src, lp);
    }
    if (soundId === "rain") {
      // Filtered noise with slow amplitude modulation for a rainfall effect
      const buf = this.makeNoiseBuffer(ctx, 8);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1200;
      bp.Q.value = 0.3;
      const ampMod = ctx.createGain();
      // LFO for modulation
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain);
      lfoGain.connect(ampMod.gain);
      src.connect(bp);
      bp.connect(ampMod);
      ampMod.connect(master);
      lfo.start();
      src.start();
      this.nodes.push(src, bp, ampMod, lfo, lfoGain);
    }
    if (soundId === "ocean") {
      const buf = this.makeNoiseBuffer(ctx, 6);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 600;
      const waveGain = ctx.createGain();
      // Slow oscillation for wave rhythm
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12;
      lfo.type = "sine";
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.4;
      lfo.connect(lfoGain);
      lfoGain.connect(waveGain.gain);
      waveGain.gain.value = 0.5;
      src.connect(lp);
      lp.connect(waveGain);
      waveGain.connect(master);
      lfo.start();
      src.start();
      this.nodes.push(src, lp, waveGain, lfo, lfoGain);
    }
    if (soundId === "heartbeat") {
      // Two quick pulses every ~0.75s (80 BPM)
      const playBeat = () => {
        const t = ctx.currentTime;
        const playPulse = (offset: number) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.frequency.value = 60;
          osc.type = "sine";
          g.gain.setValueAtTime(0, t + offset);
          g.gain.linearRampToValueAtTime(0.9, t + offset + 0.03);
          g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.18);
          osc.connect(g);
          g.connect(master);
          osc.start(t + offset);
          osc.stop(t + offset + 0.2);
        };
        playPulse(0);
        playPulse(0.15);
      };
      playBeat();
      this.intervalId = setInterval(playBeat, 780);
    }
    if (soundId === "lullaby") {
      // Simple pentatonic lullaby melody — C D E G A, soft and slow
      const notes = [261.6, 293.7, 329.6, 392.0, 440.0, 392.0, 329.6, 293.7];
      const noteDur = 0.6;
      const playMelody = () => {
        const t = ctx.currentTime;
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.frequency.value = freq;
          osc.type = "sine";
          const start = t + i * noteDur;
          g.gain.setValueAtTime(0, start);
          g.gain.linearRampToValueAtTime(0.3, start + 0.08);
          g.gain.setValueAtTime(0.3, start + noteDur - 0.1);
          g.gain.linearRampToValueAtTime(0, start + noteDur);
          osc.connect(g);
          g.connect(master);
          osc.start(start);
          osc.stop(start + noteDur);
        });
      };
      playMelody();
      this.intervalId = setInterval(playMelody, notes.length * noteDur * 1000 + 1000);
    }
  }
  setVolume(v: number) {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, v));
  }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsKey(childName: string, suffix: string) {
  return `amynest_bsa_${childName.replace(/\s+/g, "_").toLowerCase()}_${suffix}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function loadChecklist(childName: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(lsKey(childName, "checklist"));
    if (!raw) return {};
    const parsed: {
      date: string;
      state: Record<string, boolean>;
    } = JSON.parse(raw);
    if (parsed.date !== todayStr()) return {};
    return parsed.state;
  } catch {
    return {};
  }
}
function saveChecklist(childName: string, state: Record<string, boolean>) {
  try {
    localStorage.setItem(lsKey(childName, "checklist"), JSON.stringify({
      date: todayStr(),
      state
    }));
  } catch {}
}
function loadTriedTips(childName: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(lsKey(childName, "tried")) || "[]"));
  } catch {
    return new Set();
  }
}
function saveTriedTips(childName: string, s: Set<string>) {
  try {
    localStorage.setItem(lsKey(childName, "tried"), JSON.stringify([...s]));
  } catch {}
}
function loadTipIndices(childName: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(lsKey(childName, "tipidx")) || "{}");
  } catch {
    return {};
  }
}
function saveTipIndices(childName: string, v: Record<string, number>) {
  try {
    localStorage.setItem(lsKey(childName, "tipidx"), JSON.stringify(v));
  } catch {}
}

// ─── Smart suggestions by age + time ─────────────────────────────────────────

function getSmartSuggestions(ageMonths: number): {
  emoji: string;
  text: string;
}[] {
  const hour = new Date().getHours();
  const isEarlyMorning = hour >= 4 && hour < 7;
  const isNapTime = hour >= 9 && hour < 16;
  const isBedtime = hour >= 18 || hour < 4;
  const suggestions: {
    emoji: string;
    text: string;
  }[] = [];
  if (isBedtime) suggestions.push({
    emoji: "🌙",
    text: "It's bedtime! Start your pre-sleep routine now — aim to have baby asleep within 30 minutes."
  });
  if (isNapTime) suggestions.push({
    emoji: "😴",
    text: "Good nap window! Watch for sleepy cues: eye rubbing, yawning, or staring blankly."
  });
  if (isEarlyMorning) suggestions.push({
    emoji: "🌅",
    text: "Early waker? Keep lights very dim and try to resettle for another sleep cycle."
  });
  if (ageMonths < 3) {
    suggestions.push({
      emoji: "🔊",
      text: "Try white noise tonight — it's the most effective soothing sound for 0–3 month babies."
    });
    suggestions.push({
      emoji: "🤗",
      text: "Swaddle before you lay baby down — it reduces the startle reflex that wakes newborns."
    });
  } else if (ageMonths < 6) {
    suggestions.push({
      emoji: "💡",
      text: "Check your room darkness — blackout curtains make a big difference at this age."
    });
    suggestions.push({
      emoji: "😴",
      text: "Practice putting baby down drowsy-but-awake at least once today."
    });
  } else {
    suggestions.push({
      emoji: "📅",
      text: "Consistent bedtime is your most powerful tool now. Aim for the same time every night ±15 min."
    });
    suggestions.push({
      emoji: "🧸",
      text: "Consider introducing a lovey — a small safe comfort object builds self-soothing skill."
    });
  }
  return suggestions.slice(0, 3);
}

// ─── Tip category labels ──────────────────────────────────────────────────────

const CAT_LABEL: Record<TipCategory, string> = {
  routine: "Pre-Sleep Routine",
  environment: "Sleep Environment",
  soothing: "Soothing Techniques"
};
const CAT_COLORS: Record<TipCategory, string> = {
  routine: "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-400/30",
  environment: "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-400/30",
  soothing: "bg-purple-50 dark:bg-purple-500/15 border-purple-200 dark:border-purple-400/30"
};

// ─── Component ──────────────────────────────────────────────────────────────────

interface BabySleepAssistantProps {
  childName: string;
  ageMonths: number;
}
export function BabySleepAssistant({
  childName,
  ageMonths
}: BabySleepAssistantProps) {
  const {
    t
  } = useTranslation();
  const ageTier = getAgeTier(ageMonths);
  const tips = TIPS[ageTier];

  // Checklist state
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => loadChecklist(childName));

  // Tried tips
  const [tried, setTried] = useState<Set<string>>(() => loadTriedTips(childName));

  // Current tip indices per category
  const [tipIndices, setTipIndices] = useState<Record<string, number>>(() => loadTipIndices(childName));

  // Sound player state
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const engineRef = useRef<SleepSoundEngine | null>(null);

  // Section open/close
  const [showTips, setShowTips] = useState(true);
  const [showChecklist, setShowChecklist] = useState(true);
  const [showSounds, setShowSounds] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const suggestions = getSmartSuggestions(ageMonths);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  // ── Checklist ────────────────────────────────────────────────
  const toggleCheck = useCallback((id: string) => {
    setChecklist(prev => {
      const next = {
        ...prev,
        [id]: !prev[id]
      };
      saveChecklist(childName, next);
      return next;
    });
  }, [childName]);
  const resetChecklist = useCallback(() => {
    setChecklist({});
    saveChecklist(childName, {});
  }, [childName]);
  const checkedCount = CHECKLIST_ITEMS.filter(i => checklist[i.id]).length;

  // ── Tips ─────────────────────────────────────────────────────
  const getTip = (cat: TipCategory): Tip => {
    const idx = (tipIndices[cat] ?? 0) % tips[cat].length;
    return tips[cat][idx]!;
  };
  const nextTip = useCallback((cat: TipCategory) => {
    setTipIndices(prev => {
      const next = {
        ...prev,
        [cat]: ((prev[cat] ?? 0) + 1) % tips[cat].length
      };
      saveTipIndices(childName, next);
      return next;
    });
  }, [childName, tips]);
  const markTried = useCallback((id: string) => {
    setTried(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveTriedTips(childName, next);
      return next;
    });
  }, [childName]);

  // ── Sounds ───────────────────────────────────────────────────
  const playSound = useCallback((soundId: string) => {
    if (!engineRef.current) engineRef.current = new SleepSoundEngine();
    if (activeSound === soundId) {
      engineRef.current.stop();
      setActiveSound(null);
    } else {
      engineRef.current.play(soundId);
      setActiveSound(soundId);
    }
  }, [activeSound]);
  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    engineRef.current?.setVolume(v);
  }, []);
  const nextSound = useCallback(() => {
    const idx = SOUNDS.findIndex(s => s.id === activeSound);
    const next = SOUNDS[(idx + 1) % SOUNDS.length]!;
    playSound(next.id);
  }, [activeSound, playSound]);
  const cats: TipCategory[] = ["routine", "environment", "soothing"];
  const inputCls = "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";
  return <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Moon className="h-5 w-5 text-indigo-500" />
        <h3 className="font-bold text-base">{t("components.baby_sleep_assistant.baby_sleep_assistant")}</h3>
        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs">
          {ageMonths} {t("components.baby_sleep_assistant.month")}{ageMonths !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* ── Smart Suggestions ────────────────────────────────── */}
      <Card className="rounded-3xl border-2 border-amber-200 dark:border-amber-400/30 bg-amber-50/50 overflow-hidden">
        <button onClick={() => setShowSuggestions(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-amber-50 dark:bg-amber-500/15 transition-colors">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-sm">{t("components.baby_sleep_assistant.smart_suggestions")}</span>
          </div>
          {showSuggestions ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showSuggestions && <CardContent className="px-5 pb-5 pt-0 border-t border-amber-200 dark:border-amber-400/30 space-y-2">
            {suggestions.map((s, i) => <div key={i} className="flex items-start gap-3 bg-white/70 rounded-2xl px-3 py-2.5 border border-amber-100 dark:border-amber-400/30">
                <span className="text-xl flex-shrink-0">{s.emoji}</span>
                <p className="text-sm text-foreground leading-snug">{s.text}</p>
              </div>)}
          </CardContent>}
      </Card>

      {/* ── Sleep Tips ───────────────────────────────────────── */}
      <Card className="rounded-3xl border-border/50 overflow-hidden">
        <button onClick={() => setShowTips(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-violet-500" />
            <span className="font-bold text-sm">{t("components.baby_sleep_assistant.sleep_tips")}</span>
            <Badge className="bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-200 border-violet-200 dark:border-violet-400/30 text-[10px] px-2 py-0.5 rounded-full">
              {ageMonths < 3 ? "0–3 mo" : ageMonths < 6 ? "3–6 mo" : "6–12 mo"}
            </Badge>
          </div>
          {showTips ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showTips && <CardContent className="px-5 pb-5 pt-0 border-t border-border/40 space-y-3">
            {cats.map(cat => {
          const {
            t
          } = useTranslation();
          const tip = getTip(cat);
          const isTried = tried.has(tip.id);
          return <div key={cat} className={`rounded-2xl border p-4 space-y-2.5 ${CAT_COLORS[cat]}`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{CAT_LABEL[cat]}</p>
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl flex-shrink-0">{tip.emoji}</span>
                    <p className={`text-sm leading-snug flex-1 ${isTried ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {tip.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button onClick={() => markTried(tip.id)} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${isTried ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-200 border border-green-200 dark:border-green-400/30" : "bg-white/80 text-muted-foreground border border-white hover:bg-white hover:text-foreground"}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      {isTried ? "Tried!" : "Mark as tried"}
                    </button>
                    <button onClick={() => nextTip(cat)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/80 text-muted-foreground border border-white hover:bg-white hover:text-foreground transition-all">
                      <SkipForward className="h-3 w-3" />
                      {t("components.baby_sleep_assistant.next_tip")}
                    </button>
                  </div>
                </div>;
        })}
          </CardContent>}
      </Card>

      {/* ── Pre-Sleep Checklist ──────────────────────────────── */}
      <Card className="rounded-3xl border-border/50 overflow-hidden">
        <button onClick={() => setShowChecklist(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-emerald-500" />
            <span className="font-bold text-sm">{t("components.baby_sleep_assistant.pre_sleep_checklist")}</span>
            <span className="text-xs font-bold text-muted-foreground">
              {checkedCount}/{CHECKLIST_ITEMS.length}
            </span>
          </div>
          {showChecklist ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showChecklist && <CardContent className="px-5 pb-5 pt-0 border-t border-border/40 space-y-2">
            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden mt-1 mb-3">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{
            width: `${checkedCount / CHECKLIST_ITEMS.length * 100}%`
          }} />
            </div>

            {CHECKLIST_ITEMS.map(item => {
          const checked = !!checklist[item.id];
          return <button key={item.id} onClick={() => toggleCheck(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${checked ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 text-emerald-800 dark:text-emerald-200" : "bg-muted/30 border-transparent hover:border-muted-foreground/20"}`}>
                  {checked ? <CheckSquare className="h-5 w-5 text-emerald-500 flex-shrink-0" /> : <Square className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                  <span className="text-lg flex-shrink-0">{item.emoji}</span>
                  <span className={`text-sm font-medium ${checked ? "line-through text-emerald-700 dark:text-emerald-200" : "text-foreground"}`}>
                    {item.label}
                  </span>
                </button>;
        })}

            {checkedCount === CHECKLIST_ITEMS.length && <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 rounded-2xl px-4 py-2.5 text-sm font-bold border border-emerald-200 dark:border-emerald-400/30">
                <CheckCircle2 className="h-4 w-4" />
                {t("components.baby_sleep_assistant.all_done_baby_is_ready_for_sleep")}
              </div>}

            <button onClick={resetChecklist} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
              <RefreshCw className="h-3 w-3" /> {t("components.baby_sleep_assistant.reset_checklist")}
            </button>
          </CardContent>}
      </Card>

      {/* ── Sleep Sounds ─────────────────────────────────────── */}
      <Card className="rounded-3xl border-border/50 overflow-hidden">
        <button onClick={() => setShowSounds(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-blue-500" />
            <span className="font-bold text-sm">{t("components.baby_sleep_assistant.sleep_sounds")}</span>
            {activeSound && <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-400/30 text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                {t("components.baby_sleep_assistant.playing")}
              </Badge>}
          </div>
          {showSounds ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showSounds && <CardContent className="px-5 pb-5 pt-0 border-t border-border/40 space-y-4">
            {/* Sound grid */}
            <div className="grid grid-cols-3 gap-2">
              {SOUNDS.map(sound => {
            const {
              t
            } = useTranslation();
            const isPlaying = activeSound === sound.id;
            return <button key={sound.id} onClick={() => playSound(sound.id)} className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border-2 font-bold text-xs transition-all ${isPlaying ? "bg-blue-500 border-blue-500 text-white shadow-md scale-95" : `${sound.color} hover:scale-95`}`}>
                    <span className="text-2xl">{sound.emoji}</span>
                    <span>{sound.label}</span>
                    {isPlaying && <span className="text-[10px] opacity-80 animate-pulse">{t("components.baby_sleep_assistant.playing_2")}</span>}
                  </button>;
          })}
            </div>

            {/* Playback controls */}
            {activeSound && <div className="bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-400/30 rounded-2xl px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
                    {SOUNDS.find(s => s.id === activeSound)?.emoji}{" "}
                    {SOUNDS.find(s => s.id === activeSound)?.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={nextSound} className="flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:bg-blue-500/25 px-2.5 py-1 rounded-full transition-colors">
                      <SkipForward className="h-3 w-3" /> {t("components.baby_sleep_assistant.next")}
                    </button>
                    <button onClick={() => {
                engineRef.current?.stop();
                setActiveSound(null);
              }} className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/15 hover:bg-red-100 dark:bg-red-500/20 px-2.5 py-1 rounded-full transition-colors border border-red-200 dark:border-red-400/30">
                      <VolumeX className="h-3 w-3" /> {t("components.baby_sleep_assistant.stop")}
                    </button>
                  </div>
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-3">
                  <VolumeX className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => handleVolumeChange(Number(e.target.value))} className="flex-1 accent-blue-500" />
                  <Volume2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                </div>
              </div>}

            {!activeSound && <p className="text-xs text-center text-muted-foreground">
                {t("components.baby_sleep_assistant.tap_a_sound_to_start_audio_plays_in_browser_tab")}
              </p>}
          </CardContent>}
      </Card>

    </div>;
}