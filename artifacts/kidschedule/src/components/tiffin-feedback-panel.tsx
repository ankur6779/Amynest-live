import { useEffect, useMemo, useState } from "react";
import { STATUS_EMOJI, STATUS_LABEL, buildAmyTiffinHint, hasFeedbackForDate, recordFeedback, removeFeedback, summarizeFeedback, todayKey, type TiffinHistory, type TiffinStatus } from "@workspace/tiffin-feedback";
import { AmyIcon } from "@/components/amy-icon";
import { Heart, Trash2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
const STORAGE_KEY = "amynest.tiffin_feedback.v1";
export function loadHistory(): TiffinHistory {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as TiffinHistory : [];
  } catch {
    return [];
  }
}
function saveHistory(h: TiffinHistory) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch {}
}
interface PickableMeal {
  id: string;
  title: string;
  emoji?: string;
  tag?: string;
}
interface Props {
  /** The kids_tiffin meals currently shown to the parent — picker source. */
  pickableMeals: PickableMeal[];
  /** Notifies parent so it can refetch suggestions with new learning signals. */
  onChange: (history: TiffinHistory) => void;
}

/**
 * Daily tiffin feedback panel. Shown above the meal cards on the Kids tab.
 * Lets the parent log "How was today's tiffin?" and surfaces the child's
 * top-liked foods so the AI can lean into them.
 */
export function TiffinFeedbackPanel({
  pickableMeals,
  onChange
}: Props) {
  const {
    t
  } = useTranslation();
  const [history, setHistory] = useState<TiffinHistory>(() => loadHistory());
  const [pickedMealId, setPickedMealId] = useState<string>("");

  // Default the picker to the first card every time it changes.
  useEffect(() => {
    if (pickableMeals.length === 0) return;
    if (!pickableMeals.some(m => m.id === pickedMealId)) {
      setPickedMealId(pickableMeals[0]!.id);
    }
  }, [pickableMeals, pickedMealId]);
  const summary = useMemo(() => summarizeFeedback(history), [history]);
  const amyHint = useMemo(() => buildAmyTiffinHint(history), [history]);
  const today = todayKey();
  const todayDone = hasFeedbackForDate(history, today);
  const todayEntry = history.find(e => e.date === today);
  const submit = (status: TiffinStatus) => {
    const meal = pickableMeals.find(m => m.id === pickedMealId);
    if (!meal) return;
    const next = recordFeedback(history, {
      mealId: meal.id,
      mealTitle: meal.title,
      emoji: meal.emoji,
      tag: meal.tag,
      status
    });
    setHistory(next);
    saveHistory(next);
    onChange(next);
  };
  const undoToday = () => {
    if (!todayEntry) return;
    const next = removeFeedback(history, todayEntry.id);
    setHistory(next);
    saveHistory(next);
    onChange(next);
  };
  return <div className="mx-3 mt-3 rounded-2xl border border-rose-100 dark:border-rose-400/20 bg-gradient-to-br from-rose-50/80 via-white to-amber-50/60 dark:from-rose-500/8 dark:via-slate-900/30 dark:to-amber-500/8 overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-rose-100/80 dark:border-rose-400/15">
        <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-base shrink-0">
          🍱
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-quicksand font-bold text-[13.5px] text-foreground">{t("components.tiffin_feedback_panel.today_s_tiffin_feedback")}</p>
          <p className="text-[10.5px] text-muted-foreground">{t("components.tiffin_feedback_panel.helps_amy_learn_what_your_child_loves")}</p>
        </div>
        {summary.totalRated > 0 && <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200">
            {summary.eatenPct}{t("components.tiffin_feedback_panel.eaten")}
          </span>}
      </div>

      {/* Today's prompt */}
      <div className="px-3.5 py-3">
        {todayDone && todayEntry ? <div className="flex items-center gap-2.5 rounded-xl bg-white/80 dark:bg-slate-900/40 border border-emerald-200/70 dark:border-emerald-400/20 px-3 py-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-[12.5px] flex-1 text-foreground/90">
              {t("components.tiffin_feedback_panel.logged_today")} <span className="font-bold">{todayEntry.mealTitle}</span> — {STATUS_EMOJI[todayEntry.status]} {STATUS_LABEL[todayEntry.status]}
            </p>
            <button onClick={undoToday} className="text-[11px] text-muted-foreground hover:text-rose-600 inline-flex items-center gap-1" data-testid="tiffin-undo">
              <Trash2 className="h-3 w-3" /> {t("components.tiffin_feedback_panel.undo")}
            </button>
          </div> : pickableMeals.length === 0 ? <p className="text-[12px] text-muted-foreground italic">{t("components.tiffin_feedback_panel.suggestions_are_loading_pick_what_you_packed_once_they_appea")}</p> : <>
            <p className="text-[12.5px] text-foreground mb-2">{t("components.tiffin_feedback_panel.how_was_today_s_tiffin")}</p>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <select value={pickedMealId} onChange={e => setPickedMealId(e.target.value)} className="flex-1 h-8 text-[12px] rounded-lg border border-border bg-white dark:bg-slate-900/40 px-2 focus:outline-none focus:border-rose-400" data-testid="tiffin-meal-picker">
                {pickableMeals.map(m => <option key={m.id} value={m.id}>{m.emoji ? `${m.emoji} ` : ""}{m.title}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-1.5">
                {(["eaten", "half", "not_eaten"] as TiffinStatus[]).map(s => <button key={s} onClick={() => submit(s)} className={`text-[11px] font-bold px-2 py-1.5 rounded-lg border transition-all ${s === "eaten" ? "border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-200" : s === "half" ? "border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-700 dark:text-amber-200" : "border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-700 dark:text-rose-200"}`} data-testid={`tiffin-status-${s}`}>
                    {STATUS_EMOJI[s]} {STATUS_LABEL[s]}
                  </button>)}
              </div>
            </div>
          </>}

        {/* Amy hint */}
        {amyHint && <div className="flex items-start gap-2 mt-3 p-2 rounded-lg bg-violet-50/80 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-400/20">
            <AmyIcon size={14} />
            <p className="text-[11.5px] leading-snug text-foreground/90">{amyHint}</p>
          </div>}

        {/* Top liked */}
        {summary.topLiked.length > 0 && <div className="mt-3">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 inline-flex items-center gap-1">
              <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> {t("components.tiffin_feedback_panel.top_liked_foods")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {summary.topLiked.map(m => <span key={m.mealId} className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-200 border border-rose-200/70 dark:border-rose-400/30" title={`${m.eaten} eaten · ${m.half} half · ${m.notEaten} refused`}>
                  {m.emoji ?? "🍱"} {m.mealTitle}
                  <span className="text-rose-400/80 font-medium">×{m.eaten}</span>
                </span>)}
            </div>
          </div>}
      </div>
    </div>;
}