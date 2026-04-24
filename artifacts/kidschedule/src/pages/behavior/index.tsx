import { useState, useMemo } from "react";
import {
  useListChildren, getListChildrenQueryKey,
  useListBehaviors, getListBehaviorsQueryKey,
  useCreateBehaviorLog, useDeleteBehaviorLog,
  getGetBehaviorStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Trash2, Loader2, Zap, BarChart2, Lightbulb, Brain, HelpCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay } from "date-fns";
import {
  QUICK_BEHAVIORS, QUICK_BEHAVIOR_KEYS, TRIGGERS, TRIGGER_KEYS,
  SOLUTIONS, SITUATION_HELP, UI_LABELS, buildAmyInsights, computeScore, scoreLabel, encodeTriggerNote,
  type LangKey, type QuickBehaviorKey, type TriggerKey,
} from "@workspace/behavior-tracker";
import { LockedBlock } from "@/components/locked-block";
import { useSubscription } from "@/hooks/use-subscription";

// ─── Glass Block ──────────────────────────────────────────────────────────────
function Block({
  icon, title, subtitle, iconBg, open, onToggle, children, alwaysOpen,
}: {
  icon: React.ReactNode; title: string; subtitle: string; iconBg: string;
  open?: boolean; onToggle?: () => void; children: React.ReactNode; alwaysOpen?: boolean;
}) {
  return (
    <div className={[
      "rounded-2xl overflow-hidden transition-all duration-300",
      "bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl",
      "border border-white/50 dark:border-white/10",
      "shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]",
      !alwaysOpen && "hover:border-primary/40 dark:hover:border-primary/40",
      !alwaysOpen && "hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]",
      open && "border-primary/60 dark:border-primary/50 shadow-[0_0_0_1px_rgba(168,85,247,0.45),0_18px_50px_-12px_rgba(168,85,247,0.45)]",
    ].join(" ")}>
      <button
        onClick={onToggle}
        disabled={alwaysOpen}
        className={[
          "w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors duration-200",
          open ? "bg-primary/[0.06] dark:bg-primary/[0.08]" : "hover:bg-white/40 dark:hover:bg-white/[0.03]",
          alwaysOpen ? "cursor-default" : "cursor-pointer",
        ].join(" ")}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-white/40 dark:ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="font-quicksand font-bold text-[15px] leading-tight text-foreground truncate">{title}</p>
            <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>
        {!alwaysOpen && (
          <span className={[
            "shrink-0 w-7 h-7 rounded-full flex items-center justify-center border bg-white/50 dark:bg-white/5 transition-transform duration-300",
            open ? "rotate-180 text-primary border-primary/40" : "text-muted-foreground border-border/50",
          ].join(" ")}>
            <ChevronDown className="h-4 w-4" />
          </span>
        )}
      </button>
      {(alwaysOpen || open) && (
        <div className="px-4 pb-5 pt-3 border-t border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/[0.015] animate-in fade-in slide-in-from-top-1 duration-300">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Language Toggle ───────────────────────────────────────────────────────────
function LangToggle({ lang, setLang }: { lang: LangKey; setLang: (l: LangKey) => void }) {
  const opts: { key: LangKey; label: string }[] = [
    { key: "en", label: "EN" },
    { key: "hi", label: "हिं" },
    { key: "hinglish", label: "Hng" },
  ];
  return (
    <div className="flex rounded-xl overflow-hidden border border-border/60 bg-white/40 dark:bg-white/5 shrink-0">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => setLang(o.key)}
          className={[
            "px-2.5 py-1 text-xs font-bold transition-colors",
            lang === o.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function BehaviorTracker() {
  const [lang, setLang] = useState<LangKey>("en");
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [pendingTrigger, setPendingTrigger] = useState<TriggerKey | null>(null);
  const [openBlock, setOpenBlock] = useState<string | null>("quick-log");
  const [situationKey, setSituationKey] = useState<"crying" | "angry" | "not_listening" | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const L = UI_LABELS[lang];

  const { isPremium } = useSubscription();
  const { data: children = [] } = useListChildren({ query: { queryKey: getListChildrenQueryKey() } });
  // Free users can only see the first child's data. If they somehow selected
  // another child (e.g. before upgrading), force the scope back to child #1.
  const firstChildId = children[0]?.id ?? null;
  const effectiveChildId = isPremium
    ? selectedChild
    : (selectedChild && selectedChild === firstChildId ? selectedChild : firstChildId);
  const todayParams = effectiveChildId
    ? { date: today, childId: effectiveChildId }
    : { date: today };
  const { data: todayLogs = [], isLoading: todayLoading } = useListBehaviors(
    todayParams,
    { query: { queryKey: getListBehaviorsQueryKey(todayParams) } }
  );
  const { data: allLogs = [] } = useListBehaviors(
    undefined,
    { query: { queryKey: getListBehaviorsQueryKey() } }
  );

  const createMutation = useCreateBehaviorLog();
  const deleteMutation = useDeleteBehaviorLog();

  const toggle = (id: string) => setOpenBlock((c) => (c === id ? null : id));

  function quickLog(key: QuickBehaviorKey) {
    if (!selectedChild) {
      toast({ title: "Select a child first", variant: "destructive" });
      return;
    }
    const def = QUICK_BEHAVIORS[key];
    createMutation.mutate(
      {
        data: {
          childId: selectedChild,
          date: today,
          type: def.type === "neutral" ? "neutral" : def.type,
          behavior: def.behaviorText.en,
          notes: pendingTrigger ? encodeTriggerNote(pendingTrigger) : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: `${def.emoji} ${def.label[lang]} logged!` });
          setPendingTrigger(null);
          queryClient.invalidateQueries({ queryKey: getListBehaviorsQueryKey({ date: today }) });
          queryClient.invalidateQueries({ queryKey: getListBehaviorsQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetBehaviorStatsQueryKey() });
        },
        onError: (err: unknown) => {
          const status = (err as { status?: number })?.status;
          const data = (err as { data?: { error?: string; feature?: string } })?.data;
          if (status === 402) {
            // child_locked: free user trying to write data for a non-first child
            if (data?.error === "child_locked") {
              window.dispatchEvent(
                new CustomEvent("amynest:open-paywall", { detail: { reason: "child_locked" } }),
              );
              return;
            }
            // feature_locked: free user exhausted their behavior log quota
            if (data?.error === "feature_locked" || data?.feature === "behavior_log") {
              window.dispatchEvent(
                new CustomEvent("amynest:open-paywall", { detail: { reason: "behavior_locked" } }),
              );
              return;
            }
          }
          toast({ title: "Failed to log", variant: "destructive" });
        },
      }
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBehaviorsQueryKey({ date: today }) });
          queryClient.invalidateQueries({ queryKey: getListBehaviorsQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetBehaviorStatsQueryKey() });
        },
        onError: (err: unknown) => {
          const status = (err as { status?: number })?.status;
          const data = (err as { data?: { error?: string } })?.data;
          if (status === 402 && data?.error === "child_locked") {
            window.dispatchEvent(
              new CustomEvent("amynest:open-paywall", { detail: { reason: "child_locked" } }),
            );
            return;
          }
          toast({ title: "Failed to delete", variant: "destructive" });
        },
      }
    );
  }

  // Today summary
  const pos = todayLogs.filter((l) => l.type === "positive").length;
  const neg = todayLogs.filter((l) => l.type === "negative").length;
  const neu = todayLogs.filter((l) => l.type === "neutral").length;
  const score = computeScore(todayLogs as any);

  // Amy insights (all logs for child or all)
  const insightLogs = useMemo(
    () => (effectiveChildId ? allLogs.filter((l) => l.childId === effectiveChildId) : allLogs),
    [allLogs, effectiveChildId]
  );
  const insights = useMemo(() => buildAmyInsights(insightLogs as any, lang), [insightLogs, lang]);

  // Weekly trends — last 7 days
  const weekData = useMemo(() => {
    const days: { label: string; pos: number; neg: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, "yyyy-MM-dd");
      const dayLogs = allLogs.filter((l) => {
        const logDate = l.date ? l.date.slice(0, 10) : "";
        return logDate === dateStr && (!effectiveChildId || l.childId === effectiveChildId);
      });
      days.push({
        label: L.days[d.getDay()],
        pos: dayLogs.filter((l) => l.type === "positive").length,
        neg: dayLogs.filter((l) => l.type === "negative").length,
        total: dayLogs.length,
      });
    }
    return days;
  }, [allLogs, effectiveChildId, lang]);

  const maxWeek = Math.max(...weekData.map((d) => d.total), 1);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-quicksand text-2xl font-bold text-foreground">Behavior Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Log moments — Amy spots the patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} setLang={setLang} />
          <button
            onClick={() => setSituationKey("crying")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors border border-rose-200 dark:border-rose-500/30"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {L.situationMode}
          </button>
        </div>
      </div>

      {/* Child Selector */}
      <div className="flex flex-wrap gap-2">
        {children.map((c, index) => {
          const locked = !isPremium && index > 0;
          const chip = (
            <button
              onClick={() => {
                if (locked) return;
                setSelectedChild((v) => (v === c.id ? null : c.id));
              }}
              disabled={locked}
              className={[
                "px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all",
                selectedChild === c.id
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_0_2px_rgba(168,85,247,0.3)]"
                  : "bg-white/60 dark:bg-white/5 border-border/60 hover:border-primary/40",
              ].join(" ")}
            >
              {c.name}
            </button>
          );
          return (
            <LockedBlock
              key={c.id}
              locked={locked}
              reason="child_limit"
              label="Premium"
              cta="Unlock"
              rounded="rounded-xl"
            >
              {chip}
            </LockedBlock>
          );
        })}
        {children.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">Add a child profile to start tracking.</p>
        )}
      </div>

      {/* Per-child quick stat cards (free users see only the first; the rest are paywalled) */}
      {children.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {children.map((c, index) => {
            const childLogsToday = allLogs.filter((l) => l.childId === c.id && l.date?.slice(0, 10) === today);
            const childPos = childLogsToday.filter((l) => l.type === "positive").length;
            const childNeg = childLogsToday.filter((l) => l.type === "negative").length;
            const card = (
              <div className="rounded-2xl p-3 bg-white/60 dark:bg-white/5 border border-border/50">
                <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                <p className="text-[10px] text-muted-foreground mb-1.5">Today</p>
                <div className="flex gap-2">
                  <span className="text-[11px] font-bold text-emerald-600">😊 {childPos}</span>
                  <span className="text-[11px] font-bold text-red-500">😡 {childNeg}</span>
                </div>
              </div>
            );
            const locked = !isPremium && index > 0;
            return (
              <LockedBlock
                key={c.id}
                locked={locked}
                reason="child_limit"
                label="Premium"
                cta="Unlock"
                rounded="rounded-2xl"
              >
                {card}
              </LockedBlock>
            );
          })}
        </div>
      )}

      {/* Blocks */}
      <div className="flex flex-col gap-3">
        {/* 1. Quick Log */}
        <Block
          icon={<Zap className="h-5 w-5 text-amber-600" />}
          title={L.quickLog}
          subtitle={L.tap1Log}
          iconBg="bg-amber-100 dark:bg-amber-500/20"
          open={openBlock === "quick-log"}
          onToggle={() => toggle("quick-log")}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {QUICK_BEHAVIOR_KEYS.map((key) => {
                const def = QUICK_BEHAVIORS[key];
                return (
                  <button
                    key={key}
                    onClick={() => quickLog(key)}
                    disabled={createMutation.isPending}
                    className={[
                      "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                      "bg-white/60 dark:bg-white/5 border-border/50",
                      "hover:scale-105 hover:shadow-md active:scale-95",
                    ].join(" ")}
                    style={{ borderColor: def.color + "44" }}
                  >
                    <span className="text-2xl">{def.emoji}</span>
                    <span className="text-[10px] font-bold text-center leading-tight" style={{ color: def.color }}>
                      {def.label[lang]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Trigger selector */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{L.selectTrigger}</p>
              <div className="flex flex-wrap gap-2">
                {TRIGGER_KEYS.map((k) => {
                  const t = TRIGGERS[k];
                  return (
                    <button
                      key={k}
                      onClick={() => setPendingTrigger((v) => (v === k ? null : k))}
                      className={[
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                        pendingTrigger === k
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-white/50 dark:bg-white/5 border-border/50 text-muted-foreground hover:border-primary/40",
                      ].join(" ")}
                    >
                      {t.emoji} {t.label[lang]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Today log list */}
            {todayLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : todayLogs.length > 0 ? (
              <div className="space-y-2 border-t border-border/30 pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{L.loggedToday} ({todayLogs.length})</p>
                {todayLogs.map((log) => {
                  const matchedKey = QUICK_BEHAVIOR_KEYS.find((k) => QUICK_BEHAVIORS[k].behaviorText.en === log.behavior);
                  const def = matchedKey ? QUICK_BEHAVIORS[matchedKey] : null;
                  return (
                    <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/40 dark:bg-white/5 border border-border/30 group">
                      <span className="text-lg shrink-0">{def?.emoji ?? (log.type === "positive" ? "😊" : log.type === "negative" ? "😡" : "😐")}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{log.behavior}</p>
                        {log.notes && <p className="text-xs text-muted-foreground truncate">{log.notes.replace(/\[trigger:\w+\]\s?/, "")}</p>}
                      </div>
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deleteMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">{L.noDataYet}</p>
            )}
          </div>
        </Block>

        {/* 2. Today Summary */}
        <Block
          icon={<span className="text-xl">📊</span>}
          title={L.todaySummary}
          subtitle={`${todayLogs.length} ${L.loggedToday}`}
          iconBg="bg-blue-100 dark:bg-blue-500/20"
          open={openBlock === "summary"}
          onToggle={() => toggle("summary")}
        >
          <div className="space-y-3">
            {/* Score */}
            <div className="rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 p-4 text-center">
              <p className="text-4xl font-black text-primary">{score}</p>
              <p className="text-sm font-bold text-foreground mt-1">{L.score}: {scoreLabel(score, lang)}</p>
              <div className="mt-2 h-2 rounded-full bg-white/50 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-700" style={{ width: `${score}%` }} />
              </div>
            </div>
            {/* Counts */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: L.positive, count: pos, color: "#10B981", bg: "bg-emerald-100 dark:bg-emerald-500/20" },
                { label: L.challenging, count: neg, color: "#EF4444", bg: "bg-red-100 dark:bg-red-500/20" },
                { label: L.neutral, count: neu, color: "#6B7280", bg: "bg-gray-100 dark:bg-gray-500/20" },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl p-3 text-center ${item.bg} border border-white/50`}>
                  <p className="text-2xl font-black" style={{ color: item.color }}>{item.count}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Block>

        {/* 3. Amy Insights */}
        <Block
          icon={<Brain className="h-5 w-5 text-violet-600" />}
          title={L.amyInsights}
          subtitle={insights.length > 0 ? `${insights.length} pattern${insights.length > 1 ? "s" : ""} found` : "Log more to unlock"}
          iconBg="bg-violet-100 dark:bg-violet-500/20"
          open={openBlock === "insights"}
          onToggle={() => toggle("insights")}
        >
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">{L.noInsights}</p>
          ) : (
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
                  <span className="text-xl shrink-0">{ins.icon}</span>
                  <p className="text-sm text-foreground leading-relaxed">{ins.text}</p>
                </div>
              ))}
            </div>
          )}
        </Block>

        {/* 4. Weekly Trends */}
        <Block
          icon={<BarChart2 className="h-5 w-5 text-blue-600" />}
          title={L.weeklyTrends}
          subtitle="Last 7 days"
          iconBg="bg-blue-100 dark:bg-blue-500/20"
          open={openBlock === "trends"}
          onToggle={() => toggle("trends")}
        >
          <div className="flex items-end gap-1.5 h-28">
            {weekData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: "80px" }}>
                  {d.pos > 0 && (
                    <div
                      className="w-full rounded-t-sm bg-emerald-400 dark:bg-emerald-500"
                      style={{ height: `${(d.pos / maxWeek) * 80}px`, minHeight: 4 }}
                    />
                  )}
                  {d.neg > 0 && (
                    <div
                      className="w-full rounded-b-sm bg-red-400 dark:bg-red-500"
                      style={{ height: `${(d.neg / maxWeek) * 80}px`, minHeight: 4 }}
                    />
                  )}
                  {d.total === 0 && (
                    <div className="w-full rounded bg-border/40" style={{ height: 4 }} />
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground font-semibold">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /><span className="text-[11px] text-muted-foreground">{L.positive}</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400" /><span className="text-[11px] text-muted-foreground">{L.challenging}</span></div>
          </div>
        </Block>

        {/* 5. Solutions & Tips */}
        <Block
          icon={<Lightbulb className="h-5 w-5 text-orange-500" />}
          title={L.solutions}
          subtitle="Amy's proven tips per situation"
          iconBg="bg-orange-100 dark:bg-orange-500/20"
          open={openBlock === "solutions"}
          onToggle={() => toggle("solutions")}
        >
          <div className="space-y-4">
            {(["tantrum", "crying", "not_listening", "good_behavior", "low_energy"] as QuickBehaviorKey[]).map((key) => {
              const def = QUICK_BEHAVIORS[key];
              const tips = SOLUTIONS[key][lang];
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{def.emoji}</span>
                    <p className="text-sm font-bold text-foreground">{def.label[lang]}</p>
                  </div>
                  <div className="space-y-1.5">
                    {tips.map((tip, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black text-white" style={{ backgroundColor: def.color }}>
                          {i + 1}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Block>
      </div>

      {/* Situation Mode Modal */}
      {situationKey && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSituationKey(null)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-[#14142B] border border-border/50 p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-quicksand font-bold text-lg text-foreground">{L.situationMode}</h3>
              <button onClick={() => setSituationKey(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Situation buttons */}
            <div className="flex gap-2 mb-5">
              {(["crying", "angry", "not_listening"] as const).map((k) => {
                const labels: Record<string, string> = { crying: L.childHelp, angry: L.childAngry, not_listening: L.childNotListening };
                return (
                  <button
                    key={k}
                    onClick={() => setSituationKey(k)}
                    className={[
                      "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                      situationKey === k
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/50",
                    ].join(" ")}
                  >
                    {labels[k]}
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              {SITUATION_HELP[situationKey][lang].map((tip, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-primary/5 border border-primary/15">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-xs font-black">{i + 1}</div>
                  <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
