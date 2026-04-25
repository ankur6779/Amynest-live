import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Moon, Sun, Clock, Play, Pause, Plus, Trash2, Edit3, Check, X,
  AlertTriangle, TrendingUp, Sparkles, RotateCcw, BedDouble,
  Activity, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Wake Window Logic ────────────────────────────────────────────────────────
type WakeWindowSpec = {
  range: string;
  windowMin: number;   // ideal wake window
  windowMax: number;   // upper bound (overtired beyond)
  napCount: string;
  totalDayMin: number;
  napDurMin: number;
  nightSleepHrs: string;
};

function getWakeSpec(months: number): WakeWindowSpec {
  if (months < 1)  return { range: "0–1 mo",   windowMin: 45,  windowMax: 60,  napCount: "5–7 micro", totalDayMin: 480, napDurMin: 60,  nightSleepHrs: "8–9 (interrupted)" };
  if (months < 2)  return { range: "1–2 mo",   windowMin: 60,  windowMax: 90,  napCount: "4–5",       totalDayMin: 360, napDurMin: 60,  nightSleepHrs: "8–10 (interrupted)" };
  if (months < 3)  return { range: "2–3 mo",   windowMin: 90,  windowMax: 120, napCount: "4–5",       totalDayMin: 300, napDurMin: 60,  nightSleepHrs: "10–11" };
  if (months < 5)  return { range: "3–5 mo",   windowMin: 90,  windowMax: 150, napCount: "3–4",       totalDayMin: 270, napDurMin: 75,  nightSleepHrs: "10–11" };
  if (months < 7)  return { range: "5–7 mo",   windowMin: 120, windowMax: 150, napCount: "3",         totalDayMin: 240, napDurMin: 80,  nightSleepHrs: "11" };
  if (months < 9)  return { range: "7–9 mo",   windowMin: 150, windowMax: 180, napCount: "2–3",       totalDayMin: 210, napDurMin: 90,  nightSleepHrs: "11" };
  if (months < 12) return { range: "9–12 mo",  windowMin: 180, windowMax: 240, napCount: "2",         totalDayMin: 180, napDurMin: 90,  nightSleepHrs: "11" };
  if (months < 15) return { range: "12–15 mo", windowMin: 240, windowMax: 300, napCount: "1–2",       totalDayMin: 150, napDurMin: 90,  nightSleepHrs: "11–12" };
  if (months < 18) return { range: "15–18 mo", windowMin: 300, windowMax: 360, napCount: "1",         totalDayMin: 120, napDurMin: 120, nightSleepHrs: "11–12" };
  return                  { range: "18–24 mo", windowMin: 300, windowMax: 360, napCount: "1",         totalDayMin: 120, napDurMin: 120, nightSleepHrs: "11–12" };
}

// ─── Sleep Log (localStorage) ────────────────────────────────────────────────
type SleepEvent = {
  id: string;
  type: "wake_up" | "down";   // wake_up = baby is awake; down = baby went to sleep
  ts: number;                 // unix ms
};

function loadSleepLog(childName: string): SleepEvent[] {
  try {
    const raw = localStorage.getItem(`amynest:sleep:${childName}`);
    if (!raw) return [];
    return JSON.parse(raw) as SleepEvent[];
  } catch { return []; }
}
function saveSleepLog(childName: string, log: SleepEvent[]) {
  try { localStorage.setItem(`amynest:sleep:${childName}`, JSON.stringify(log)); } catch {}
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12 ? "AM" : "PM";
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${m < 10 ? "0" : ""}${m} ${am}`;
}
function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h}h ${m}m`;
}

// ─── Wake Window System ───────────────────────────────────────────────────────
export function WakeWindowSystem({ childName, ageMonths }: { childName: string; ageMonths: number }) {
  const { toast } = useToast();
  const spec = useMemo(() => getWakeSpec(ageMonths), [ageMonths]);
  const [log, setLog] = useState<SleepEvent[]>(() => loadSleepLog(childName));
  const [now, setNow] = useState(Date.now());

  // Refresh "now" every 30s so countdown stays live
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Reload log when child changes
  useEffect(() => { setLog(loadSleepLog(childName)); }, [childName]);

  const lastEvent = log.length > 0 ? log[log.length - 1] : null;
  const isAwake = lastEvent?.type === "wake_up";
  const elapsedMin = lastEvent ? Math.floor((now - lastEvent.ts) / 60_000) : 0;

  const recordEvent = useCallback((type: SleepEvent["type"]) => {
    const next = [...log, { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, type, ts: Date.now() }];
    setLog(next);
    saveSleepLog(childName, next);
    toast({
      description: type === "wake_up" ? "Wake-up logged ☀️" : "Down for sleep logged 🌙",
    });
  }, [log, childName, toast]);

  // Compute status
  let status: "idle" | "normal" | "tired" | "overtired" | "asleep" = "idle";
  if (!lastEvent) status = "idle";
  else if (lastEvent.type === "down") status = "asleep";
  else {
    const earlyTired = spec.windowMin - 15;          // 15 min before min window = entering window
    if (elapsedMin < earlyTired) status = "normal";
    else if (elapsedMin < spec.windowMax) status = "tired";
    else status = "overtired";
  }

  const remainingToOptimal = Math.max(0, spec.windowMin - elapsedMin);
  const progressPct = isAwake
    ? Math.min(100, Math.round((elapsedMin / spec.windowMax) * 100))
    : 0;

  const STATUS_META: Record<typeof status, { label: string; color: string; bg: string; emoji: string; msg: string }> = {
    idle:       { label: "Not tracking",    color: "text-muted-foreground",                bg: "bg-muted/40",                                 emoji: "💤", msg: "Tap 'Just woke up' below to start tracking the wake window." },
    asleep:     { label: "Asleep",          color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-100 dark:bg-indigo-500/20",         emoji: "😴", msg: "Sleeping since " + (lastEvent ? fmtTime(lastEvent.ts) : "—") + ". Tap 'Just woke up' when they wake." },
    normal:     { label: "Normal",          color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-500/20",     emoji: "🟢", msg: `Plenty of awake time left. Aim for sleep around ${spec.windowMin - elapsedMin > 0 ? `${spec.windowMin - elapsedMin} min` : "now"}.` },
    tired:      { label: "Getting tired",   color: "text-amber-700 dark:text-amber-300",   bg: "bg-amber-100 dark:bg-amber-500/20",           emoji: "🟡", msg: "Start the nap routine now — dim lights, quiet voice, swaddle/sleep sack." },
    overtired:  { label: "Overtired",       color: "text-rose-700 dark:text-rose-300",     bg: "bg-rose-100 dark:bg-rose-500/20",             emoji: "🔴", msg: "Past the window — use motion (rocking, carrier) + white noise to break the cortisol spike." },
  };
  const m = STATUS_META[status];

  return (
    <div className="space-y-3">
      {/* Big Status Card */}
      <div className={`rounded-2xl ${m.bg} border-2 border-current ${m.color} p-4 backdrop-blur-md shadow-[0_8px_24px_-12px_rgba(99,102,241,0.4)]`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{m.emoji}</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Status</p>
              <p className="text-base font-bold">{m.label}</p>
            </div>
          </div>
          {isAwake && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">Awake for</p>
              <p className="text-lg font-bold tabular-nums">{fmtDuration(elapsedMin)}</p>
            </div>
          )}
          {status === "asleep" && lastEvent && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">Asleep for</p>
              <p className="text-lg font-bold tabular-nums">{fmtDuration(elapsedMin)}</p>
            </div>
          )}
        </div>

        {/* Progress bar — only when awake */}
        {isAwake && (
          <>
            <div className="h-2 rounded-full bg-white/40 dark:bg-white/10 overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-current transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] opacity-80">
              <span>0</span>
              <span className="font-bold">Optimal: {spec.windowMin}–{spec.windowMax} min</span>
              <span>{spec.windowMax}+</span>
            </div>
          </>
        )}

        <p className="mt-2 text-[12px] leading-snug opacity-95">{m.msg}</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => recordEvent("wake_up")}
          className="rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-[0_4px_12px_-2px_rgba(245,158,11,0.5)]"
        >
          <Sun className="h-4 w-4" />
          Just woke up
        </button>
        <button
          onClick={() => recordEvent("down")}
          className="rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-[0_4px_12px_-2px_rgba(79,70,229,0.5)]"
        >
          <Moon className="h-4 w-4" />
          Down for sleep
        </button>
      </div>

      {/* Today's snapshot */}
      <TodaySnapshot childName={childName} log={log} now={now} spec={spec} setLog={setLog} />
    </div>
  );
}

// ─── Today's snapshot of sleep events ─────────────────────────────────────────
function TodaySnapshot({
  childName, log, now, spec, setLog,
}: {
  childName: string;
  log: SleepEvent[];
  now: number;
  spec: WakeWindowSpec;
  setLog: (l: SleepEvent[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const todayEvents = log.filter((e) => e.ts >= startOfDay.getTime());

  // Compute today's sleep total + nap count
  const sleeps = pairSleeps(log).filter((s) => s.startTs >= startOfDay.getTime() || (s.endTs ?? 0) >= startOfDay.getTime());
  const todaySleepMin = sleeps.reduce((acc, s) => acc + Math.max(0, Math.min(now, s.endTs ?? now) - Math.max(startOfDay.getTime(), s.startTs)) / 60_000, 0);
  const napCount = sleeps.filter((s) => s.endTs && new Date(s.startTs).getHours() >= 6 && new Date(s.startTs).getHours() < 19).length;

  const removeEvent = (id: string) => {
    const next = log.filter((e) => e.id !== id);
    setLog(next);
    saveSleepLog(childName, next);
  };

  return (
    <div className="rounded-xl bg-white/50 dark:bg-white/[0.03] border border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">Today</span>
          <span className="text-[10px] text-muted-foreground">
            · {napCount} nap{napCount === 1 ? "" : "s"} · {fmtDuration(Math.round(todaySleepMin))}
          </span>
          <span className="text-[10px] text-muted-foreground ml-1">/ target {fmtDuration(spec.totalDayMin)}</span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {todayEvents.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-2">No events logged today yet.</p>
          )}
          {todayEvents.slice().reverse().map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-[11px] rounded-lg bg-white/60 dark:bg-white/5 border border-border px-2 py-1.5">
              <span className="text-base">{e.type === "wake_up" ? "☀️" : "🌙"}</span>
              <span className="font-semibold text-foreground">{e.type === "wake_up" ? "Woke up" : "Down for sleep"}</span>
              <span className="text-muted-foreground ml-auto">{fmtTime(e.ts)}</span>
              <button
                onClick={() => removeEvent(e.id)}
                className="text-muted-foreground hover:text-rose-500 transition-colors"
                aria-label="Delete event"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pair sleeps from event log ──────────────────────────────────────────────
type Sleep = { startTs: number; endTs: number | null; durationMin: number | null };

function pairSleeps(log: SleepEvent[]): Sleep[] {
  const sleeps: Sleep[] = [];
  let openStart: number | null = null;
  for (const e of log) {
    if (e.type === "down") {
      openStart = e.ts;
    } else if (e.type === "wake_up" && openStart !== null) {
      const dur = Math.round((e.ts - openStart) / 60_000);
      sleeps.push({ startTs: openStart, endTs: e.ts, durationMin: dur });
      openStart = null;
    }
  }
  if (openStart !== null) sleeps.push({ startTs: openStart, endTs: null, durationMin: null });
  return sleeps;
}

// ─── Sleep Issue Detector ─────────────────────────────────────────────────────
type Issue = { id: string; severity: "info" | "warn" | "alert"; emoji: string; title: string; detail: string; tip: string };

function detectIssues(log: SleepEvent[], spec: WakeWindowSpec): Issue[] {
  const issues: Issue[] = [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = log.filter((e) => e.ts >= sevenDaysAgo);
  const sleeps = pairSleeps(recent).filter((s) => s.endTs && s.durationMin !== null);

  if (sleeps.length === 0) {
    return [{
      id: "no_data", severity: "info", emoji: "📊",
      title: "Not enough data yet",
      detail: "Log a few naps and wake-ups for issue detection to kick in.",
      tip: "Use the buttons above each time baby wakes or goes down. After 2–3 days the system can start spotting patterns.",
    }];
  }

  // 1. Overtiredness — find wake_up → down pairs where wake window > spec.windowMax
  let overtiredCount = 0;
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    if (prev.type === "wake_up" && curr.type === "down") {
      const ww = (curr.ts - prev.ts) / 60_000;
      if (ww > spec.windowMax) overtiredCount++;
    }
  }
  if (overtiredCount >= 3) {
    issues.push({
      id: "overtired", severity: "alert", emoji: "😵",
      title: "Frequent overtiredness",
      detail: `${overtiredCount} wake windows in the past 7 days exceeded ${spec.windowMax} min.`,
      tip: "Push the next nap 15–20 min earlier than you think. Overtired babies actually need sleep SOONER, not later.",
    });
  } else if (overtiredCount >= 1) {
    issues.push({
      id: "overtired_mild", severity: "warn", emoji: "⏰",
      title: "Occasional overtiredness",
      detail: `${overtiredCount} time(s) the wake window stretched beyond ${spec.windowMax} min.`,
      tip: "Watch for early sleep cues (yawning, glazed staring) and start the routine right then.",
    });
  }

  // 2. Irregular naps — variance in nap durations
  const napDurs = sleeps.map((s) => s.durationMin!).filter((d) => d > 20 && d < 240);
  if (napDurs.length >= 3) {
    const mean = napDurs.reduce((a, b) => a + b, 0) / napDurs.length;
    const variance = napDurs.reduce((a, b) => a + (b - mean) ** 2, 0) / napDurs.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 35) {
      issues.push({
        id: "irregular", severity: "warn", emoji: "🌪️",
        title: "Irregular nap lengths",
        detail: `Naps swing widely (avg ${Math.round(mean)} min, ±${Math.round(stdDev)} min).`,
        tip: "Try to anchor the first nap of the day at a consistent clock time. The first nap sets the rhythm for the rest of the day.",
      });
    }
  }

  // 3. Frequent night waking — count down→up pairs at night with short duration
  let nightWakings = 0;
  for (const s of sleeps) {
    if (s.endTs === null) continue;
    const hr = new Date(s.startTs).getHours();
    if ((hr >= 19 || hr <= 6) && s.durationMin! < 90 && s.durationMin! > 0) nightWakings++;
  }
  if (nightWakings >= 4) {
    issues.push({
      id: "night_wakings", severity: "alert", emoji: "🌃",
      title: "Frequent night waking",
      detail: `${nightWakings} short overnight sleeps in the past 7 days.`,
      tip: "Common causes: hunger (under 6m), teething, sleep regression (4m, 8m, 12m, 18m). Check room temp 18–20°C, white noise, blackout.",
    });
  }

  // 4. Short naps
  const shortNaps = sleeps.filter((s) => s.durationMin! > 0 && s.durationMin! < 35).length;
  if (shortNaps >= 3) {
    issues.push({
      id: "short_naps", severity: "warn", emoji: "⚡",
      title: "Many short naps (under 35 min)",
      detail: `${shortNaps} short naps in the past week — possibly catnapping.`,
      tip: "Try to extend by going in BEFORE baby wakes (around 25 min mark) and gently soothing them through the next sleep cycle.",
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "all_good", severity: "info", emoji: "🌟",
      title: "Sleep looks healthy",
      detail: "No major issues detected in the past 7 days.",
      tip: "Keep doing what you're doing. Consistency is the biggest sleep gift you can give.",
    });
  }

  return issues;
}

export function SleepIssueDetector({ childName, ageMonths }: { childName: string; ageMonths: number }) {
  const [log, setLog] = useState<SleepEvent[]>(() => loadSleepLog(childName));
  useEffect(() => { setLog(loadSleepLog(childName)); }, [childName]);
  // Re-read log when window regains focus (cross-component sync)
  useEffect(() => {
    const onFocus = () => setLog(loadSleepLog(childName));
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [childName]);

  const spec = getWakeSpec(ageMonths);
  const issues = useMemo(() => detectIssues(log, spec), [log, spec]);

  const SEV_META = {
    info:  { color: "text-sky-700 dark:text-sky-300",       bg: "bg-sky-50 dark:bg-sky-500/10",       border: "border-sky-200/60 dark:border-sky-400/20" },
    warn:  { color: "text-amber-700 dark:text-amber-300",   bg: "bg-amber-50 dark:bg-amber-500/10",   border: "border-amber-200/60 dark:border-amber-400/20" },
    alert: { color: "text-rose-700 dark:text-rose-300",     bg: "bg-rose-50 dark:bg-rose-500/10",     border: "border-rose-200/60 dark:border-rose-400/20" },
  } as const;

  return (
    <div className="space-y-2">
      {issues.map((iss) => {
        const m = SEV_META[iss.severity];
        return (
          <div key={iss.id} className={`rounded-xl ${m.bg} border ${m.border} p-3`}>
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none shrink-0 mt-0.5">{iss.emoji}</span>
              <div className="min-w-0">
                <p className={`text-sm font-bold ${m.color}`}>{iss.title}</p>
                <p className={`text-[12px] ${m.color}/85 mt-0.5 leading-snug`}>{iss.detail}</p>
                <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-current/10">
                  <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                  <p className={`text-[12px] ${m.color}/95 leading-snug`}>{iss.tip}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Routine Builder ─────────────────────────────────────────────────────────
type RoutineItem = { id: string; time: string; activity: string; emoji: string };

function generateRoutine(months: number, wakeUpTime = "7:00 AM"): RoutineItem[] {
  const spec = getWakeSpec(months);
  const items: RoutineItem[] = [];

  // Parse wake time
  const parseTime = (t: string): Date => {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const d = new Date();
    if (!m) { d.setHours(7, 0, 0, 0); return d; }
    let h = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    const ap = m[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    d.setHours(h, mins, 0, 0);
    return d;
  };

  const fmt = (d: Date) => fmtTime(d.getTime());

  const cur = parseTime(wakeUpTime);
  const napCount = months < 3 ? 4 : months < 6 ? 3 : months < 9 ? 3 : months < 12 ? 2 : months < 15 ? 1 : 1;

  items.push({ id: "wake", time: fmt(cur), activity: "Wake + Feed", emoji: "☀️" });

  for (let i = 0; i < napCount; i++) {
    cur.setMinutes(cur.getMinutes() + spec.windowMin);
    items.push({ id: `nap${i + 1}`, time: fmt(cur), activity: `Nap ${i + 1}`, emoji: "😴" });
    cur.setMinutes(cur.getMinutes() + spec.napDurMin);
    items.push({ id: `wake${i + 1}`, time: fmt(cur), activity: i === napCount - 1 ? "Wake + Snack" : "Wake + Play", emoji: i === napCount - 1 ? "🍪" : "🧸" });

    // Add meals strategically
    const hr = cur.getHours();
    if (i === 0 && months >= 6) items.push({ id: `meal1`, time: fmt(new Date(cur.getTime() + 30 * 60_000)), activity: "Breakfast / Solids", emoji: "🥣" });
    if (hr >= 11 && hr <= 13 && months >= 6) {
      const lunch = new Date(cur); lunch.setHours(12, 30, 0, 0);
      items.push({ id: `lunch`, time: fmt(lunch), activity: "Lunch", emoji: "🍛" });
    }
  }

  // Bedtime routine
  const bath = new Date(cur);
  // Aim bedtime ~12 hr after wake
  const wake = parseTime(wakeUpTime);
  const target = new Date(wake);
  target.setHours(target.getHours() + 12);
  const bedHour = Math.max(target.getHours(), 18);
  bath.setHours(bedHour, 0, 0, 0);
  items.push({ id: `bath`, time: fmt(bath), activity: "Bath time", emoji: "🛁" });
  bath.setMinutes(bath.getMinutes() + 20);
  items.push({ id: `dinner`, time: fmt(bath), activity: months >= 6 ? "Dinner / Last feed" : "Last feed", emoji: "🥄" });
  bath.setMinutes(bath.getMinutes() + 30);
  items.push({ id: `book`, time: fmt(bath), activity: "Book / Lullaby", emoji: "📖" });
  bath.setMinutes(bath.getMinutes() + 15);
  items.push({ id: `bedtime`, time: fmt(bath), activity: "Bedtime", emoji: "🌙" });

  return items;
}

export function RoutineBuilder({ childName, ageMonths }: { childName: string; ageMonths: number }) {
  const { toast } = useToast();
  const storageKey = `amynest:routine:${childName}`;
  const [items, setItems] = useState<RoutineItem[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return generateRoutine(ageMonths);
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editActivity, setEditActivity] = useState("");

  const persist = (next: RoutineItem[]) => {
    setItems(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };

  const regenerate = () => {
    const fresh = generateRoutine(ageMonths);
    persist(fresh);
    toast({ description: "Routine regenerated for " + childName + " 🌟" });
  };

  const startEdit = (item: RoutineItem) => {
    setEditing(item.id);
    setEditTime(item.time);
    setEditActivity(item.activity);
  };
  const saveEdit = (id: string) => {
    persist(items.map((i) => i.id === id ? { ...i, time: editTime, activity: editActivity } : i));
    setEditing(null);
    toast({ description: "Saved ✓" });
  };
  const removeItem = (id: string) => {
    persist(items.filter((i) => i.id !== id));
  };
  const addItem = () => {
    const id = `custom_${Date.now()}`;
    persist([...items, { id, time: "12:00 PM", activity: "New activity", emoji: "✨" }]);
    setEditing(id);
    setEditTime("12:00 PM");
    setEditActivity("New activity");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">Auto-generated for age — tap any row to edit</p>
        <button
          onClick={regenerate}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px] font-bold hover:bg-violet-200 dark:hover:bg-violet-500/25 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Regenerate
        </button>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-white/60 dark:bg-white/5 border border-border overflow-hidden">
            {editing === item.id ? (
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  placeholder="7:00 AM"
                  className="w-full px-2 py-1.5 rounded-lg text-sm border border-border bg-white dark:bg-white/10 text-foreground"
                />
                <input
                  type="text"
                  value={editActivity}
                  onChange={(e) => setEditActivity(e.target.value)}
                  placeholder="Activity"
                  className="w-full px-2 py-1.5 rounded-lg text-sm border border-border bg-white dark:bg-white/10 text-foreground"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(item.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600"
                  >
                    <Check className="h-3 w-3" /> Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-muted text-foreground text-[11px] font-bold"
                  >
                    <X className="h-3 w-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-base shrink-0">{item.emoji}</span>
                <span className="text-[11px] font-bold text-primary tabular-nums shrink-0 w-16">{item.time}</span>
                <span className="text-[12px] text-foreground flex-1 truncate">{item.activity}</span>
                <button
                  onClick={() => startEdit(item)}
                  className="text-muted-foreground hover:text-violet-500 p-1"
                  aria-label="Edit"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-rose-500 p-1"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-border text-[12px] font-bold text-muted-foreground hover:border-violet-400 hover:text-violet-500 transition-all"
      >
        <Plus className="h-3.5 w-3.5" />
        Add custom item
      </button>
    </div>
  );
}

// ─── Weekly Insights ─────────────────────────────────────────────────────────
export function SleepWeeklyInsights({ childName, ageMonths }: { childName: string; ageMonths: number }) {
  const [log, setLog] = useState<SleepEvent[]>(() => loadSleepLog(childName));
  useEffect(() => { setLog(loadSleepLog(childName)); }, [childName]);

  const spec = getWakeSpec(ageMonths);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const stats = useMemo(() => {
    const recent = log.filter((e) => e.ts >= sevenDaysAgo);
    const sleeps = pairSleeps(recent).filter((s) => s.endTs && s.durationMin !== null && s.durationMin > 0);

    // Group by day
    const dayBuckets: Record<string, number> = {};
    for (const s of sleeps) {
      const d = new Date(s.startTs);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      dayBuckets[key] = (dayBuckets[key] ?? 0) + (s.durationMin ?? 0);
    }
    const dailyTotals = Object.values(dayBuckets);
    const avgMin = dailyTotals.length > 0 ? Math.round(dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length) : 0;
    const napCount = sleeps.length;
    const avgNapMin = napCount > 0 ? Math.round(sleeps.reduce((a, s) => a + (s.durationMin ?? 0), 0) / napCount) : 0;

    const expectedDayTotal = spec.totalDayMin + 11 * 60; // approx with night sleep ~11h
    const trend: "good" | "low" | "no_data" = dailyTotals.length === 0 ? "no_data"
      : avgMin < expectedDayTotal * 0.8 ? "low" : "good";

    return { dailyTotals, avgMin, napCount, avgNapMin, trend };
  }, [log, spec, sevenDaysAgo]);

  if (stats.trend === "no_data") {
    return (
      <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
        <p className="text-[12px] text-muted-foreground">
          Log a few wake-ups and naps for at least 2–3 days to see weekly insights here.
        </p>
      </div>
    );
  }

  // Mini bar chart of last 7 days
  const maxMin = Math.max(...stats.dailyTotals, 1);
  const barData: { day: string; min: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const min = stats.dailyTotals[Object.keys({} /* placeholder */).length] ?? 0;
    // recompute from log:
    let dayMin = 0;
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    for (const s of pairSleeps(log)) {
      if (!s.endTs) continue;
      if (s.startTs < dayEnd && s.endTs > dayStart) {
        dayMin += Math.max(0, Math.min(s.endTs, dayEnd) - Math.max(s.startTs, dayStart)) / 60_000;
      }
    }
    barData.push({ day: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"][d.getDay() === 0 ? 6 : d.getDay() - 1], min: Math.round(dayMin) });
    void maxMin; void key; void min;
  }
  const maxBar = Math.max(...barData.map((b) => b.min), 60);

  return (
    <div className="space-y-3">
      {/* Headline */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-100/80 to-fuchsia-100/80 dark:from-violet-900/30 dark:to-fuchsia-900/30 border border-violet-200/60 dark:border-violet-400/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">7-Day Summary</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Stat label="Avg / day" value={fmtDuration(stats.avgMin)} accent="violet" />
          <Stat label="Naps logged" value={String(stats.napCount)} accent="violet" />
          <Stat label="Avg nap" value={fmtDuration(stats.avgNapMin)} accent="violet" />
        </div>

        {/* Bar chart */}
        <div className="flex items-end justify-between gap-1 h-20 px-1">
          {barData.map((b, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-violet-500 to-fuchsia-400 transition-all"
                style={{ height: `${Math.max(2, (b.min / maxBar) * 60)}px` }}
                title={`${b.day}: ${fmtDuration(b.min)}`}
              />
              <span className="text-[9px] text-violet-600 dark:text-violet-300 font-bold">{b.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trend message */}
      <div className={`rounded-xl border p-3 ${stats.trend === "good"
        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60"
        : "bg-amber-50 dark:bg-amber-500/10 border-amber-200/60"}`}>
        <div className="flex items-start gap-2">
          <Sparkles className={`h-4 w-4 shrink-0 mt-0.5 ${stats.trend === "good" ? "text-emerald-600" : "text-amber-600"}`} />
          <div>
            <p className={`text-sm font-bold ${stats.trend === "good" ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200"}`}>
              {stats.trend === "good" ? "Sleep is on track" : "Sleep total is below target"}
            </p>
            <p className={`text-[12px] mt-1 leading-snug ${stats.trend === "good" ? "text-emerald-700/85 dark:text-emerald-300/85" : "text-amber-700/85 dark:text-amber-300/85"}`}>
              {stats.trend === "good"
                ? `Average ${fmtDuration(stats.avgMin)}/day is healthy for this age. Keep the consistent rhythm going.`
                : `Average ${fmtDuration(stats.avgMin)}/day is below the typical ${fmtDuration(spec.totalDayMin + 11 * 60)} for this age. Try one earlier nap and an earlier bedtime by 30 min.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "violet" | "indigo" }) {
  const map = {
    violet: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-200",
    indigo: "bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200",
  } as const;
  return (
    <div className={`rounded-lg ${map[accent]} px-2 py-1.5 text-center`}>
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-sm font-bold tabular-nums leading-tight">{value}</p>
    </div>
  );
}
