/**
 * Infant Sleep Prediction (Beta) — web UI.
 *
 * Surfaces the engine output from POST /api/sleep-predict/predict/:childId
 * and lets the parent log naps (one-tap "I just put baby down" / "Baby is
 * awake") that feed into the engine for tomorrow's predictions.
 *
 * Wind-down mode kicks in at >=80% sleep pressure: the card dims and we
 * surface calm-down tips.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun, BedDouble, Sparkles, AlarmClock, ShieldAlert, Loader2, RefreshCw, History, Lightbulb, CloudMoon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
interface SleepPredictProps {
  childId: number;
  childName: string;
  ageMonths: number;
}
type PressureBand = "restful" | "ideal" | "tired" | "overtired";
interface NapSession {
  id: number;
  childId: number;
  kind: "nap" | "night";
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  createdAt: string;
}
interface PredictionDTO {
  predictedAt: string;
  windowStart: string;
  windowEnd: string;
  idealWakeWindowMin: number;
  baseWakeWindowMin: number;
  sleepPressure: number;
  pressureBand: PressureBand;
  shouldWindDown: boolean;
  reasons: string[];
  suggestedNapsPerDay: {
    min: number;
    max: number;
  };
  flexible: boolean;
}
interface PredictResponse {
  ok: true;
  ageMonths: number;
  prediction: PredictionDTO;
  lastSession: NapSession | null;
  disclaimer: string;
}
const BAND_META: Record<PressureBand, {
  label: string;
  color: string;
  ring: string;
  bg: string;
}> = {
  restful: {
    label: "Restful",
    color: "text-primary dark:text-muted-foreground",
    ring: "ring-primary",
    bg: "from-muted to-muted dark:from-primary dark:to-primary"
  },
  ideal: {
    label: "Ideal",
    color: "text-primary dark:text-muted-foreground",
    ring: "ring-primary",
    bg: "from-muted to-muted dark:from-primary dark:to-primary"
  },
  tired: {
    label: "Getting tired",
    color: "text-primary dark:text-muted-foreground",
    ring: "ring-primary",
    bg: "from-muted to-muted dark:from-primary dark:to-primary"
  },
  overtired: {
    label: "Overtired",
    color: "text-primary dark:text-muted-foreground",
    ring: "ring-primary",
    bg: "from-muted to-muted dark:from-primary dark:to-primary"
  }
};
const WINDDOWN_TIPS = ["Dim the room — soft warm light only", "Reduce stimulation — quiet voices, slow movement", "Try a calming story or lullaby", "Offer a comfort object or gentle rock"];
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0m";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
function formatRelative(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  const abs = Math.abs(ms);
  const min = Math.round(abs / 60_000);
  if (min < 1) return "now";
  if (min < 60) return ms > 0 ? `in ${min}m` : `${min}m ago`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  const label = rem === 0 ? `${h}h` : `${h}h ${rem}m`;
  return ms > 0 ? `in ${label}` : `${label} ago`;
}
export function SleepPredict({
  childId,
  childName,
  ageMonths
}: SleepPredictProps) {
  const {
    t
  } = useTranslation();
  const {
    toast
  } = useToast();
  const [data, setData] = useState<PredictResponse | null>(null);
  const [history, setHistory] = useState<NapSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  // Track an in-progress sleep client-side so the button toggles between
  // "Sleep started" (creates server row) and "Baby's awake" (PATCH-style:
  // we re-POST a completed session). Keep it simple — server is source of
  // truth; this is just UI state.
  const [activeStartIso, setActiveStartIso] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-render once a minute so the pressure ring/relative times stay fresh.
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);
  const refresh = useCallback(async () => {
    const {
      t
    } = useTranslation();
    setLoading(true);
    try {
      const tzOffsetMin = new Date().getTimezoneOffset();
      const [pRes, hRes] = await Promise.all([fetch(getApiUrl(`/api/sleep-predict/predict/${childId}?tzOffsetMin=${tzOffsetMin}`), {
        credentials: "include"
      }), fetch(getApiUrl(`/api/sleep-predict/history/${childId}?limit=10`), {
        credentials: "include"
      })]);
      if (pRes.ok) {
        const json = (await pRes.json()) as PredictResponse;
        setData(json);
      }
      if (hRes.ok) {
        const json = (await hRes.json()) as {
          sessions: NapSession[];
        };
        setHistory(json.sessions ?? []);
        // If the most recent session is still in-progress, restore the
        // start state on the toggle button.
        const latestOpen = json.sessions?.find(s => s.endedAt === null);
        setActiveStartIso(latestOpen ? latestOpen.startedAt : null);
      }
    } catch (e) {
      toast({
        title: t("toasts.sleep_predict.load_failed_title"),
        description: e instanceof Error ? e.message : t("toasts.sleep_predict.network_error"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [childId, toast]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const logSleep = useCallback(async (kind: "nap" | "night") => {
    const {
      t
    } = useTranslation();
    if (logging) return;
    setLogging(true);
    try {
      const startedAt = new Date().toISOString();
      const r = await fetch(getApiUrl("/api/sleep-predict/log"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          childId,
          kind,
          startedAt
        })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setActiveStartIso(startedAt);
      toast({
        title: kind === "night" ? t("toasts.sleep_predict.bedtime_logged") : t("toasts.sleep_predict.nap_started")
      });
      await refresh();
    } catch (e) {
      toast({
        title: t("toasts.sleep_predict.log_sleep_failed_title"),
        description: e instanceof Error ? e.message : t("toasts.sleep_predict.network_error"),
        variant: "destructive"
      });
    } finally {
      setLogging(false);
    }
  }, [childId, logging, refresh, toast]);
  const logWake = useCallback(async () => {
    const {
      t
    } = useTranslation();
    if (logging || !activeStartIso) return;
    setLogging(true);
    try {
      const r = await fetch(getApiUrl("/api/sleep-predict/log"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          childId,
          kind: "nap",
          startedAt: activeStartIso,
          endedAt: new Date().toISOString()
        })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setActiveStartIso(null);
      toast({
        title: t("toasts.sleep_predict.wake_logged_title"),
        description: t("toasts.sleep_predict.wake_logged_body")
      });
      await refresh();
    } catch (e) {
      toast({
        title: t("toasts.sleep_predict.log_wake_failed_title"),
        description: e instanceof Error ? e.message : t("toasts.sleep_predict.network_error"),
        variant: "destructive"
      });
    } finally {
      setLogging(false);
    }
  }, [activeStartIso, childId, logging, refresh, toast]);
  const prediction = data?.prediction;
  const band = prediction ? BAND_META[prediction.pressureBand] : null;
  const dimmed = prediction?.shouldWindDown ?? false;
  const ringDeg = useMemo(() => {
    if (!prediction) return 0;
    return Math.min(360, prediction.sleepPressure / 100 * 360);
  }, [prediction]);

  // Age guard — engine is tuned for 0–24 mo. We still render but warn.
  const outOfBand = ageMonths < 0 || ageMonths > 24;
  return <div className={["space-y-3 transition-opacity", dimmed ? "opacity-95" : "opacity-100"].join(" ")} data-testid="sleep-predict-root">
      {/* Disclaimer banner */}
      <div className="flex items-start gap-2 rounded-2xl bg-gradient-to-r from-muted to-muted dark:from-primary dark:to-primary border border-border dark:border-border p-3">
        <ShieldAlert className="h-4 w-4 text-primary dark:text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] leading-snug text-primary dark:text-muted-foreground">
          <span className="font-bold">{t("components.sleep_predict.beta_guidance_only")}</span>{" "}
          {data?.disclaimer ?? "This is a guidance system based on sleep patterns, not medical advice."}
        </p>
      </div>

      {outOfBand && <div className="rounded-2xl bg-muted dark:bg-primary border border-border p-3 text-[11px] text-primary dark:text-muted-foreground">
          {t("components.sleep_predict.sleep_prediction_is_tuned_for_ages_0_24_months_showing_a_fle")} {childName}.
        </div>}

      {loading && !data ? <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {t("components.sleep_predict.loading_prediction")}
        </div> : prediction && band ? <>
          {/* Pressure ring + next-window card */}
          <div className={["rounded-2xl bg-gradient-to-br border border-white/60 dark:border-white/10 p-4 backdrop-blur-md", band.bg].join(" ")} data-testid="sleep-pressure-card">
            <div className="flex items-center gap-4">
              {/* Pressure ring */}
              <div className="relative h-20 w-20 shrink-0" aria-label={`Sleep pressure ${prediction.sleepPressure}%`} data-testid="pressure-ring">
                <div className="h-20 w-20 rounded-full" style={{
              background: `conic-gradient(currentColor ${ringDeg}deg, rgba(0,0,0,0.08) 0deg)`
            }} />
                <div className="absolute inset-2 rounded-full bg-white/85 dark:bg-card flex flex-col items-center justify-center">
                  <span className={`text-lg font-bold ${band.color}`}>
                    {prediction.sleepPressure}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {t("components.sleep_predict.pressure")}
                  </span>
                </div>
              </div>

              {/* Next nap window */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-muted-foreground mb-0.5 flex items-center gap-1">
                  <AlarmClock className="h-3 w-3" />
                  {t("components.sleep_predict.next_sleep_window")}
                </p>
                <p className={`text-base font-bold ${band.color}`} data-testid="next-window">
                  {formatTime(prediction.windowStart)} – {formatTime(prediction.windowEnd)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatRelative(prediction.predictedAt, now)} ·{" "}
                  <span className={band.color}>{band.label}</span>
                </p>
              </div>
            </div>

            {/* Reason chain */}
            {prediction.reasons.length > 0 && <ul className="mt-3 space-y-1 text-[11px] text-foreground/80" data-testid="reason-chain">
                {prediction.reasons.map((r, i) => <li key={i} className="flex items-start gap-1.5">
                    <Sparkles className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <span>{r}</span>
                  </li>)}
              </ul>}
          </div>

          {/* Wind-down panel — only shown at >=80% pressure */}
          {prediction.shouldWindDown && <div className="rounded-2xl bg-gradient-to-br from-muted to-muted dark:from-muted dark:to-primary border border-border p-4" data-testid="winddown-panel">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-muted-foreground flex items-center gap-1">
                <CloudMoon className="h-3 w-3" />
                {t("components.sleep_predict.start_wind_down_now")}
              </p>
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[12px] text-foreground/85">
                {WINDDOWN_TIPS.map(t => <li key={t} className="flex items-start gap-1.5">
                    <Lightbulb className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <span>{t}</span>
                  </li>)}
              </ul>
            </div>}

          {/* Suggested nap count */}
          <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3 text-[11px] text-foreground/80">
            <span className="font-bold">{childName}</span> {t("components.sleep_predict.is_in_the")}{" "}
            <span className="font-bold">
              {prediction.idealWakeWindowMin}{t("components.sleep_predict.min_wake_window")}
            </span>{" "}
            {t("components.sleep_predict.band_aim_for")}{" "}
            <span className="font-bold">
              {prediction.suggestedNapsPerDay.min}
              {prediction.suggestedNapsPerDay.max !== prediction.suggestedNapsPerDay.min ? `–${prediction.suggestedNapsPerDay.max}` : ""}
            </span>{" "}
            {t("components.sleep_predict.nap")}{prediction.suggestedNapsPerDay.max === 1 ? "" : "s"} {t("components.sleep_predict.today")}
          </div>
        </> : <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-4 text-xs text-muted-foreground">
          {t("components.sleep_predict.no_prediction_available_try_logging_a_sleep_below_to_get_sta")}
        </div>}

      {/* Log buttons */}
      <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-muted-foreground">
          {t("components.sleep_predict.log_sleep")}
        </p>
        {activeStartIso ? <button type="button" onClick={logWake} disabled={logging} className="w-full rounded-full px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-primary to-primary text-white shadow disabled:opacity-60 flex items-center justify-center gap-2" data-testid="log-wake-btn">
            {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sun className="h-4 w-4" />}
            {t("components.sleep_predict.baby_s_awake_started")} {formatTime(activeStartIso)})
          </button> : <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => logSleep("nap")} disabled={logging} className="rounded-full px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-primary to-primary text-white shadow disabled:opacity-60 flex items-center justify-center gap-2" data-testid="log-nap-btn">
              {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : <BedDouble className="h-4 w-4" />}
              {t("components.sleep_predict.nap_started")}
            </button>
            <button type="button" onClick={() => logSleep("night")} disabled={logging} className="rounded-full px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-primary to-primary text-white shadow disabled:opacity-60 flex items-center justify-center gap-2" data-testid="log-night-btn">
              {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Moon className="h-4 w-4" />}
              {t("components.sleep_predict.bedtime")}
            </button>
          </div>}
        <button type="button" onClick={() => void refresh()} disabled={loading} className="w-full text-[11px] font-bold text-primary dark:text-muted-foreground inline-flex items-center justify-center gap-1 disabled:opacity-50" data-testid="refresh-btn">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {t("components.sleep_predict.refresh")}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && <div className="rounded-2xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-muted-foreground flex items-center gap-1 mb-2">
            <History className="h-3 w-3" />
            {t("components.sleep_predict.recent_sleep")}{history.length})
          </p>
          <ul className="space-y-1.5" data-testid="sleep-history">
            {history.map(s => <li key={s.id} className="flex items-center justify-between text-[11px] text-foreground/85 rounded-lg bg-white/60 dark:bg-white/5 px-2.5 py-1.5">
                <span className="flex items-center gap-1.5">
                  {s.kind === "night" ? <Moon className="h-3 w-3 text-primary dark:text-muted-foreground" /> : <BedDouble className="h-3 w-3 text-primary dark:text-muted-foreground" />}
                  <span className="font-bold capitalize">{s.kind}</span>
                  <span className="text-muted-foreground">
                    {formatTime(s.startedAt)}
                    {s.endedAt ? ` → ${formatTime(s.endedAt)}` : " · in progress"}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {s.endedAt ? formatDuration(s.durationMs) : ""}
                </span>
              </li>)}
          </ul>
        </div>}
    </div>;
}