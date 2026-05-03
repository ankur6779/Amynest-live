/**
 * Cry Insight (Beta) — web UI.
 *
 * Flow:
 *   1. Parent fills out a small context form (last feed, last sleep, diaper,
 *      "feels warm" toggle).
 *   2. Optionally records 5–15 s of crying via the browser MediaRecorder.
 *      We compute a tiny set of audio features (avg / peak amplitude, zero
 *      crossing rate) on-device and DISCARD the waveform — only numbers are
 *      sent to the server.
 *   3. POST to /api/cry-insight/analyze, render top-2 likely causes with
 *      a friendly suggestion + a Beta safety banner.
 *   4. History (last 10) is shown below.
 *
 * Privacy: no audio is uploaded or stored anywhere — see the audio-pipeline
 * notes inside `analyseRecording` below.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mic, Square, Activity, Baby, AlertTriangle, ShieldAlert, Loader2, RefreshCw, Sparkles, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
interface CryInsightProps {
  childId: number;
  childName: string;
  ageMonths: number;
}
type CryCause = "hunger" | "sleepy" | "discomfort" | "pain";
interface AudioStats {
  avgAmplitude?: number;
  peakAmplitude?: number;
  zeroCrossingRate?: number;
  durationMs?: number;
}
interface CryContext {
  minutesSinceFeed?: number;
  minutesSinceSleep?: number;
  diaperChangedRecently?: boolean;
  fever?: boolean;
  ageMonths?: number;
}
interface CrySession {
  id: number;
  childId: number;
  durationMs: number;
  audioStats: AudioStats;
  context: CryContext;
  primary: {
    cause: CryCause;
    confidence: number;
  };
  secondary: {
    cause: CryCause;
    confidence: number;
  };
  suggestion: string;
  medicalFlag: boolean;
  createdAt: string;
}
const CAUSE_META: Record<CryCause, {
  emoji: string;
  label: string;
  color: string;
}> = {
  hunger: {
    emoji: "🍼",
    label: "Hunger",
    color: "from-primary to-primary"
  },
  sleepy: {
    emoji: "😴",
    label: "Sleepy",
    color: "from-primary to-primary"
  },
  discomfort: {
    emoji: "😣",
    label: "Discomfort",
    color: "from-primary to-primary"
  },
  pain: {
    emoji: "🤕",
    label: "Pain",
    color: "from-primary to-primary"
  }
};
const RECORD_LIMIT_MS = 15_000;
const RECORD_MIN_MS = 1_500;

/** Small-clip audio feature extractor. Always returns finite 0..1 numbers. */
async function analyseRecording(blob: Blob): Promise<AudioStats> {
  // Decode the recorded clip into a mono Float32 PCM buffer using the
  // standard WebAudio API. We then walk the samples ONCE, compute three
  // coarse features, and let the buffer get garbage-collected — no audio
  // ever leaves this function.
  type AudioCtor = typeof AudioContext;
  const Ctor: AudioCtor | undefined = (window as unknown as {
    AudioContext?: AudioCtor;
  }).AudioContext ?? (window as unknown as {
    webkitAudioContext?: AudioCtor;
  }).webkitAudioContext;
  if (!Ctor) {
    return {
      durationMs: 0
    };
  }
  const audioCtx = new Ctor();
  try {
    const arrayBuf = await blob.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
    const channel = decoded.getChannelData(0);
    let sumSquares = 0;
    let peak = 0;
    let zeroCrossings = 0;
    let prevSign = 0;
    for (let i = 0; i < channel.length; i++) {
      const s = channel[i] ?? 0;
      const abs = Math.abs(s);
      if (abs > peak) peak = abs;
      sumSquares += s * s;
      const sign = s >= 0 ? 1 : -1;
      if (i > 0 && sign !== prevSign) zeroCrossings++;
      prevSign = sign;
    }
    const rms = channel.length ? Math.sqrt(sumSquares / channel.length) : 0;
    // Normalise ZCR to [0..1]: divide by total samples and scale so a
    // typical "fussy" cry lands around 0.4–0.6.
    const zcrNorm = channel.length ? Math.min(1, zeroCrossings / channel.length * 8) : 0;
    return {
      avgAmplitude: clamp01(rms),
      peakAmplitude: clamp01(peak),
      zeroCrossingRate: clamp01(zcrNorm),
      durationMs: Math.round(decoded.duration * 1000)
    };
  } catch {
    return {
      durationMs: 0
    };
  } finally {
    try {
      await audioCtx.close();
    } catch {/* ignore */}
  }
}
function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
function relTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
export function CryInsight({
  childId,
  childName,
  ageMonths
}: CryInsightProps) {
  const {
    t
  } = useTranslation();
  const {
    toast
  } = useToast();

  // Context form state
  const [feedHrs, setFeedHrs] = useState<number>(2);
  const [sleepHrs, setSleepHrs] = useState<number>(1);
  const [diaperRecent, setDiaperRecent] = useState<boolean | null>(null);
  const [fever, setFever] = useState<boolean>(false);

  // Recording state
  const [recording, setRecording] = useState<boolean>(false);
  const [analysing, setAnalysing] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  // Result state
  const [result, setResult] = useState<CrySession | null>(null);
  const [history, setHistory] = useState<CrySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // ─── History fetch ──────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const r = await fetch(getApiUrl(`/api/cry-insight/history/${childId}?limit=10`), {
        credentials: "include"
      });
      if (!r.ok) return;
      const j = (await r.json()) as {
        ok: boolean;
        sessions: CrySession[];
      };
      if (j.ok) setHistory(j.sessions);
    } finally {
      setHistoryLoading(false);
    }
  }, [childId]);
  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  // ─── Cleanup any active recording on unmount ───────────────────────────────
  useEffect(() => {
    return () => {
      stopStreamAndTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function stopStreamAndTimer() {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
  }

  // ─── Submit context + (optional) audio stats ────────────────────────────────
  const submit = useCallback(async (audioStats: AudioStats, durationMs: number) => {
    const {
      default: i18nInstance
    } = await import("@/i18n");
    const body = {
      childId,
      durationMs,
      audioStats,
      context: {
        minutesSinceFeed: Math.round(feedHrs * 60),
        minutesSinceSleep: Math.round(sleepHrs * 60),
        diaperChangedRecently: diaperRecent ?? undefined,
        fever,
        ageMonths
      },
      language: i18nInstance.language || "en"
    };
    const r = await fetch(getApiUrl("/api/cry-insight/analyze"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      toast({
        title: t("toasts.cry_insight.analyse_failed_title"),
        description: t("toasts.cry_insight.analyse_failed_body", {
          status: r.status
        }),
        variant: "destructive"
      });
      return;
    }
    const j = (await r.json()) as {
      ok: true;
      session: CrySession;
    };
    setResult(j.session);
    void fetchHistory();
  }, [ageMonths, childId, diaperRecent, feedHrs, fever, fetchHistory, sleepHrs, toast]);

  // ─── Start recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (recording || analysing) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast({
        title: t("toasts.cry_insight.mic_unavailable_title"),
        description: t("toasts.cry_insight.mic_unavailable_body"),
        variant: "destructive"
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        setRecording(false);
        setAnalysing(true);
        const elapsed = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm"
        });
        stopStreamAndTimer();
        try {
          const stats = elapsed >= RECORD_MIN_MS ? await analyseRecording(blob) : {
            durationMs: 0
          };
          await submit(stats, stats.durationMs ?? elapsed);
        } finally {
          setAnalysing(false);
          setElapsedMs(0);
        }
      };
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      rec.start();
      setRecording(true);
      tickRef.current = window.setInterval(() => {
        const e = Date.now() - startedAtRef.current;
        setElapsedMs(e);
        if (e >= RECORD_LIMIT_MS) {
          try {
            rec.stop();
          } catch {/* already stopped */}
        }
      }, 100);
    } catch (err) {
      toast({
        title: t("toasts.cry_insight.mic_denied_title"),
        description: t("toasts.cry_insight.mic_denied_body"),
        variant: "destructive"
      });
      stopStreamAndTimer();
    }
  }, [analysing, recording, submit, toast]);
  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {/* ignore */}
    }
  }, []);
  const analyseWithoutAudio = useCallback(async () => {
    if (recording || analysing) return;
    setAnalysing(true);
    try {
      await submit({}, 0);
    } finally {
      setAnalysing(false);
    }
  }, [analysing, recording, submit]);
  const reset = useCallback(() => {
    setResult(null);
  }, []);
  const elapsedSec = (elapsedMs / 1000).toFixed(1);
  const recordPctFull = Math.min(100, elapsedMs / RECORD_LIMIT_MS * 100);
  return <div className="space-y-3" data-testid="cry-insight-root">
      {/* Beta banner */}
      <div className="flex items-start gap-2 rounded-2xl bg-gradient-to-r from-muted to-muted dark:from-card dark:to-card border border-border dark:border-border p-3">
        <ShieldAlert className="h-4 w-4 text-primary dark:text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] leading-snug text-primary dark:text-muted-foreground">
          <span className="font-bold">{t("components.cry_insight.beta_estimate_only")}</span>{" "}
          {t("components.cry_insight.cry_insight_uses_simple_audio_context_cues_to_suggest_a_like")}
        </p>
      </div>

      {/* Context form */}
      <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3.5 backdrop-blur-md space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-muted-foreground">
          {t("components.cry_insight.quick_context_for")} {childName}
        </p>

        {/* Feed slider */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <label className="font-bold text-foreground">{t("components.cry_insight.last_feed")}</label>
            <span className="text-muted-foreground" data-testid="feed-readout">
              {feedHrs < 1 ? `${Math.round(feedHrs * 60)} min` : `${feedHrs.toFixed(1)} hr`} {t("components.cry_insight.ago")}
            </span>
          </div>
          <input type="range" min={0.25} max={6} step={0.25} value={feedHrs} onChange={e => setFeedHrs(parseFloat(e.target.value))} className="w-full accent-primary" data-testid="feed-slider" />
        </div>

        {/* Sleep slider */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <label className="font-bold text-foreground">{t("components.cry_insight.last_sleep_ended")}</label>
            <span className="text-muted-foreground" data-testid="sleep-readout">
              {sleepHrs < 1 ? `${Math.round(sleepHrs * 60)} min` : `${sleepHrs.toFixed(1)} hr`} {t("components.cry_insight.ago_2")}
            </span>
          </div>
          <input type="range" min={0} max={6} step={0.25} value={sleepHrs} onChange={e => setSleepHrs(parseFloat(e.target.value))} className="w-full accent-primary" data-testid="sleep-slider" />
        </div>

        {/* Diaper toggle (3-state) */}
        <div>
          <p className="text-xs font-bold text-foreground mb-1.5">{t("components.cry_insight.diaper_checked_recently")}</p>
          <div className="flex gap-1.5">
            {[{
            v: true,
            label: "Yes — clean",
            cls: "bg-muted dark:bg-card text-primary dark:text-muted-foreground"
          }, {
            v: false,
            label: "No / dirty",
            cls: "bg-muted dark:bg-card text-primary dark:text-muted-foreground"
          }, {
            v: null,
            label: "Not sure",
            cls: "bg-muted text-muted-foreground"
          }].map(opt => {
            const active = diaperRecent === opt.v;
            return <button key={String(opt.v)} type="button" onClick={() => setDiaperRecent(opt.v as boolean | null)} className={["flex-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all", active ? `${opt.cls} ring-2 ring-primary` : "bg-muted/40 text-muted-foreground"].join(" ")} data-testid={`diaper-${String(opt.v)}`}>
                  {opt.label}
                </button>;
          })}
          </div>
        </div>

        {/* Fever toggle */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-foreground">{t("components.cry_insight.feels_warm_has_temperature")}</p>
          <button type="button" onClick={() => setFever(v => !v)} className={["rounded-full px-3 py-1 text-[11px] font-bold transition-all", fever ? "bg-primary text-white shadow" : "bg-muted text-muted-foreground"].join(" ")} aria-pressed={fever} data-testid="fever-toggle">
            {fever ? "Yes" : "No"}
          </button>
        </div>
      </div>

      {/* Recorder */}
      <div className="rounded-2xl bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card border border-border dark:border-border p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button type="button" onClick={recording ? stopRecording : startRecording} disabled={analysing} className={["h-14 w-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all", recording ? "bg-primary hover:bg-primary animate-pulse" : "bg-gradient-to-br from-primary to-primary hover:from-primary hover:to-primary", analysing ? "opacity-50 cursor-not-allowed" : ""].join(" ")} data-testid={recording ? "stop-recording" : "start-recording"} aria-label={recording ? "Stop recording" : "Start recording"}>
            {analysing ? <Loader2 className="h-6 w-6 animate-spin" /> : recording ? <Square className="h-5 w-5" fill="currentColor" /> : <Mic className="h-6 w-6" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              {recording ? "Recording…" : analysing ? "Analysing…" : "Tap mic to record"}
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {recording ? `Captures up to 15 s · ${elapsedSec}s recorded` : "Hold the phone near baby for 5–15 s. Audio is analysed on-device and never uploaded."}
            </p>
            {recording && <div className="mt-1.5 h-1 w-full rounded-full bg-muted dark:bg-card overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary transition-all" style={{
              width: `${recordPctFull}%`
            }} />
              </div>}
          </div>
        </div>

        {/* Skip-audio fallback */}
        {!recording && <button type="button" onClick={analyseWithoutAudio} disabled={analysing} className="mt-3 w-full rounded-xl border border-border dark:border-border px-3 py-2 text-xs font-bold text-primary dark:text-muted-foreground hover:bg-muted dark:hover:bg-card transition-colors disabled:opacity-50" data-testid="analyse-no-audio">
            <Sparkles className="inline h-3.5 w-3.5 mr-1.5" />
            {t("components.cry_insight.analyse_using_context_only_no_audio")}
          </button>}
      </div>

      {/* Result */}
      {result && <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-border dark:border-border p-4 backdrop-blur-md space-y-3" data-testid="cry-result">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              {t("components.cry_insight.likely_cause")}
            </p>
            <button type="button" onClick={reset} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1" data-testid="cry-reset">
              <RefreshCw className="h-3 w-3" /> {t("components.cry_insight.reset")}
            </button>
          </div>

          {/* Top 2 bars */}
          <div className="space-y-2">
            {[result.primary, result.secondary].map((c, i) => {
          const meta = CAUSE_META[c.cause];
          return <div key={`${c.cause}-${i}`} data-testid={`cause-row-${i}`}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-foreground">
                      {meta.emoji} {meta.label}
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {c.confidence}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${meta.color}`} style={{
                width: `${Math.max(4, c.confidence)}%`
              }} />
                  </div>
                </div>;
        })}
          </div>

          {/* Suggestion */}
          <div className="rounded-xl bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card border border-border dark:border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-muted-foreground mb-1">
              {t("components.cry_insight.try_this")}
            </p>
            <p className="text-sm text-primary dark:text-muted-foreground leading-snug">
              {result.suggestion}
            </p>
          </div>

          {/* Medical-flag warning */}
          {result.medicalFlag && <div className="flex items-start gap-2 rounded-xl bg-muted dark:bg-card border border-border dark:border-border p-3">
              <AlertTriangle className="h-4 w-4 text-primary dark:text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] leading-snug text-primary dark:text-muted-foreground">
                <span className="font-bold">{t("components.cry_insight.worth_a_check")}</span>{" "}
                {t("components.cry_insight.the_cry_pattern_the_info_you_shared_looks_intense_if_baby_se")}
              </p>
            </div>}
        </div>}

      {/* History */}
      <div className="rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <History className="h-3 w-3" />
            {t("components.cry_insight.recent_sessions")}
          </p>
          {historyLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        {history.length === 0 ? <p className="text-xs text-muted-foreground italic">
            {t("components.cry_insight.no_sessions_yet_your_first_analysis_will_appear_here")}
          </p> : <ul className="space-y-1.5" data-testid="cry-history">
            {history.map(h => {
          const meta = CAUSE_META[h.primary.cause];
          return <li key={h.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-2.5 py-2 text-xs">
                  <span className="text-base leading-none">{meta.emoji}</span>
                  <span className="font-bold text-foreground">{meta.label}</span>
                  <span className="text-muted-foreground">{h.primary.confidence}%</span>
                  <span className="ml-auto text-muted-foreground">
                    {relTime(h.createdAt)}
                  </span>
                </li>;
        })}
          </ul>}
      </div>

      {/* Tiny age hint */}
      <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
        <Baby className="h-3 w-3" /> {t("components.cry_insight.tuned_for_infants_0_24_months")}
      </p>
    </div>;
}