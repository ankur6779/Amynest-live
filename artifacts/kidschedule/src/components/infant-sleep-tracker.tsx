import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Plus, Trash2, Clock, TrendingUp, Lightbulb, ChevronDown, ChevronUp, Save, CheckCircle2, BedDouble, Baby } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
import { useTranslation } from "react-i18next";
type NapSession = {
  start: string;
  end: string;
};
type SleepDay = {
  date: string;
  wakeUpTime: string;
  naps: NapSession[];
  nightSleepStart: string;
  nightWakeups: number;
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsKey(childName: string) {
  return `amynest_sleep_${childName.replace(/\s+/g, "_").toLowerCase()}`;
}
function loadHistory(childName: string): SleepDay[] {
  try {
    const raw = localStorage.getItem(lsKey(childName));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveHistory(childName: string, data: SleepDay[]) {
  try {
    localStorage.setItem(lsKey(childName), JSON.stringify(data));
  } catch {}
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function timeToMins(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
function minsToTime(mins: number): string {
  const m = (mins % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function formatTime12(t: string): string {
  if (!t) return "--";
  const mins = timeToMins(t);
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
function durMins(start: string, end: string): number {
  if (!start || !end) return 0;
  let d = timeToMins(end) - timeToMins(start);
  if (d < 0) d += 1440;
  return d;
}
function fmtDur(mins: number): string {
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

// ─── Pattern engine ───────────────────────────────────────────────────────────

type SleepPattern = {
  avgWakeWindow: number; // mins from wake-up to first nap
  avgNapDuration: number; // mins (first nap avg)
  avgNightStart: number; // mins from midnight
  avgTotalDayNapMins: number;
  avgNightWakeups: number;
  consistency: "consistent" | "somewhat" | "inconsistent";
  totalDaysAnalyzed: number;
};
function analyzePattern(history: SleepDay[]): SleepPattern | null {
  const valid = history.filter(d => d.wakeUpTime && d.nightSleepStart).slice(-5);
  if (valid.length < 2) return null;
  const wakeWindows = valid.filter(d => d.naps.length > 0 && d.naps[0]?.start).map(d => durMins(d.wakeUpTime, d.naps[0]!.start));
  const napDurations = valid.flatMap(d => d.naps.filter(n => n.start && n.end).map(n => durMins(n.start, n.end)));
  const totalNapMins = valid.map(d => d.naps.filter(n => n.start && n.end).reduce((s, n) => s + durMins(n.start, n.end), 0));
  const nightStarts = valid.map(d => {
    const m = timeToMins(d.nightSleepStart);
    return m < 300 ? m + 1440 : m; // handle midnight crossover
  });

  // Consistency: check std dev of wake-up times
  const wakeupMins = valid.map(d => timeToMins(d.wakeUpTime));
  const wakeupAvg = avg(wakeupMins);
  const wakeupStd = Math.sqrt(wakeupMins.reduce((s, v) => s + Math.pow(v - wakeupAvg, 2), 0) / wakeupMins.length);
  const consistency: SleepPattern["consistency"] = wakeupStd < 30 ? "consistent" : wakeupStd < 60 ? "somewhat" : "inconsistent";
  return {
    avgWakeWindow: avg(wakeWindows) || 90,
    avgNapDuration: avg(napDurations) || 45,
    avgNightStart: avg(nightStarts) % 1440,
    avgTotalDayNapMins: avg(totalNapMins),
    avgNightWakeups: Math.round(avg(valid.map(d => d.nightWakeups))),
    consistency,
    totalDaysAnalyzed: valid.length
  };
}

// ─── Age-based tips ───────────────────────────────────────────────────────────

type AgeTier = "0_3" | "3_6" | "6_12";
function getAgeTier(ageMonths: number): AgeTier {
  if (ageMonths < 3) return "0_3";
  if (ageMonths < 6) return "3_6";
  return "6_12";
}
const PRE_SLEEP_TIPS: Record<AgeTier, {
  emoji: string;
  tip: string;
}[]> = {
  "0_3": [{
    emoji: "🤗",
    tip: "Swaddle snugly — it mimics the womb and reduces startle reflex."
  }, {
    emoji: "🔊",
    tip: "White noise (fan, shushing, rain sounds) helps block stimuli and deepen sleep."
  }, {
    emoji: "🌙",
    tip: "Dim lights 15–20 min before sleep to signal the brain it's rest time."
  }, {
    emoji: "🍼",
    tip: "A full feed before sleep reduces mid-nap hunger wake-ups."
  }, {
    emoji: "🤲",
    tip: "Gentle rocking or patting helps very young babies self-settle."
  }],
  "3_6": [{
    emoji: "⏰",
    tip: "Start a simple routine: bath → feed → cuddle → sleep. Consistency is key."
  }, {
    emoji: "🌙",
    tip: "Put baby down drowsy-but-awake to start building self-soothing skills."
  }, {
    emoji: "😴",
    tip: "Watch for sleep cues: eye rubbing, yawning, staring blankly. Act fast!"
  }, {
    emoji: "🎵",
    tip: "A soft lullaby or consistent sound cue trains the brain to associate it with sleep."
  }, {
    emoji: "🌡️",
    tip: "Keep the room 68–72°F (20–22°C) — cool rooms promote deeper sleep."
  }],
  "6_12": [{
    emoji: "🧸",
    tip: "Introduce a safe 'sleep object' (lovey) — it becomes a comfort cue."
  }, {
    emoji: "⏳",
    tip: "Gradually extend the time between bedtime and the last nap (2.5–3h ideal)."
  }, {
    emoji: "🚫",
    tip: "Avoid screens, loud play, or stimulating activity 30 min before sleep."
  }, {
    emoji: "📅",
    tip: "Many babies drop to 2 naps at 6–8 months. Adjust schedule accordingly."
  }, {
    emoji: "🛏️",
    tip: "Sleep training methods (Ferber, gentle pick-up-put-down) are safe from 6 months."
  }]
};
const IMPROVEMENT_TIPS_BY_PATTERN: Record<string, {
  emoji: string;
  tip: string;
}[]> = {
  inconsistent: [{
    emoji: "🗓️",
    tip: "Try to wake baby at the same time every day — this anchors the whole schedule."
  }, {
    emoji: "🌅",
    tip: "Expose baby to natural morning light immediately after waking — it sets the circadian clock."
  }, {
    emoji: "📝",
    tip: "Track naps for 3 more days — patterns usually emerge after consistent logging."
  }],
  somewhat: [{
    emoji: "⏰",
    tip: "You're close to a consistent rhythm! Push bedtime 15 min earlier to consolidate sleep."
  }, {
    emoji: "🛑",
    tip: "Avoid late-afternoon naps past 4 PM — they can shift bedtime later."
  }, {
    emoji: "🔁",
    tip: "Repeat the same pre-sleep sequence every time, even for naps."
  }],
  consistent: [{
    emoji: "🌟",
    tip: "Excellent routine! Keep it going — consistency is the #1 predictor of good infant sleep."
  }, {
    emoji: "📈",
    tip: "As baby grows, gradually push wake windows by 15 min every 2 weeks."
  }, {
    emoji: "🌙",
    tip: "You can now try a dream feed (10–11 PM) to extend the overnight stretch."
  }]
};

// ─── Empty day template ───────────────────────────────────────────────────────

function emptyDay(): Omit<SleepDay, "date"> {
  return {
    wakeUpTime: "",
    naps: [{
      start: "",
      end: ""
    }],
    nightSleepStart: "",
    nightWakeups: 0
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface InfantSleepTrackerProps {
  childName: string;
  ageMonths: number;
}
export function InfantSleepTracker({
  childName,
  ageMonths
}: InfantSleepTrackerProps) {
  const {
    t
  } = useTranslation();
  const [history, setHistory] = useState<SleepDay[]>(() => loadHistory(childName));
  const [form, setForm] = useState<Omit<SleepDay, "date">>(emptyDay);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const today = todayStr();
  const todayEntry = history.find(d => d.date === today);
  useEffect(() => {
    if (todayEntry) setForm(todayEntry);
  }, []);
  const pattern = analyzePattern(history);
  const ageTier = getAgeTier(ageMonths);

  // ── Prediction ──────────────────────────────────────────────
  const lastWakeTime = todayEntry?.wakeUpTime || form.wakeUpTime;
  let predNextSleep: string | null = null;
  let predFreeMins: number | null = null;
  if (lastWakeTime && pattern) {
    // Predict based on last wake + avg wake window
    const nextSleepMins = timeToMins(lastWakeTime) + pattern.avgWakeWindow;
    predNextSleep = minsToTime(nextSleepMins);
    predFreeMins = pattern.avgNapDuration;
  }

  // ── Handlers ────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!form.wakeUpTime && form.naps.every(n => !n.start)) return;
    const entry: SleepDay = {
      date: today,
      ...form
    };
    const updated = [...history.filter(d => d.date !== today), entry].sort((a, b) => a.date.localeCompare(b.date));
    setHistory(updated);
    saveHistory(childName, updated);
    setSaved(true);
    setShowInput(false);
    setTimeout(() => setSaved(false), 2500);
  }, [form, history, today, childName]);
  const addNap = () => setForm(f => ({
    ...f,
    naps: [...f.naps, {
      start: "",
      end: ""
    }]
  }));
  const removeNap = (i: number) => setForm(f => ({
    ...f,
    naps: f.naps.filter((_, idx) => idx !== i)
  }));
  const updateNap = (i: number, field: "start" | "end", val: string) => setForm(f => {
    const naps = [...f.naps];
    naps[i] = {
      ...naps[i]!,
      [field]: val
    };
    return {
      ...f,
      naps
    };
  });
  const inputCls = "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  // ── UI ──────────────────────────────────────────────────────
  return <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">{t("components.infant_sleep_tracker.sleep_tracker_prediction")}</h3>
        </div>
        <Badge variant="outline" className="rounded-full px-3 text-xs font-semibold gap-1.5">
          <Baby className="h-3 w-3" /> {ageMonths} {t("components.infant_sleep_tracker.month")}{ageMonths !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* ── Prediction card (shown once there's data) ─────── */}
      {predNextSleep && pattern && <Card className="rounded-3xl border-2 border-border dark:border-border bg-gradient-to-br from-muted dark:from-primary to-muted dark:to-primary overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">{t("components.infant_sleep_tracker.next_predicted_sleep")}</p>
                <p className="text-2xl font-extrabold text-primary dark:text-muted-foreground">{formatTime12(predNextSleep)}</p>
                <p className="text-sm text-primary dark:text-muted-foreground mt-0.5">
                  {t("components.infant_sleep_tracker.based_on_last_wake_up_at")} <strong>{formatTime12(lastWakeTime)}</strong> {t("components.infant_sleep_tracker.avg")} {fmtDur(pattern.avgWakeWindow)} {t("components.infant_sleep_tracker.wake_window")}
                </p>
              </div>
              <div className="text-4xl">😴</div>
            </div>

            {predFreeMins && predFreeMins > 0 && <div className="bg-white/60 rounded-2xl px-4 py-2.5 border border-border dark:border-border">
                <p className="text-xs font-bold text-primary mb-1">{t("components.infant_sleep_tracker.estimated_nap_duration")}</p>
                <p className="font-bold text-primary dark:text-muted-foreground">~{fmtDur(predFreeMins)}</p>
              </div>}

            {/* Parent productivity suggestion */}
            {predFreeMins && predFreeMins >= 30 && <div className="bg-muted dark:bg-primary border border-border dark:border-border rounded-2xl px-4 py-3">
                <p className="text-xs font-bold text-primary dark:text-muted-foreground mb-1.5">{t("components.infant_sleep_tracker.your_free_time_window")}</p>
                <p className="text-sm text-primary dark:text-muted-foreground">
                  {t("components.infant_sleep_tracker.you_may_get")} <strong>~{fmtDur(predFreeMins)}</strong> {t("components.infant_sleep_tracker.to_yourself_consider")}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {predFreeMins >= 60 && <span className="text-xs bg-muted dark:bg-primary text-primary dark:text-muted-foreground px-2.5 py-1 rounded-full font-medium">{t("components.infant_sleep_tracker.rest")}</span>}
                  {predFreeMins >= 45 && <span className="text-xs bg-muted dark:bg-primary text-primary dark:text-muted-foreground px-2.5 py-1 rounded-full font-medium">{t("components.infant_sleep_tracker.work")}</span>}
                  <span className="text-xs bg-muted dark:bg-primary text-primary dark:text-muted-foreground px-2.5 py-1 rounded-full font-medium">{t("components.infant_sleep_tracker.eat_a_meal")}</span>
                  {predFreeMins >= 30 && <span className="text-xs bg-muted dark:bg-primary text-primary dark:text-muted-foreground px-2.5 py-1 rounded-full font-medium">{t("components.infant_sleep_tracker.light_tasks")}</span>}
                </div>
              </div>}
          </CardContent>
        </Card>}

      {/* ── Pattern summary (shown once ≥2 days logged) ───── */}
      {pattern && <Card className="rounded-3xl border-border/50 overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              {t("components.infant_sleep_tracker.sleep_pattern")}{pattern.totalDaysAnalyzed} {t("components.infant_sleep_tracker.days_analysed")}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[{
            label: "Avg wake window",
            value: fmtDur(pattern.avgWakeWindow),
            icon: "⏱️"
          }, {
            label: "Avg nap length",
            value: fmtDur(pattern.avgNapDuration),
            icon: "😴"
          }, {
            label: "Bedtime",
            value: formatTime12(minsToTime(pattern.avgNightStart)),
            icon: "🌙"
          }, {
            label: "Night wake-ups",
            value: `${pattern.avgNightWakeups}×`,
            icon: "🌛"
          }].map(s => <div key={s.label} className="bg-muted/40 rounded-2xl px-3 py-2.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">{s.icon} {s.label}</p>
                  <p className="font-bold text-sm text-foreground mt-0.5">{s.value}</p>
                </div>)}
            </div>
            {/* Consistency badge */}
            <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${pattern.consistency === "consistent" ? "bg-muted dark:bg-primary text-primary dark:text-muted-foreground border border-border dark:border-border" : pattern.consistency === "somewhat" ? "bg-muted dark:bg-primary text-primary dark:text-muted-foreground border border-border dark:border-border" : "bg-muted dark:bg-primary text-primary dark:text-muted-foreground border border-border dark:border-border"}`}>
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              {pattern.consistency === "consistent" && "✅ Sleep timing is consistent — great job!"}
              {pattern.consistency === "somewhat" && "⚠️ Sleep timing is somewhat consistent — getting there!"}
              {pattern.consistency === "inconsistent" && "❌ Sleep timing is inconsistent — a fixed schedule will help."}
            </div>
          </CardContent>
        </Card>}

      {/* ── Log today's sleep (toggle) ──────────────────────── */}
      <Card className="rounded-3xl border-border/50 overflow-hidden">
        <button onClick={() => setShowInput(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <Sun className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">
              {todayEntry ? "Update Today's Sleep Log" : "Log Today's Sleep"}
            </span>
            {todayEntry && <Badge className="bg-muted dark:bg-primary text-primary dark:text-muted-foreground text-xs border-border dark:border-border px-2 py-0.5 rounded-full">
                {t("components.infant_sleep_tracker.logged")}
              </Badge>}
          </div>
          {showInput ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>

        {showInput && <CardContent className="px-5 pb-5 pt-0 space-y-4 border-t border-border/40">
            {/* Wake-up time */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Sun className="h-3.5 w-3.5 text-primary" /> {t("components.infant_sleep_tracker.morning_wake_up_time")}
              </label>
              <input type="time" className={inputCls} value={form.wakeUpTime} onChange={e => setForm(f => ({
            ...f,
            wakeUpTime: e.target.value
          }))} />
            </div>

            {/* Nap sessions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5 text-primary" /> {t("components.infant_sleep_tracker.nap_sessions")}
                </label>
                <button type="button" onClick={addNap} className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> {t("components.infant_sleep_tracker.add_nap")}
                </button>
              </div>
              <div className="space-y-2">
                {form.naps.map((nap, i) => {
              const {
                t
              } = useTranslation();
              return <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">{t("components.infant_sleep_tracker.nap")} {i + 1} {t("components.infant_sleep_tracker.start")}</p>
                        <input type="time" className={inputCls} value={nap.start} onChange={e => updateNap(i, "start", e.target.value)} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">{t("components.infant_sleep_tracker.nap_2")} {i + 1} {t("components.infant_sleep_tracker.end")}</p>
                        <input type="time" className={inputCls} value={nap.end} onChange={e => updateNap(i, "end", e.target.value)} />
                      </div>
                    </div>
                    {form.naps.length > 1 && <button type="button" onClick={() => removeNap(i)} className="mt-4 p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>}
                  </div>;
            })}
              </div>
            </div>

            {/* Night sleep start */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Moon className="h-3.5 w-3.5 text-primary" /> {t("components.infant_sleep_tracker.night_sleep_start")}
              </label>
              <input type="time" className={inputCls} value={form.nightSleepStart} onChange={e => setForm(f => ({
            ...f,
            nightSleepStart: e.target.value
          }))} />
            </div>

            {/* Night wake-ups */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <BedDouble className="h-3.5 w-3.5 text-primary" /> {t("components.infant_sleep_tracker.night_wake_ups_0_8")}
              </label>
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => <button key={n} type="button" onClick={() => setForm(f => ({
              ...f,
              nightWakeups: n
            }))} className={`h-9 w-9 rounded-xl font-bold text-sm transition-all border-2 ${form.nightWakeups === n ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-muted/40 text-foreground border-transparent hover:border-primary/40"}`}>
                    {n}
                  </button>)}
              </div>
            </div>

            {/* Save button */}
            <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors">
              {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved!" : "Save Sleep Log"}
            </button>
          </CardContent>}
      </Card>

      {/* ── Tips section ────────────────────────────────────── */}
      <Card className="rounded-3xl border-border/50 overflow-hidden">
        <button onClick={() => setShowTips(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">{t("components.infant_sleep_tracker.pre_sleep_tips_for")} {ageMonths < 3 ? "0–3" : ageMonths < 6 ? "3–6" : "6–12"} {t("components.infant_sleep_tracker.months")}</span>
          </div>
          {showTips ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>
        {showTips && <CardContent className="px-5 pb-5 pt-0 border-t border-border/40 space-y-2">
            {PRE_SLEEP_TIPS[ageTier].map((tip, i) => <div key={i} className="flex items-start gap-3 bg-muted rounded-2xl px-3 py-2.5">
                <span className="text-xl flex-shrink-0">{tip.emoji}</span>
                <p className="text-sm text-foreground leading-snug">{tip.tip}</p>
              </div>)}
          </CardContent>}
      </Card>

      {/* ── Sleep improvement tips ───────────────────────────── */}
      {pattern && <Card className="rounded-3xl border-border/50 overflow-hidden">
          <CardContent className="px-5 py-4 space-y-2.5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> {t("components.infant_sleep_tracker.improvement_suggestions")}
            </p>
            {IMPROVEMENT_TIPS_BY_PATTERN[pattern.consistency].map((tip, i) => <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-2xl px-3 py-2.5">
                <span className="text-xl flex-shrink-0">{tip.emoji}</span>
                <p className="text-sm text-foreground leading-snug">{tip.tip}</p>
              </div>)}
          </CardContent>
        </Card>}

      {/* ── Sleep history log ────────────────────────────────── */}
      {history.length > 0 && <Card className="rounded-3xl border-border/50 overflow-hidden">
          <button onClick={() => setShowHistory(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="font-bold text-sm">{t("components.infant_sleep_tracker.sleep_history")}{history.length} {t("components.infant_sleep_tracker.days")}</span>
            </div>
            {showHistory ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>
          {showHistory && <CardContent className="px-5 pb-5 pt-0 border-t border-border/40 space-y-2">
              {[...history].reverse().slice(0, 7).map(day => {
          const {
            t
          } = useTranslation();
          return <div key={day.date} className="bg-muted/30 rounded-2xl px-4 py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{new Date(day.date + "T12:00:00").toLocaleDateString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric"
                })}</span>
                    {day.date === today && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 px-2 py-0">{t("components.infant_sleep_tracker.today")}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                    {day.wakeUpTime && <span>{t("components.infant_sleep_tracker.wake")} <strong className="text-foreground">{formatTime12(day.wakeUpTime)}</strong></span>}
                    {day.naps.filter(n => n.start).map((n, i) => {
                const {
                  t
                } = useTranslation();
                return <span key={i}>
                        {t("components.infant_sleep_tracker.nap_3")} {i + 1}: <strong className="text-foreground">{formatTime12(n.start)}{n.end ? `–${formatTime12(n.end)}` : ""}</strong>
                        {n.start && n.end && <span className="text-primary ml-1">({fmtDur(durMins(n.start, n.end))})</span>}
                      </span>;
              })}
                    {day.nightSleepStart && <span>{t("components.infant_sleep_tracker.bed")} <strong className="text-foreground">{formatTime12(day.nightSleepStart)}</strong></span>}
                    {day.nightWakeups > 0 && <span>{t("components.infant_sleep_tracker.woke_up")} <strong className="text-foreground">{day.nightWakeups}×</strong></span>}
                  </div>
                </div>;
        })}
            </CardContent>}
        </Card>}

      {/* ── Empty state prompt ───────────────────────────────── */}
      {history.length === 0 && !showInput && <div className="text-center py-4 text-sm text-muted-foreground">
          <p>{t("components.infant_sleep_tracker.log_sleep_for")} <strong>{t("components.infant_sleep_tracker.2_days")}</strong> {t("components.infant_sleep_tracker.to_unlock_predictions_pattern_analysis")}</p>
        </div>}
    </div>;
}