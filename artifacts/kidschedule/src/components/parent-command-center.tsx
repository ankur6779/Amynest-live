import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useListRoutines, useGetDashboardSummary, useUpdateRoutineItems, useCreateBehaviorLog, useGetSmartStudyInsights, getListRoutinesQueryKey, type RoutineItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { computeCommandCenter, pickPlayIdeas, type AdaptiveItem, type AdaptiveMood, type AdaptiveSleepQuality, type CommandActionId, type CommandSuggestion, type PlayIdea } from "@workspace/family-routine";
import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, X, Check, ArrowRight, Heart, Moon, Wind, Wand2, PartyPopper, BookOpen, Music, Puzzle, Gamepad2, Dices } from "lucide-react";

// CSS-in-JS shape that allows custom properties (CSS variables) without the
// "any" hatch — React's CSSProperties type doesn't include `--*` keys.
type CSSPropertiesWithVars = CSSProperties & Record<`--${string}`, string | number>;
type Child = {
  id: number;
  name: string;
  age?: number;
};
const MOOD_LABEL: Record<AdaptiveMood, string> = {
  low: "😔 Low",
  neutral: "🙂 Neutral",
  active: "🤸 Active"
};
const SLEEP_LABEL: Record<AdaptiveSleepQuality, string> = {
  poor: "😴 Poor",
  ok: "🌙 OK",
  good: "✨ Good"
};

// Cycles to advance the small "tap to cycle" mood/sleep selectors in the
// fullscreen dashboard — order matches the engine's enum so the next click
// is always predictable.
const MOOD_CYCLE: AdaptiveMood[] = ["low", "neutral", "active"];
const SLEEP_CYCLE: AdaptiveSleepQuality[] = ["poor", "ok", "good"];

/**
 * Compact tile (the only thing that lives in the Hub). Shows a small
 * progress ring, a status pill, and an "Open" affordance that launches
 * the fullscreen Interactive Command Center modal. All real interaction
 * happens inside the modal; the tile is read-only.
 */
export function ParentCommandCenter({
  child
}: {
  child: Child;
}) {
  const {
    t
  } = useTranslation();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);

  // Mood / sleep — read from the same per-child/day localStorage that the
  // adaptive engine on routines/[id] writes to so the dashboard, the tile
  // and the daily routine view stay in sync.
  const moodKey = `amynest:adaptive:mood:${child.id}:${todayStr}`;
  const sleepKey = `amynest:adaptive:sleep:${child.id}:${todayStr}`;
  const [mood, setMood] = useState<AdaptiveMood>("neutral");
  const [sleep, setSleep] = useState<AdaptiveSleepQuality>("good");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.localStorage.getItem(moodKey) as AdaptiveMood | null;
    const s = window.localStorage.getItem(sleepKey) as AdaptiveSleepQuality | null;
    if (m === "low" || m === "neutral" || m === "active") setMood(m);
    if (s === "poor" || s === "ok" || s === "good") setSleep(s);
  }, [moodKey, sleepKey]);
  const persistMood = (m: AdaptiveMood) => {
    setMood(m);
    if (typeof window !== "undefined") window.localStorage.setItem(moodKey, m);
  };
  const persistSleep = (s: AdaptiveSleepQuality) => {
    setSleep(s);
    if (typeof window !== "undefined") window.localStorage.setItem(sleepKey, s);
  };

  // ── Pull data ────────────────────────────────────────────────────
  const {
    data: allRoutines = []
  } = useListRoutines({
    childId: child.id
  });
  const {
    data: summary
  } = useGetDashboardSummary();
  const todayRoutine = useMemo(() => allRoutines.find(r => (r.date ?? "").slice(0, 10) === todayStr), [allRoutines, todayStr]);
  // RoutineItem and AdaptiveItem share the same `status`/`category` shape
  // (the engine was designed against this contract); cast through `unknown`
  // since the extra optional fields on RoutineItem (recipe, nutrition, …)
  // are simply ignored by the dashboard.
  const items: AdaptiveItem[] = (todayRoutine?.items ?? []) as unknown as AdaptiveItem[];

  // Re-tick once a minute so the engine's "current step" advances live
  // while the dashboard is open. Only effective when the modal is open
  // — the tile itself doesn't depend on the second hand.
  const [nowMins, setNowMins] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const d = new Date();
      setNowMins(d.getHours() * 60 + d.getMinutes());
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [open]);
  const result = useMemo(() => computeCommandCenter({
    childName: child.name,
    items,
    positiveBehaviorsToday: summary?.positiveBehaviorsToday ?? 0,
    negativeBehaviorsToday: summary?.negativeBehaviorsToday ?? 0,
    mood,
    sleepQuality: sleep,
    weeklyPositive: summary?.positiveBehaviorsToday ?? 0,
    weeklyNegative: summary?.negativeBehaviorsToday ?? 0,
    weeklyRoutinesGenerated: summary?.routinesGeneratedThisWeek ?? 0,
    nowMins
  }), [items, summary, mood, sleep, child.name, nowMins]);
  const {
    overview,
    suggestions
  } = result;
  return <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" data-section-id="command-center" data-testid="command-center-tile" className={["group w-full text-left rounded-2xl overflow-hidden", "bg-gradient-to-br from-primary via-primary to-primary", "border border-white/60 dark:border-border", "shadow-[0_0_0_1px_rgba(168,85,247,0.18),0_18px_50px_-18px_rgba(168,85,247,0.45)]", "hover:shadow-[0_0_0_1px_rgba(168,85,247,0.35),0_22px_60px_-18px_rgba(168,85,247,0.7)]", "hover:border-border transition-all duration-300", "p-3 sm:p-4 flex items-center gap-3"].join(" ")}>
          <ProgressRing pct={overview.routineCompletionPct} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="font-quicksand font-bold text-[14px] leading-tight text-foreground truncate">
                {child.name}{t("components.parent_command_center.s_command_center")}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              <span className="font-bold text-foreground/90">{overview.statusEmoji} {overview.statusLabel}</span>
              {suggestions.length > 0 && <> · {suggestions[0].emoji} {suggestions[0].label}</>}
            </p>
            <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate">
              {overview.routineCompletedTasks}/{overview.routineTotalTasks} {t("components.parent_command_center.done")} {MOOD_LABEL[overview.mood]} · {SLEEP_LABEL[overview.sleepQuality]}
            </p>
          </div>
          <span className={["shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5", "bg-gradient-to-r from-primary to-primary text-white", "text-[11px] font-bold shadow-[0_8px_24px_-8px_rgba(168,85,247,0.7)]", "group-hover:scale-[1.04] transition-transform"].join(" ")}>
            {t("components.parent_command_center.open")}
            <ArrowRight className="h-3 w-3" />
          </span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-card backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content data-testid="command-center-dialog" className={["fixed inset-0 z-[61] overflow-y-auto", "bg-gradient-to-br from-[#0a0820] via-[#1a1040] to-[#0a0820]", "text-white", "data-[state=open]:animate-in data-[state=closed]:animate-out", "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0", "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"].join(" ")}>
          <Dialog.Title className="sr-only">{child.name}{t("components.parent_command_center.s_command_center_2")}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {t("components.parent_command_center.interactive_dashboard_with_quick_actions_today_s_timeline_an")}
          </Dialog.Description>
          <CommandCenterDashboard child={child} todayRoutine={todayRoutine} items={items} mood={mood} sleep={sleep} persistMood={persistMood} persistSleep={persistSleep} result={result} onClose={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>;
}

// ─────────────────────────────────────────────────────────────────────────
// Fullscreen Interactive Command Center
// ─────────────────────────────────────────────────────────────────────────

type DashboardProps = {
  child: Child;
  todayRoutine: {
    id?: number;
  } | undefined;
  items: AdaptiveItem[];
  mood: AdaptiveMood;
  sleep: AdaptiveSleepQuality;
  persistMood: (m: AdaptiveMood) => void;
  persistSleep: (s: AdaptiveSleepQuality) => void;
  result: ReturnType<typeof computeCommandCenter>;
  onClose: () => void;
};
function CommandCenterDashboard(props: DashboardProps) {
  const {
    t
  } = useTranslation();
  const {
    child,
    todayRoutine,
    items,
    mood,
    sleep,
    persistMood,
    persistSleep,
    result,
    onClose
  } = props;
  const {
    overview,
    insights,
    actions,
    parentStatus,
    timeline,
    suggestions
  } = result;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const updateItems = useUpdateRoutineItems();
  const createBehavior = useCreateBehaviorLog();

  // ── Micro-interaction state ────────────────────────────────────────
  const [confettiKey, setConfettiKey] = useState(0); // confetti burst
  const [shakeKey, setShakeKey] = useState(0); // shake on empty/error
  const [flashAction, setFlashAction] = useState<CommandActionId | null>(null);
  const [activePanel, setActivePanel] = useState<null | "calm" | "sleep" | "play" | "phonics" | "lullaby" | "puzzle" | "play-picker">(null);
  const [toast, setToast] = useState<{
    msg: string;
    undo?: () => void;
  } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = (msg: string, undo?: () => void) => {
    setToast({
      msg,
      undo
    });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 4500 : 2400);
  };
  const burst = () => setConfettiKey(k => k + 1);
  const shake = () => setShakeKey(k => k + 1);
  const todayRoutineId = todayRoutine?.id;
  const empty = items.length === 0;

  // Adaptive items are structurally compatible with the API's RoutineItem
  // shape (RoutineItem only adds optional fields like recipe/nutrition).
  // Cast through `unknown` once at the boundary so the engine logic above
  // stays free of any-casts.
  const toApiItems = (next: AdaptiveItem[]): RoutineItem[] => next as unknown as RoutineItem[];

  // ── In-place actions (no navigation; mutate the routine + log behavior) ──
  // Returns a promise so action handlers can `await` for tests/UI feedback.
  async function simplifyToday() {
    if (!todayRoutineId || empty) {
      shake();
      showToast("No routine to simplify yet");
      return;
    }
    const lowPriorityCategories = new Set(["screen", "play", "creative"]);
    // Skip pending non-essential items past the current moment so the rest
    // of the day feels lighter without losing meals/sleep/learning anchors.
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const next: AdaptiveItem[] = items.map(it => {
      const t = parseClockMins(it.time);
      const eligible = it.status === "pending" && lowPriorityCategories.has(it.category ?? "") && (t < 0 || t >= nowMins);
      return eligible ? {
        ...it,
        status: "skipped"
      } : it;
    });
    const skippedCount = next.filter((it, i) => it.status !== items[i].status).length;
    if (skippedCount === 0) {
      showToast("Nothing to simplify — your day already looks light");
      return;
    }
    persistMood("low"); // tell the adaptive engine to keep things gentle
    await updateItems.mutateAsync({
      id: todayRoutineId,
      data: {
        items: toApiItems(next)
      }
    });
    queryClient.invalidateQueries({
      queryKey: getListRoutinesQueryKey({
        childId: child.id
      })
    });
    burst();
    showToast(`Simplified — ${skippedCount} optional task${skippedCount === 1 ? "" : "s"} skipped`);
  }
  async function fixRoutine() {
    if (!todayRoutineId || empty) {
      shake();
      showToast("No routine to fix yet");
      return;
    }
    // Re-anchor any "delayed" items to "pending" so the timeline picks them
    // up again — equivalent to a soft reset.
    const next: AdaptiveItem[] = items.map(it => it.status === "delayed" ? {
      ...it,
      status: "pending"
    } : it);
    const reset = next.filter((it, i) => it.status !== items[i].status).length;
    if (reset === 0) {
      showToast("Routine already on track");
      return;
    }
    await updateItems.mutateAsync({
      id: todayRoutineId,
      data: {
        items: toApiItems(next)
      }
    });
    queryClient.invalidateQueries({
      queryKey: getListRoutinesQueryKey({
        childId: child.id
      })
    });
    burst();
    showToast(`Reset — ${reset} step${reset === 1 ? "" : "s"} back on track`);
  }
  async function calmChild() {
    setActivePanel(p => p === "calm" ? null : "calm");
    // Log a "needed calming" neutral entry so the dashboard reflects the
    // moment in the behavior trend; the panel below provides the script.
    await createBehavior.mutateAsync({
      data: {
        childId: child.id,
        date: new Date().toISOString().slice(0, 10),
        behavior: "Used calming tools",
        type: "neutral"
      }
    }).catch(() => {});
    burst();
  }
  async function improveSleep() {
    setActivePanel(p => p === "sleep" ? null : "sleep");
    persistSleep(sleep === "good" ? "good" : "ok"); // bump sleep one notch toward better
    burst();
  }
  async function addActivity() {
    setActivePanel(p => p === "play" ? null : "play");
    burst();
  }
  async function logQuickWin() {
    await createBehavior.mutateAsync({
      data: {
        childId: child.id,
        date: new Date().toISOString().slice(0, 10),
        behavior: "Quality time win",
        type: "positive"
      }
    });
    burst();
    showToast("Logged a positive moment ✨");
  }
  function flash(id: CommandActionId) {
    setFlashAction(id);
    window.setTimeout(() => setFlashAction(null), 400);
  }
  async function onAction(id: CommandActionId) {
    flash(id);
    switch (id) {
      case "simplify-today":
        await simplifyToday();
        return;
      case "fix-routine":
        await fixRoutine();
        return;
      case "add-activity":
        await addActivity();
        return;
      case "calm-child":
        await calmChild();
        return;
      case "improve-sleep":
        await improveSleep();
        return;
    }
  }
  function onSuggestion(s: CommandSuggestion) {
    if (s.id === "start-play") {
      // Open the in-place 10-min play picker (3 age-appropriate ideas).
      // This is intentionally separate from the `addActivity` flow above
      // — that one starts a generic timer; this one closes the loop on
      // the engine's "Try a 10-min play" suggestion by giving the parent
      // 3 specific things to do in one tap.
      setActivePanel(p => p === "play-picker" ? null : "play-picker");
      return;
    }
    if (s.actionId) onAction(s.actionId);
  }

  // Pre-compute the 3 ideas once per (open) dashboard render so re-renders
  // (mood/sleep cycling, timeline ticks) don't reshuffle the list under
  // the parent's finger. The engine's `pickPlayIdeas` is deterministic per
  // age so the same age always yields the same trio.
  const playIdeas = useMemo<PlayIdea[]>(() => pickPlayIdeas(child.age ?? 4, 3), [child.age]);

  // Selecting an idea: log a positive moment so today's quality time tally
  // bumps and the engine stops re-suggesting the chip (see
  // `buildSuggestions` — start-play is suppressed when
  // `positiveBehaviorsToday >= 1`).
  async function pickPlayIdea(idea: PlayIdea) {
    setActivePanel(null);
    burst();
    await createBehavior.mutateAsync({
      data: {
        childId: child.id,
        date: new Date().toISOString().slice(0, 10),
        behavior: `10-min play: ${idea.title}`,
        type: "positive"
      }
    }).catch(() => {});
    queryClient.invalidateQueries({
      queryKey: ["dashboard-summary"]
    });
    showToast(`${idea.emoji} Started ${idea.title}`);
  }

  // Mark a timeline step "done" without leaving the dashboard.
  async function completeStep(itemIndex: number) {
    if (!todayRoutineId) return;
    const next = items.map((it, i) => i === itemIndex ? {
      ...it,
      status: "completed" as const
    } : it);
    await updateItems.mutateAsync({
      id: todayRoutineId,
      data: {
        items: toApiItems(next)
      }
    });
    queryClient.invalidateQueries({
      queryKey: getListRoutinesQueryKey({
        childId: child.id
      })
    });
    burst();
    showToast("Step completed ✓");
  }

  // Swipe-to-skip with undo. Optimistically marks the item as "skipped"
  // and offers a 4.5s window to revert via the toast.
  async function skipStep(itemIndex: number) {
    if (!todayRoutineId) return;
    const prevStatus = items[itemIndex]?.status;
    const next = items.map((it, i) => i === itemIndex ? {
      ...it,
      status: "skipped" as const
    } : it);
    await updateItems.mutateAsync({
      id: todayRoutineId,
      data: {
        items: toApiItems(next)
      }
    }).catch(() => {});
    queryClient.invalidateQueries({
      queryKey: getListRoutinesQueryKey({
        childId: child.id
      })
    });
    showToast("Skipped — tap Undo to bring it back", async () => {
      if (!todayRoutineId) return;
      const restored = items.map((it, i) => i === itemIndex ? {
        ...it,
        status: (prevStatus ?? "pending") as AdaptiveItem["status"]
      } : it);
      await updateItems.mutateAsync({
        id: todayRoutineId,
        data: {
          items: toApiItems(restored)
        }
      }).catch(() => {});
      queryClient.invalidateQueries({
        queryKey: getListRoutinesQueryKey({
          childId: child.id
        })
      });
      showToast("Restored");
    });
  }

  // ── Quick activity strip — separate from the strategic action grid.
  // Each opens a timed inline panel; on completion logs a positive moment.
  type QuickActivity = {
    id: "play" | "phonics" | "lullaby" | "puzzle";
    label: string;
    minutes: number;
    emoji: string;
    icon: React.ReactNode;
  };
  const quickActivities: QuickActivity[] = [{
    id: "play",
    label: t("parent_hub.command_center.quick.play.label"),
    minutes: 10,
    emoji: "🎮",
    icon: <Gamepad2 className="h-4 w-4" />
  }, {
    id: "phonics",
    label: t("parent_hub.command_center.quick.phonics.label"),
    minutes: 5,
    emoji: "📖",
    icon: <BookOpen className="h-4 w-4" />
  }, {
    id: "lullaby",
    label: t("parent_hub.command_center.quick.lullaby.label"),
    minutes: 5,
    emoji: "🎶",
    icon: <Music className="h-4 w-4" />
  }, {
    id: "puzzle",
    label: t("parent_hub.command_center.quick.puzzle.label"),
    minutes: 5,
    emoji: "🧩",
    icon: <Puzzle className="h-4 w-4" />
  }];
  function startQuickActivity(id: QuickActivity["id"]) {
    setActivePanel(p => p === id ? null : id);
  }
  async function logQuickActivity(activity: QuickActivity) {
    setActivePanel(null);
    burst();
    await createBehavior.mutateAsync({
      data: {
        childId: child.id,
        date: new Date().toISOString().slice(0, 10),
        behavior: `${activity.label} together`,
        type: "positive"
      }
    }).catch(() => {});
    queryClient.invalidateQueries({
      queryKey: ["dashboard-summary"]
    });
    showToast(`${activity.emoji} Logged ${activity.label}`);
  }
  return <div key={shakeKey} data-testid="command-center-dashboard" className={["min-h-full p-4 sm:p-8 max-w-5xl mx-auto space-y-6",
  // Apply shake to the outer container by re-keying it (re-enters
  // the animation). The keyframes live in the global stylesheet
  // shipped with this artifact (animate-in plugin).
  "animate-in fade-in duration-300"].join(" ")}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(168,85,247,0.7)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-quicksand font-black text-xl sm:text-2xl truncate text-white">
              {child.name}{t("components.parent_command_center.s_command_center_3")}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {overview.statusEmoji} {overview.statusLabel} · {parentStatus.effortSummary}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {todayRoutineId && <button type="button" onClick={() => {
          onClose();
          navigate(`/routines/${todayRoutineId}`);
        }} className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-white/5 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:bg-white/10">
              {t("components.parent_command_center.open_routine")} <ArrowRight className="h-3 w-3" />
            </button>}
          <Dialog.Close asChild>
            <button type="button" data-testid="command-center-close" className="rounded-full p-2 bg-white/5 border border-white/10 text-white hover:bg-white/10" aria-label={t("components.parent_command_center.close")}>
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </div>
      </div>

      {/* Hero: animated progress ring + cyclable mood/sleep */}
      <section className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 sm:gap-7 items-center rounded-3xl border border-border bg-white/[0.03] backdrop-blur-xl p-5 sm:p-7 shadow-[0_0_0_1px_rgba(168,85,247,0.15),0_30px_70px_-20px_rgba(168,85,247,0.45)]">
        <ProgressRing pct={overview.routineCompletionPct} size={140} />
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <p className="text-4xl sm:text-5xl font-black text-white">
              {overview.routineCompletionPct}<span className="text-2xl text-muted-foreground">%</span>
            </p>
            <p className="text-sm text-muted-foreground font-bold">
              {overview.routineCompletedTasks}/{overview.routineTotalTasks} {t("components.parent_command_center.done_2")}
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-snug">{parentStatus.stressLabel}</p>
          <div className="flex flex-wrap gap-2">
            <CycleChip label={MOOD_LABEL[mood]} caption="Mood — tap to cycle" onClick={() => persistMood(MOOD_CYCLE[(MOOD_CYCLE.indexOf(mood) + 1) % MOOD_CYCLE.length])} testId="cycle-mood" />
            <CycleChip label={SLEEP_LABEL[sleep]} caption="Sleep — tap to cycle" onClick={() => persistSleep(SLEEP_CYCLE[(SLEEP_CYCLE.indexOf(sleep) + 1) % SLEEP_CYCLE.length])} testId="cycle-sleep" />
          </div>
        </div>
      </section>

      {/* Auto-suggestion chips */}
      {suggestions.length > 0 && <section data-testid="suggestion-row" className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("components.parent_command_center.try_next")}
          </span>
          {suggestions.map(s => <button key={s.id} type="button" data-testid={`suggestion-${s.id}`} onClick={() => onSuggestion(s)} className={["inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold", "border border-border bg-primary text-white", "hover:bg-primary hover:border-border hover:shadow-[0_0_24px_-4px_rgba(168,85,247,0.7)]", "transition-all"].join(" ")}>
              <span className="text-base">{s.emoji}</span> {s.label}
            </button>)}
        </section>}

      {/* Empty state — when there's no routine, hide everything below the
          hero and just present a single CTA so the parent isn't faced with
          a wall of disabled buttons. */}
      {empty ? <EmptyState onCreate={() => {
      onClose();
      navigate("/routines");
    }} /> : <>
          {/* Today timeline (with swipe-to-skip + undo) */}
          <section data-testid="timeline-section" className="rounded-3xl border border-border bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                {t("components.parent_command_center.today_s_timeline")}
              </h3>
              <span className="text-[11px] text-muted-foreground font-bold">
                {timeline.filter(t => t.status === "completed").length}/{timeline.length} {t("components.parent_command_center.complete")}
              </span>
            </div>
            <ul className="space-y-2">
              {timeline.slice(0, 8).map(t => <SwipeableTimelineRow key={`${t.index}-${t.time}-${t.activity}`} step={t} onComplete={() => completeStep(t.index)} onSkip={() => skipStep(t.index)} />)}
            </ul>
          </section>

          {/* Quick activity strip — separate from the strategic action grid.
              Each chip opens an inline timed activity that logs a positive
              moment when finished. */}
          <section data-testid="quick-activity-strip" className="rounded-3xl border border-border bg-primary/[0.04] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                {t("parent_hub.command_center.quick_ideas_title")}
              </h3>
              <span className="text-[11px] text-muted-foreground font-bold">{t("parent_hub.command_center.tap_timer")}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {quickActivities.map(q => <button key={q.id} type="button" data-testid={`quick-${q.id}`} onClick={() => startQuickActivity(q.id)} className={["relative flex flex-col items-center justify-center gap-1.5 px-3 py-3.5 rounded-2xl", "border border-border bg-white/5 text-white", "hover:bg-primary hover:border-border hover:shadow-[0_0_24px_-6px_rgba(16,185,129,0.6)]", "transition-all duration-200 active:scale-95", activePanel === q.id ? "border-border bg-primary" : ""].join(" ")}>
                  <span className="text-2xl" aria-hidden>{q.emoji}</span>
                  <span className="text-[11.5px] font-black text-center leading-tight">{q.label}</span>
                </button>)}
            </div>
          </section>

          {/* Strategic action grid — the 4 in-place actions. We deliberately
              filter out "add-activity" since that lives on the Quick activity
              strip above; this grid is for whole-routine moves. */}
          <section data-testid="quick-action-bar" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {actions.filter(a => a.id !== "add-activity").map(a => {
          return <button key={a.id} type="button" data-testid={`action-${a.id}`} onClick={() => onAction(a.id)} disabled={updateItems.isPending && (a.id === "simplify-today" || a.id === "fix-routine")} className={["relative flex flex-col items-center justify-center gap-1.5 px-3 py-3.5 rounded-2xl", "border transition-all duration-200 active:scale-95 overflow-hidden", a.severity === "primary" ? "bg-gradient-to-br from-primary to-primary text-white border-transparent shadow-[0_18px_36px_-12px_rgba(168,85,247,0.8)]" : "bg-white/5 text-white border-white/15 hover:border-border hover:bg-white/10 hover:shadow-[0_0_24px_-6px_rgba(168,85,247,0.6)]", flashAction === a.id ? "scale-[1.04]" : ""].join(" ")}>
                <span className="text-2xl" aria-hidden>
                  {a.emoji}
                </span>
                <span className="text-[11.5px] font-black text-center leading-tight">{a.label}</span>
                {a.severity === "primary" && <span className="absolute top-1 right-1 text-[8px] font-black uppercase tracking-wider opacity-90">
                    {t("components.parent_command_center.top")}
                  </span>}
              </button>;
        })}
          </section>
        </>}

      {/* In-place panels — strategic actions */}
      {activePanel === "calm" && <ActionPanel tone="rose" icon={<Heart className="h-4 w-4" />} title={t("parent_hub.command_center.calming_title")} steps={(() => {
      // Defensive: in test mocks `t(..., {returnObjects:true})` may
      // return the key string instead of an array, which would crash
      // the `<ActionPanel steps={...}>` mapping in the renderer.
      const raw = t("parent_hub.command_center.calming_steps", {
        returnObjects: true
      });
      return Array.isArray(raw) ? raw as string[] : [];
    })()} onDone={() => {
      setActivePanel(null);
      logQuickWin();
    }} />}
      {activePanel === "sleep" && <ActionPanel tone="indigo" icon={<Moon className="h-4 w-4" />} title={t("parent_hub.command_center.winddown_title")} steps={(() => {
      const raw = t("parent_hub.command_center.winddown_steps", {
        returnObjects: true
      });
      return Array.isArray(raw) ? raw as string[] : [];
    })()} onDone={() => setActivePanel(null)} />}

      {/* Timed quick activity panels — count down then log a positive
          moment when the parent taps "Done with my child". */}
      {(["play", "phonics", "lullaby", "puzzle"] as const).map(id => activePanel === id ? <TimedActivityPanel key={id} activity={quickActivities.find(q => q.id === id)!} onCancel={() => setActivePanel(null)} onDone={() => logQuickActivity(quickActivities.find(q => q.id === id)!)} /> : null)}

      {/* In-place 10-min play picker — closes the loop on the engine's
          "Try a 10-min play" suggestion chip with 3 tap-to-start ideas. */}
      {activePanel === "play-picker" && <PlayPickerPanel ideas={playIdeas} onPick={pickPlayIdea} onClose={() => setActivePanel(null)} />}

      {/* Smart Study learning insights — surfaces *why* tomorrow's adaptive
          plan looks the way it does (weak topics, 7-day accuracy per
          subject, yesterday's plan completion). Powered by the same
          child_learning_progress table the Smart Study engine reads. */}
      <LearningInsightsSection childId={child.id} />

      {/* Insights summary footer */}
      {insights.length > 0 && <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insights.map((ins, i) => {
        return <div key={i} className={["rounded-2xl border p-3.5", ins.tone === "good" ? "border-border bg-primary" : ins.tone === "warn" ? "border-border bg-primary" : "border-border bg-primary"].join(" ")}>
              <p className="text-[10px] font-black uppercase tracking-wide text-white/70 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {t("components.parent_command_center.amy_ai_insight")}
              </p>
              <p className="text-sm font-black text-white mt-1 leading-snug">{ins.what}</p>
              <p className="text-[12px] text-white/70 mt-1 leading-snug">{ins.why}</p>
              <p className="text-[12px] text-white mt-1.5 leading-snug">
                <span className="font-black">→ </span>{ins.action}
              </p>
            </div>;
      })}
        </section>}

      {/* Toast — supports an optional Undo affordance for swipe-to-skip. */}
      {toast && <div data-testid="command-center-toast" className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[70] flex items-center gap-3 rounded-full px-4 py-2 bg-gradient-to-r from-primary to-primary text-white text-[13px] font-bold shadow-[0_18px_50px_-10px_rgba(168,85,247,0.7)] animate-in fade-in slide-in-from-bottom-2">
          <span>{toast.msg}</span>
          {toast.undo && <button type="button" data-testid="command-center-toast-undo" onClick={() => {
        const fn = toast.undo;
        setToast(null);
        fn?.();
      }} className="rounded-full bg-white/20 hover:bg-white/30 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider">
              {t("components.parent_command_center.undo")}
            </button>}
        </div>}

      {/* Confetti burst */}
      {confettiKey > 0 && <Confetti key={confettiKey} />}

      {/* Re-trigger keyframes when shakeKey changes by mounting + auto-removing */}
      {shakeKey > 0 && <ShakeOverlay key={shakeKey} />}
    </div>;
}

// ─── Learning insights ───────────────────────────────────────────────────
//
// Reads /api/smart-study/insights for the child and shows the parent the
// signals the adaptive Smart Study engine uses under the hood: weak topics
// (so they know what to revise with the child), rolling 7-day accuracy per
// subject (so they can spot a slipping subject), and yesterday's adaptive
// plan completion (so they can see whether the child actually used it).
function LearningInsightsSection({ childId }: { childId: number }) {
  const { data, isLoading } = useGetSmartStudyInsights({ childId });

  if (isLoading) {
    return (
      <section data-testid="learning-insights-loading" className="rounded-3xl border border-border bg-primary/[0.04] p-4 sm:p-5">
        <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </section>
    );
  }
  if (!data || data.mode === "play") return null;
  if (!data.hasData) {
    return (
      <section data-testid="learning-insights-empty" className="rounded-3xl border border-border bg-primary/[0.04] p-4 sm:p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" /> Learning insights
        </h3>
        <p className="mt-2 text-[12.5px] text-white/70 leading-snug">
          {data.childName} hasn't tried Smart Study yet. Once they answer a few
          questions, you'll see weak topics and accuracy trends here.
        </p>
      </section>
    );
  }

  const subjectsWithSignal = data.subjects.filter(
    (s) => s.sampleSize > 0 || s.weakTopics.length > 0,
  );
  const yesterday = data.yesterday;

  return (
    <section data-testid="learning-insights" className="rounded-3xl border border-border bg-primary/[0.04] p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" /> Learning insights
        </h3>
        {yesterday && yesterday.planSize > 0 && (
          <span
            data-testid="learning-insights-yesterday"
            className="text-[11px] text-white/80 font-bold rounded-full px-2.5 py-1 bg-white/5 border border-white/10"
          >
            Yesterday: {yesterday.doneCount}/{yesterday.planSize} ({yesterday.completionPct}%)
          </span>
        )}
      </div>
      {subjectsWithSignal.length === 0 ? (
        <p className="text-[12.5px] text-white/70 leading-snug">
          Not enough activity yet to spot weak topics. Encourage a couple of
          Smart Study sessions this week to unlock trends.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {subjectsWithSignal.map((s) => {
            const acc = s.accuracyPct;
            const tone =
              acc == null
                ? "text-white/70"
                : acc >= 80
                ? "text-[hsl(var(--brand-emerald-400))]"
                : acc < 60
                ? "text-[hsl(var(--brand-rose-400))]"
                : "text-[hsl(var(--brand-amber-300))]";
            return (
              <li
                key={s.subject}
                data-testid={`learning-insights-subject-${s.subject}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-black text-white truncate">
                    <span aria-hidden>{s.subjectEmoji}</span> {s.subjectTitle}
                  </p>
                  <span className={`text-[12px] font-black tabular-nums ${tone}`}>
                    {acc == null ? "— %" : `${acc}%`}
                  </span>
                </div>
                <p className="text-[10.5px] text-white/60 mt-0.5">
                  {s.sampleSize > 0
                    ? `Last 7 days · ${s.sampleSize} attempt${s.sampleSize === 1 ? "" : "s"}`
                    : "Last 7 days · no attempts yet"}
                </p>
                {s.weakTopics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.weakTopics.map((w) => (
                      <span
                        key={w.topicId}
                        className="text-[10.5px] font-bold rounded-full px-2 py-0.5 bg-[hsl(var(--brand-rose-500)/0.15)] text-[hsl(var(--brand-rose-400))] border border-[hsl(var(--brand-rose-400)/0.2)]"
                      >
                        {w.topicTitle}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function ProgressRing({
  pct,
  size = 80
}: {
  pct: number;
  size?: number;
}) {
  // Use stroke-dashoffset for the animation; the "to 100" stroke at start
  // gives the satisfying "fill in" effect on first render.
  const stroke = Math.max(4, Math.round(size * 0.075));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - safe / 100);
  return <div className="relative" style={{
    width: size,
    height: size
  }} aria-label={`${safe}% complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--brand-purple-500))" />
            <stop offset="50%" stopColor="hsl(var(--brand-pink-500))" />
            <stop offset="100%" stopColor="hsl(var(--brand-emerald-500))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#ring-${size})`} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={c} strokeDashoffset={offset} style={{
        transition: "stroke-dashoffset 800ms cubic-bezier(.2,.8,.2,1)"
      }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-black tabular-nums text-white" style={{
        fontSize: Math.max(12, Math.round(size * 0.28))
      }}>
          {safe}%
        </span>
      </div>
    </div>;
}
function CycleChip({
  label,
  caption,
  onClick,
  testId
}: {
  label: string;
  caption: string;
  onClick: () => void;
  testId?: string;
}) {
  return <button type="button" onClick={onClick} data-testid={testId} className="group inline-flex flex-col items-start rounded-2xl border border-border bg-primary px-3 py-1.5 text-left hover:bg-primary hover:border-border transition-all">
      <span className="text-[12px] font-black text-white">{label}</span>
      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">{caption}</span>
    </button>;
}
function ActionPanel({
  tone,
  icon,
  title,
  steps,
  onDone
}: {
  tone: "rose" | "indigo" | "emerald";
  icon: React.ReactNode;
  title: string;
  steps: string[];
  onDone: () => void;
}) {
  const {
    t
  } = useTranslation();
  const palette: Record<string, string> = {
    rose: "border-border bg-primary",
    indigo: "border-border bg-primary",
    emerald: "border-border bg-primary"
  };
  return <section data-testid="command-center-panel" className={["rounded-3xl border p-4 sm:p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200", palette[tone]].join(" ")}>
      <div className="flex items-center gap-2 text-white">
        <span className="rounded-full bg-white/10 p-1.5">{icon}</span>
        <h4 className="font-black text-sm">{title}</h4>
      </div>
      <ol className="space-y-2 list-none">
        {steps.map((s, i) => <li key={i} className="flex items-start gap-2 text-[13px] text-white/90">
            <span className="rounded-full bg-white/15 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="leading-snug">{s}</span>
          </li>)}
      </ol>
      <div className="flex justify-end">
        <button type="button" onClick={onDone} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-black bg-white text-foreground hover:bg-white/90">
          <PartyPopper className="h-3.5 w-3.5" /> {t("components.parent_command_center.done_3")}
        </button>
      </div>
    </section>;
}
function PlayPickerPanel({
  ideas,
  onPick,
  onClose
}: {
  ideas: PlayIdea[];
  onPick: (idea: PlayIdea) => void;
  onClose: () => void;
}) {
  const {
    t
  } = useTranslation();
  return <section data-testid="play-picker-panel" className="rounded-3xl border border-border bg-primary p-4 sm:p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white">
          <span className="rounded-full bg-white/10 p-1.5"><Dices className="h-4 w-4" /></span>
          <h4 className="font-black text-sm">{t("parent_hub.command_center.pick_play")}</h4>
        </div>
        <button type="button" onClick={onClose} data-testid="play-picker-close" className="text-[11px] font-bold text-white/70 hover:text-white underline-offset-2 hover:underline">
          {t("parent_hub.command_center.close")}
        </button>
      </div>
      <ul className="grid grid-cols-1 gap-2">
        {ideas.map(idea => {
        return <li key={idea.id}>
            <button type="button" data-testid={`play-idea-${idea.id}`} onClick={() => onPick(idea)} className="w-full text-left flex items-start gap-3 rounded-2xl border border-border bg-white/5 hover:bg-primary hover:border-border hover:shadow-[0_0_24px_-6px_rgba(16,185,129,0.6)] p-3 transition-all active:scale-[0.99]">
              <span className="text-2xl shrink-0" aria-hidden>{idea.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-black text-white leading-tight">{idea.title}</span>
                <span className="block text-[11.5px] text-white/70 mt-0.5 leading-snug">{idea.description}</span>
              </span>
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white text-foreground px-2.5 py-1 text-[10.5px] font-black">
                {t("parent_hub.command_center.start")}
                <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          </li>;
      })}
      </ul>
    </section>;
}
function EmptyState({
  onCreate
}: {
  onCreate: () => void;
}) {
  const {
    t
  } = useTranslation();
  return <div data-testid="command-center-empty" className="rounded-2xl border border-dashed border-border bg-white/[0.02] p-6 text-center space-y-3">
      <p className="text-3xl">🪄</p>
      <p className="text-sm font-bold text-white">{t("parent_hub.command_center.no_routine")}</p>
      <p className="text-[12px] text-muted-foreground">
        {t("parent_hub.command_center.no_routine_help")}
      </p>
      <button type="button" onClick={onCreate} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary text-white px-4 py-2 text-[12px] font-black">
        <Wand2 className="h-3.5 w-3.5" /> {t("components.parent_command_center.create_today_s_routine")}
      </button>
    </div>;
}
function Confetti() {
  // Lightweight pure-CSS confetti so we don't pull a new dep. Each piece is
  // an absolutely-positioned dot with a randomised translate + spin keyframe.
  const PIECES = 22;
  const pieces = Array.from({
    length: PIECES
  }).map((_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 120;
    const duration = 700 + Math.random() * 700;
    const rot = Math.round(Math.random() * 720 - 360);
    const dx = Math.round(Math.random() * 200 - 100);
    const dy = 280 + Math.random() * 140;
    const colors = ["hsl(var(--brand-purple-500))", "hsl(var(--brand-pink-500))", "hsl(var(--brand-emerald-500))", "hsl(var(--brand-amber-500))", "hsl(var(--brand-sky-400))"];
    const color = colors[i % colors.length];
    // Build the style as our extended type, then widen to CSSProperties when
    // handing it to React (custom CSS vars aren't part of CSSProperties).
    const pieceStyle: CSSPropertiesWithVars = {
      position: "absolute",
      top: 0,
      left: `${left}%`,
      width: 8,
      height: 12,
      background: color,
      borderRadius: 2,
      animation: `cc-confetti ${duration}ms ease-out ${delay}ms forwards`,
      transform: `translate(0,0) rotate(0deg)`,
      "--cc-dx": `${dx}px`,
      "--cc-dy": `${dy}px`,
      "--cc-rot": `${rot}deg`
    };
    return <span key={i} style={pieceStyle as CSSProperties} />;
  });
  return <div data-testid="command-center-confetti" className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <style>{`@keyframes cc-confetti { to { transform: translate(var(--cc-dx), var(--cc-dy)) rotate(var(--cc-rot)); opacity: 0; } }`}</style>
      {pieces}
    </div>;
}
function ShakeOverlay() {
  // Briefly shakes the dashboard container by toggling a transient class on
  // the document body. Keeping it overlay-only avoids a re-render cascade
  // through the live regions.
  useEffect(() => {
    const root = document.querySelector('[data-testid="command-center-dashboard"]') as HTMLElement | null;
    if (!root) return;
    root.style.animation = "cc-shake 0.45s cubic-bezier(.36,.07,.19,.97) both";
    const id = window.setTimeout(() => {
      root.style.animation = "";
    }, 500);
    return () => window.clearTimeout(id);
  }, []);
  return <style>{`@keyframes cc-shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }`}</style>;
}

// ─── Local helpers ───────────────────────────────────────────────────────

function parseClockMins(t: string): number {
  if (!t) return -1;
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const mn = parseInt(m12[2], 10);
    const ap = m12[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h * 60 + mn;
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  return -1;
}

// ─── Swipe-to-skip timeline row ─────────────────────────────────────────
// Pointer/touch-driven horizontal swipe. Past a 60px threshold the row
// commits "skip" — the parent can recover via the toast's Undo button.
function SwipeableTimelineRow({
  step,
  onComplete,
  onSkip
}: {
  step: ReturnType<typeof computeCommandCenter>["timeline"][number];
  onComplete: () => void;
  onSkip: () => void;
}) {
  const {
    t: tFn
  } = useTranslation();
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const SKIP_THRESHOLD = 60;
  const t = step;
  function onPointerDown(e: React.PointerEvent<HTMLLIElement>) {
    if (t.status === "completed" || t.status === "skipped") return;
    startX.current = e.clientX;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLLIElement>) {
    if (startX.current == null) return;
    const delta = e.clientX - startX.current;
    // Only allow leftward swipes for skip; cap at -120px so it feels bounded.
    setDx(Math.max(-120, Math.min(0, delta)));
  }
  function onPointerEnd() {
    if (startX.current == null) return;
    const delta = dx;
    startX.current = null;
    setDx(0);
    if (delta <= -SKIP_THRESHOLD) onSkip();
  }
  return <li data-testid={t.current ? "timeline-current" : t.next ? "timeline-next" : undefined} className={["relative flex items-center gap-3 rounded-2xl border p-3 transition-all touch-pan-y select-none", t.current ? "border-border bg-gradient-to-r from-primary to-primary shadow-[0_0_30px_-6px_rgba(217,70,239,0.55)]" : t.next ? "border-border bg-primary" : "border-white/10 bg-white/[0.02]", t.status === "completed" ? "opacity-60" : "", t.status === "skipped" ? "opacity-40 line-through" : ""].join(" ")} style={{
    transform: dx ? `translateX(${dx}px)` : undefined
  }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
      <div className="w-14 shrink-0">
        <p className="text-[11px] font-black tracking-wide text-muted-foreground">{t.time}</p>
        <p className="text-[10px] text-muted-foreground uppercase">{t.duration}m</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{t.activity}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {t.current ? "Now" : t.next ? "Up next" : t.category || ""}
        </p>
      </div>
      {t.status === "completed" ? <span className="rounded-full px-2 py-0.5 text-[10px] font-black bg-primary text-muted-foreground border border-border">
          {tFn("components.parent_command_center.done_4")}
        </span> : t.status === "skipped" ? <span className="rounded-full px-2 py-0.5 text-[10px] font-black bg-white/10 text-white/70 border border-white/20">
          {tFn("components.parent_command_center.skipped")}
        </span> : <div className="flex items-center gap-1.5">
          <button type="button" onClick={onSkip} data-testid={`skip-step-${t.index}`} aria-label={`Skip ${t.activity}`} className="hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-white/5 text-white/70 border border-white/15 hover:bg-white/10 hover:text-white">
            {tFn("components.parent_command_center.skip")}
          </button>
          <button type="button" onClick={onComplete} data-testid={`complete-step-${t.index}`} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-primary text-muted-foreground border border-border hover:bg-primary hover:border-border">
            <Check className="h-3 w-3" /> {tFn("components.parent_command_center.done_5")}
          </button>
        </div>}
    </li>;
}

// ─── Timed inline activity panel ────────────────────────────────────────
// Counts down the activity's minutes (rounded to seconds for visibility),
// then offers a "Done with my child" CTA that fires `onDone`.
function TimedActivityPanel({
  activity,
  onCancel,
  onDone
}: {
  activity: {
    id: string;
    label: string;
    minutes: number;
    emoji: string;
    icon: React.ReactNode;
  };
  onCancel: () => void;
  onDone: () => void;
}) {
  const {
    t
  } = useTranslation();
  const totalSeconds = activity.minutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);
  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");
  const pct = Math.round((totalSeconds - remaining) / totalSeconds * 100);
  return <section data-testid={`timed-activity-${activity.id}`} className="rounded-3xl border border-border bg-primary p-4 sm:p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white">
          <span className="rounded-full bg-white/10 p-1.5">{activity.icon}</span>
          <h4 className="font-black text-sm">
            {activity.emoji} {activity.label}
          </h4>
        </div>
        <button type="button" onClick={onCancel} data-testid={`timed-cancel-${activity.id}`} className="text-[11px] font-bold text-white/70 hover:text-white underline-offset-2 hover:underline">
          {t("components.parent_command_center.close_2")}
        </button>
      </div>
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
        <p data-testid={`timed-clock-${activity.id}`} className="text-3xl font-black tabular-nums text-white text-center">
          {mm}:{ss}
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary transition-all" style={{
          width: `${pct}%`
        }} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setRunning(r => !r)} data-testid={`timed-toggle-${activity.id}`} className="rounded-full bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 text-[12px] font-black">
          {running ? "Pause" : "Resume"}
        </button>
        <button type="button" onClick={onDone} data-testid={`timed-done-${activity.id}`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-black bg-white text-foreground hover:bg-white/90">
          <PartyPopper className="h-3.5 w-3.5" /> {t("components.parent_command_center.done_with_my_child")}
        </button>
      </div>
    </section>;
}