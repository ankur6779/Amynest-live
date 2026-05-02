import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  AMY_ENCOURAGEMENT, AMY_NUDGE_BODY, AMY_NUDGE_TITLE,
  DEFAULT_MORNING_STEPS, NIGHT_PREP_ITEMS,
  applyAutoAdjust, computeDelay, emptyDayState, nightPrepSummary,
  simplifyRemaining, summarize, totalPlannedMinutes,
  type MorningFlowDayState, type MorningStep,
} from "@workspace/morning-flow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Sunrise, Moon, Play, RotateCcw, CheckCircle2,
  XCircle, Sparkles, Clock, Heart, Zap,
} from "lucide-react";
import { loadMorningFlow, saveMorningFlow } from "@/lib/morning-flow-storage";

const STEPS = DEFAULT_MORNING_STEPS;

export default function SchoolMorningFlowPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [state, setState] = useState<MorningFlowDayState>(() => emptyDayState());
  const [tick, setTick] = useState(0);

  // Hydrate on mount.
  useEffect(() => { setState(loadMorningFlow()); }, []);

  // Persist + auto-adjust whenever state mutates.
  const persist = (mut: (prev: MorningFlowDayState) => MorningFlowDayState) => {
    setState((prev) => {
      const next = applyAutoAdjust(mut(prev), STEPS);
      saveMorningFlow(next);
      return next;
    });
  };

  // 1-minute heartbeat so the delay banner refreshes in real-time.
  useEffect(() => {
    if (!state.startedAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, [state.startedAt]);

  const delay = useMemo(() => computeDelay(state, STEPS), [state, tick]);
  const summary = summarize(state, STEPS);
  const night = nightPrepSummary(state);
  const planned = totalPlannedMinutes(STEPS);

  // ── Actions ────────────────────────────────────────────────────────────────
  const startMorning = () => persist((s) => ({ ...s, startedAt: Date.now() }));
  const resetDay = () => persist(() => ({ ...emptyDayState(), nightPrep: state.nightPrep }));
  const toggleNight = (id: string) =>
    persist((s) => ({ ...s, nightPrep: { ...s.nightPrep, [id]: !s.nightPrep[id] } }));
  const setStep = (id: string, status: "done" | "skipped" | "pending") =>
    persist((s) => ({
      ...s,
      steps: { ...s.steps, [id]: { status, doneAt: Date.now() } },
      // First action also starts the timer, in case the user skipped "Start".
      startedAt: s.startedAt ?? Date.now(),
    }));
  const acceptSimplify = () => persist((s) => simplifyRemaining(s, STEPS));

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => navigate("/parenting-hub")} aria-label={t("screens.school_morning_flow.back")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-quicksand text-2xl font-bold text-foreground flex items-center gap-2">
              <Sunrise className="h-6 w-6 text-orange-500" />
              {t("screens.school_morning_flow.header_title")}
            </h1>
            <p className="text-sm text-muted-foreground truncate inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-pink-500" /> {AMY_ENCOURAGEMENT}
            </p>
          </div>
        </div>
        {state.startedAt && (
          <Button variant="outline" size="sm" className="rounded-full shrink-0" onClick={resetDay}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t("screens.school_morning_flow.reset")}
          </Button>
        )}
      </header>

      {/* Amy delay nudge */}
      {delay.showAmyNudge && (
        <Card className="rounded-2xl border-amber-300/70 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-quicksand font-bold text-foreground text-sm">{AMY_NUDGE_TITLE}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {AMY_NUDGE_BODY} <span className="font-semibold text-amber-700 dark:text-amber-300">{t("screens.school_morning_flow.minutes_behind", { count: delay.delayMinutes })}</span>
                </div>
                <Button size="sm" className="mt-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white" onClick={acceptSimplify}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> {t("screens.school_morning_flow.simplify_rest")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Morning Flow */}
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-quicksand text-lg font-bold text-foreground inline-flex items-center gap-2">
                <Sunrise className="h-5 w-5 text-orange-500" /> {t("screens.school_morning_flow.morning_flow_title")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("screens.school_morning_flow.steps_summary", { count: STEPS.length, minutes: planned })}
              </p>
            </div>
            {!state.startedAt && (
              <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" onClick={startMorning}>
                <Play className="h-4 w-4 mr-1" /> {t("screens.school_morning_flow.start_morning")}
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{t("screens.school_morning_flow.progress_done_skipped", { done: summary.doneCount, total: summary.totalCount, skipped: summary.skippedCount })}</span>
              {state.startedAt && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {t("screens.school_morning_flow.minutes_count", { actual: delay.actualMinutes, planned })}
                </span>
              )}
            </div>
            <Progress value={summary.percent} className="h-2" />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {STEPS.map((step, idx) => {
              const status = state.steps[step.id]?.status ?? "pending";
              return (
                <StepRow
                  key={step.id}
                  index={idx + 1}
                  step={step}
                  status={status}
                  onDone={() => setStep(step.id, "done")}
                  onSkip={() => setStep(step.id, "skipped")}
                  onUndo={() => setStep(step.id, "pending")}
                />
              );
            })}
          </div>

          {summary.doneCount + summary.skippedCount === STEPS.length && (
            <div className="mt-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200/70 dark:border-green-500/30 p-3 text-sm text-foreground">
              <span className="font-quicksand font-bold">{t("screens.school_morning_flow.all_done")}</span> {summary.skippedCount > 0 ? t("screens.school_morning_flow.skipped_message", { count: summary.skippedCount }) : t("screens.school_morning_flow.smooth_morning")} {t("screens.school_morning_flow.have_great_day")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Night Prep */}
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-quicksand text-lg font-bold text-foreground inline-flex items-center gap-2">
                <Moon className="h-5 w-5 text-indigo-500" /> {t("screens.school_morning_flow.prepare_tomorrow_title")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("screens.school_morning_flow.prepare_subtitle", { done: night.done, total: night.total })}
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {NIGHT_PREP_ITEMS.map((item) => {
              const checked = !!state.nightPrep[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => toggleNight(item.id)}
                  className={[
                    "flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all",
                    checked
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                      : "border-border bg-white dark:bg-zinc-900 hover:border-indigo-300",
                  ].join(" ")}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="flex-1 font-medium text-sm text-foreground">{item.label}</span>
                  {checked
                    ? <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                    : <span className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Link out to full routines feature */}
      <div className="text-center text-xs text-muted-foreground">
        {t("screens.school_morning_flow.need_detailed")}{" "}
        <Link href="/routines" className="text-orange-600 hover:underline font-medium">{t("screens.school_morning_flow.open_routines")}</Link>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function StepRow({
  index, step, status, onDone, onSkip, onUndo,
}: {
  index: number;
  step: MorningStep;
  status: "pending" | "done" | "skipped";
  onDone: () => void;
  onSkip: () => void;
  onUndo: () => void;
}) {
  const { t } = useTranslation();
  const done = status === "done";
  const skipped = status === "skipped";
  return (
    <div className={[
      "flex items-center gap-3 rounded-xl border-2 p-3 transition-colors",
      done ? "border-green-400 bg-green-50/60 dark:bg-green-500/10" :
      skipped ? "border-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 opacity-70" :
      "border-border bg-white dark:bg-zinc-900",
    ].join(" ")}>
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs font-bold shrink-0">
        {index}
      </div>
      <div className="text-2xl">{step.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className={[
          "font-quicksand font-bold text-foreground",
          skipped && "line-through text-muted-foreground",
        ].filter(Boolean).join(" ")}>{step.title}</div>
        <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {t("screens.school_morning_flow.approx_minutes", { count: step.defaultMinutes })}
          {!step.essential && <span className="ml-1 px-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-[10px]">{t("screens.school_morning_flow.optional")}</span>}
        </div>
      </div>
      {status === "pending" ? (
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="rounded-full h-8 px-3" onClick={onSkip}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> {t("screens.school_morning_flow.skip")}
          </Button>
          <Button size="sm" className="rounded-full h-8 px-3 bg-green-600 hover:bg-green-700 text-white" onClick={onDone}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t("screens.school_morning_flow.done")}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="rounded-full h-8 px-3 shrink-0" onClick={onUndo}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t("screens.school_morning_flow.undo")}
        </Button>
      )}
    </div>
  );
}
