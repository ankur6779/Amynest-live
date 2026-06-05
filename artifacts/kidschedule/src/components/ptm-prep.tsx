import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  MAX_HISTORY,
  STAGE_LABELS,
  STORAGE_KEY_DRAFT,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_REMINDERS,
  activeReminders,
  addCustomQuestion,
  addManualAction,
  archiveSession,
  buildAmyHint,
  buildRemindersFromSession,
  createSession,
  deleteFromHistory,
  formatPtmSummaryText,
  mergeAmyActionsIntoSession,
  mergeAmyQuestionsIntoSession,
  progressVsPrevious,
  removeAction,
  removeQuestion,
  resolveAgeBand,
  sessionStats,
  setMeta,
  setNotes,
  setQuestionResponse,
  setStage,
  suggestActions,
  toggleAction,
  toggleQuestion,
  type PtmCategory,
  type PtmReminder,
  type PtmSession,
  type PtmStage,
} from "@workspace/ptm-prep";
import { AmyIcon } from "@/components/amy-icon";
import { SubItemGate } from "@/components/sub-item-gate";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { usePtmPrepAi } from "@/hooks/use-ptm-prep-ai";
import { usePtmPrepSync } from "@/hooks/use-ptm-prep-sync";
import {
  Bell,
  Calendar,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Target,
  Trash2,
  CheckCircle2,
  Circle,
  History,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface ChildLite {
  id: string;
  name: string;
  age?: number;
}

interface Props {
  child?: ChildLite | null;
}

function loadDraft(): PtmSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DRAFT);
    return raw ? (JSON.parse(raw) as PtmSession) : null;
  } catch {
    return null;
  }
}

function loadHistory(): PtmSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PtmSession[]).slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function loadReminders(): PtmReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_REMINDERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PtmReminder[]) : [];
  } catch {
    return [];
  }
}

const STAGE_ORDER: PtmStage[] = ["prepare", "attend", "act"];

type ConfirmKind = "discard" | "delete_history" | null;

export function PtmPrepAssistant({ child }: Props) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const { persist, ready } = usePtmPrepSync();
  const { generateQuestions, generateActions, loading: aiLoading } = usePtmPrepAi(authFetch);

  const [session, setSession] = useState<PtmSession | null>(() => loadDraft());
  const [history, setHistory] = useState<PtmSession[]>(() => loadHistory());
  const [reminders, setReminders] = useState<PtmReminder[]>(() => loadReminders());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    setSession(loadDraft());
    setHistory(loadHistory());
    setReminders(loadReminders());
  }, [ready]);

  const saveAll = useCallback(
    (draft: PtmSession | null, hist: PtmSession[], rems: PtmReminder[]) => {
      persist(draft, hist, rems);
    },
    [persist],
  );

  useEffect(() => {
    if (!ready) return;
    saveAll(session, history, reminders);
  }, [session, history, reminders, ready, saveAll]);

  useEffect(() => {
    if (!session || !child) return;
    if (session.childId !== child.id || session.childName !== child.name) {
      setSession((s) =>
        s
          ? setMeta(s, {
              childId: child.id,
              childName: child.name,
            })
          : s,
      );
    }
  }, [child?.id, child?.name, session]);

  const draftPreview = useMemo(() => {
    const d = loadDraft();
    if (!d || d.stage === "done") return null;
    const stage = STAGE_LABELS[d.stage]?.title ?? d.stage;
    const selected = d.questions.filter((q) => q.selected).length;
    if (d.stage === "prepare" && selected > 0) {
      return t("components.ptm_prep.resume_with_questions", { count: selected, stage });
    }
    return t("components.ptm_prep.resume_stage", { stage });
  }, [t, session, ready]);

  const stats = useMemo(() => (session ? sessionStats(session) : null), [session]);
  const amyHint = useMemo(() => (session ? buildAmyHint(session.actions) : null), [session]);
  const carry = useMemo(
    () => (session ? progressVsPrevious(session, history) : null),
    [session, history],
  );
  const visibleHistory = useMemo(
    () => (child ? history.filter((h) => (h.childId ?? null) === child.id) : history),
    [history, child],
  );
  const pendingReminders = useMemo(() => {
    const active = activeReminders(reminders);
    return child ? active.filter((r) => (r.childId ?? null) === child.id) : active;
  }, [reminders, child]);

  const previousWeakAreas = useMemo(() => {
    const prev = visibleHistory[0];
    return prev?.notes.weakAreas?.trim() || undefined;
  }, [visibleHistory]);

  const startSession = () => {
    setSession(
      createSession({
        childId: child?.id,
        childName: child?.name,
        childAge: child?.age,
      }),
    );
  };

  const resumeSession = () => {
    const d = loadDraft();
    if (d) setSession(d);
  };

  const completeSession = () => {
    if (!session) return;
    const completed = { ...session, stage: "done" as const, completedAt: Date.now() };
    const nextHistory = archiveSession(history, completed);
    const newReminders = [...buildRemindersFromSession(completed), ...reminders].slice(0, 40);
    setHistory(nextHistory);
    setReminders(newReminders);
    setSession(null);
    maybeNotifyReminders(newReminders, child?.name);
  };

  const shareSession = async (s: PtmSession) => {
    const text = formatPtmSummaryText(s);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: t("components.ptm_prep.share_title"),
          text,
        });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareToast(t("components.ptm_prep.copied_to_clipboard"));
      setTimeout(() => setShareToast(null), 2500);
    } catch {
      /* user cancelled share */
    }
  };

  const dismissReminder = (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, dismissedAt: today } : r)),
    );
  };

  const runConfirm = () => {
    if (confirmKind === "discard") {
      setSession(null);
    } else if (confirmKind === "delete_history" && confirmTargetId) {
      setHistory((h) => deleteFromHistory(h, confirmTargetId));
    }
    setConfirmKind(null);
    setConfirmTargetId(null);
  };

  if (!session) {
    return (
      <div className="px-4 pb-4 space-y-3">
        {shareToast && (
          <div className="rounded-lg bg-muted px-3 py-2 text-[12px] text-foreground">{shareToast}</div>
        )}
        {pendingReminders.length > 0 && (
          <ReminderBanner
            reminders={pendingReminders.slice(0, 2)}
            onDismiss={dismissReminder}
          />
        )}
        <div className="rounded-2xl bg-gradient-to-br from-muted via-white to-muted dark:from-card dark:via-muted dark:to-card border border-border dark:border-border p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted dark:bg-card flex items-center justify-center text-xl shrink-0">
              🧾
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-quicksand font-bold text-sm text-foreground">
                {t("components.ptm_prep.ptm_prep_assistant")}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                {t("components.ptm_prep.a_simple_prepare_attend_act_flow_for_your_child_s_next_paren")}
              </p>
              {child?.age != null && (
                <p className="text-[11px] text-primary mt-1">
                  {t(`components.ptm_prep.age_band_${resolveAgeBand(child.age)}`)}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {draftPreview && (
              <SubItemGate sectionId="hub_ptm_prep" subItemId="start_ptm" className="block">
                <button
                  onClick={resumeSession}
                  className="w-full h-10 rounded-xl border-2 border-primary bg-primary/10 text-primary font-bold text-[13px] inline-flex items-center justify-center gap-2"
                  data-testid="ptm-resume"
                >
                  <ArrowRight className="h-4 w-4" /> {draftPreview}
                </button>
              </SubItemGate>
            )}
            <SubItemGate sectionId="hub_ptm_prep" subItemId="start_ptm" className="block">
              <button
                onClick={startSession}
                className="w-full h-10 rounded-xl bg-primary hover:bg-primary text-white font-bold text-[13px] inline-flex items-center justify-center gap-2"
                data-testid="ptm-start"
              >
                <Sparkles className="h-4 w-4" />{" "}
                {draftPreview
                  ? t("components.ptm_prep.start_fresh_ptm")
                  : t("components.ptm_prep.start_a_ptm_prep")}
              </button>
            </SubItemGate>
          </div>
        </div>
        <HistoryBlock
          history={visibleHistory}
          open={historyOpen}
          setOpen={setHistoryOpen}
          expandedId={expandedHistoryId}
          setExpandedId={setExpandedHistoryId}
          onDelete={(id) => {
            setConfirmKind("delete_history");
            setConfirmTargetId(id);
          }}
          onShare={shareSession}
        />
        <ConfirmSheet
          open={confirmKind === "delete_history"}
          title={t("components.ptm_prep.confirm_delete_title")}
          description={t("components.ptm_prep.confirm_delete_desc")}
          confirmLabel={t("components.ptm_prep.confirm_delete_btn")}
          onConfirm={runConfirm}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmKind(null);
              setConfirmTargetId(null);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {shareToast && (
        <div className="rounded-lg bg-muted px-3 py-2 text-[12px] text-foreground">{shareToast}</div>
      )}
      {pendingReminders.length > 0 && (
        <ReminderBanner reminders={pendingReminders.slice(0, 2)} onDismiss={dismissReminder} />
      )}

      <div className="rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-border p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("components.ptm_prep.ptm")} {session.date}
          </p>
          <button
            onClick={() => setConfirmKind("discard")}
            className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            data-testid="ptm-discard"
          >
            <Trash2 className="h-3 w-3" /> {t("components.ptm_prep.discard")}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {STAGE_ORDER.map((s, i) => {
            const active = session.stage === s;
            const done = STAGE_ORDER.indexOf(session.stage) > i;
            return (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <button
                  onClick={() => setSession((cur) => (cur ? setStage(cur, s) : cur))}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${active ? "bg-primary text-white border-primary shadow-sm" : done ? "bg-muted dark:bg-card text-primary dark:text-muted-foreground border-border dark:border-border" : "bg-white dark:bg-card text-muted-foreground border-border hover:border-border"}`}
                  data-testid={`ptm-stage-${s}`}
                >
                  {STAGE_LABELS[s].emoji} {STAGE_LABELS[s].title}
                </button>
                {i < STAGE_ORDER.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </div>
            );
          })}
        </div>
        {stats && (
          <div className="flex items-center gap-3 mt-2.5 text-[10.5px] text-muted-foreground">
            <span>
              📋 {stats.selected} {t("components.ptm_prep.prepared")}
            </span>
            <span>
              ✍️ {stats.asked} {t("components.ptm_prep.asked")}
            </span>
            <span>
              🎯 {stats.doneActions}/{stats.totalActions} {t("components.ptm_prep.actions")}
            </span>
          </div>
        )}
      </div>

      {carry && carry.carriedOver.length > 0 && (
        <div className="rounded-xl bg-muted dark:bg-card border border-border dark:border-border px-3 py-2 text-[12px] text-primary dark:text-muted-foreground">
          <span className="font-bold">
            {t("components.ptm_prep.last_ptm")}
            {carry.prevDate}):
          </span>{" "}
          {carry.prevDoneCount}/{carry.prevTotal} {t("components.ptm_prep.actions_done")}{" "}
          {carry.carriedOver.length} {t("components.ptm_prep.item_s_still_pending_keep_going")}
        </div>
      )}

      {session.stage === "prepare" && (
        <PrepareStage
          session={session}
          setSession={setSession}
          onAmyQuestions={async () => {
            const result = await generateQuestions({
              childAge: child?.age,
              childName: child?.name,
              teacherName: session.teacherName,
              className: session.className,
              previousWeakAreas,
            });
            setSession((s) => (s ? mergeAmyQuestionsIntoSession(s, result) : s));
          }}
          amyLoading={aiLoading === "questions"}
        />
      )}
      {session.stage === "attend" && <AttendStage session={session} setSession={setSession} />}
      {session.stage === "act" && (
        <ActStage
          session={session}
          setSession={setSession}
          amyHint={amyHint}
          onComplete={completeSession}
          onShare={() => shareSession(session)}
          onAmyActions={async () => {
            const result = await generateActions({
              childAge: child?.age,
              childName: child?.name,
              notes: session.notes,
            });
            setSession((s) => (s ? mergeAmyActionsIntoSession(s, result) : s));
          }}
          amyLoading={aiLoading === "actions"}
        />
      )}

      <HistoryBlock
        history={visibleHistory}
        open={historyOpen}
        setOpen={setHistoryOpen}
        expandedId={expandedHistoryId}
        setExpandedId={setExpandedHistoryId}
        onDelete={(id) => {
          setConfirmKind("delete_history");
          setConfirmTargetId(id);
        }}
        onShare={shareSession}
      />

      <ConfirmSheet
        open={confirmKind !== null}
        title={
          confirmKind === "discard"
            ? t("components.ptm_prep.confirm_discard_title")
            : t("components.ptm_prep.confirm_delete_title")
        }
        description={
          confirmKind === "discard"
            ? t("components.ptm_prep.confirm_discard_desc")
            : t("components.ptm_prep.confirm_delete_desc")
        }
        confirmLabel={
          confirmKind === "discard"
            ? t("components.ptm_prep.confirm_discard_btn")
            : t("components.ptm_prep.confirm_delete_btn")
        }
        onConfirm={runConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmKind(null);
            setConfirmTargetId(null);
          }
        }}
      />
    </div>
  );
}

function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetFooter className="flex-row gap-2 sm:justify-stretch mt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-xl border border-border font-bold text-[13px]"
          >
            {t("components.ptm_prep.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="flex-1 h-10 rounded-xl bg-primary text-white font-bold text-[13px]"
          >
            {confirmLabel}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ReminderBanner({
  reminders,
  onDismiss,
}: {
  reminders: PtmReminder[];
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 space-y-1.5">
      <p className="text-[12px] font-bold inline-flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
        <Bell className="h-3.5 w-3.5" /> {t("components.ptm_prep.reminder_banner_title")}
      </p>
      {reminders.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-2">
          <p className="text-[11.5px] text-amber-900/90 dark:text-amber-100/90 leading-snug flex-1">
            {r.actionText}
          </p>
          <button
            type="button"
            onClick={() => onDismiss(r.id)}
            className="text-[10.5px] font-bold text-amber-800 dark:text-amber-300 shrink-0"
          >
            {t("components.ptm_prep.reminder_dismiss")}
          </button>
        </div>
      ))}
    </div>
  );
}

function PrepareStage({
  session,
  setSession,
  onAmyQuestions,
  amyLoading,
}: {
  session: PtmSession;
  setSession: (u: (s: PtmSession | null) => PtmSession | null) => void;
  onAmyQuestions: () => Promise<void>;
  amyLoading: boolean;
}) {
  const { t } = useTranslation();
  const [customText, setCustomText] = useState("");
  const grouped = useMemo(() => {
    const cats: PtmCategory[] = ["academic", "behavior", "social", "custom"];
    return cats.map((c) => ({
      cat: c,
      items: session.questions.filter((q) => q.category === c),
    }));
  }, [session.questions]);

  const submit = () => {
    if (!customText.trim()) return;
    setSession((s) => (s ? addCustomQuestion(s, customText) : s));
    setCustomText("");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={session.teacherName ?? ""}
            onChange={(e) =>
              setSession((s) =>
                s ? setMeta(s, { teacherName: e.target.value.slice(0, 60) }) : s,
              )
            }
            placeholder={t("components.ptm_prep.teacher_s_name")}
            className="h-9 px-2.5 rounded-lg border border-border bg-white dark:bg-card text-[12.5px] focus:outline-none focus:border-border"
            data-testid="ptm-teacher"
          />
          <input
            value={session.className ?? ""}
            onChange={(e) =>
              setSession((s) =>
                s ? setMeta(s, { className: e.target.value.slice(0, 30) }) : s,
              )
            }
            placeholder={t("components.ptm_prep.class_grade")}
            className="h-9 px-2.5 rounded-lg border border-border bg-white dark:bg-card text-[12.5px] focus:outline-none focus:border-border"
            data-testid="ptm-class"
          />
        </div>
        <label className="block text-[11px] font-bold text-muted-foreground">
          {t("components.ptm_prep.ptm_date")}
        </label>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="date"
            value={session.date}
            onChange={(e) =>
              setSession((s) => (s ? setMeta(s, { date: e.target.value }) : s))
            }
            className="w-full h-9 pl-8 pr-2.5 rounded-lg border border-border bg-white dark:bg-card text-[12.5px] focus:outline-none focus:border-border"
            data-testid="ptm-date"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void onAmyQuestions()}
        disabled={amyLoading}
        className="w-full h-9 rounded-xl border border-primary/30 bg-primary/5 text-primary font-bold text-[12.5px] inline-flex items-center justify-center gap-2 disabled:opacity-60"
        data-testid="ptm-amy-questions"
      >
        <AmyIcon size={14} />{" "}
        {amyLoading
          ? t("components.ptm_prep.amy_thinking")
          : t("components.ptm_prep.amy_suggest_questions")}
      </button>

      {grouped.map(({ cat, items }) => (
        <div
          key={cat}
          className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3"
        >
          <p className="text-[12px] font-bold mb-2 text-foreground inline-flex items-center gap-1.5">
            <span>{CATEGORY_LABELS[cat].emoji}</span> {CATEGORY_LABELS[cat].title}
            <span className="ml-1 text-[10.5px] font-medium text-muted-foreground">
              ({items.filter((q) => q.selected).length}/{items.length})
            </span>
          </p>
          {items.length === 0 ? (
            <p className="text-[11.5px] italic text-muted-foreground">
              {t("components.ptm_prep.no_questions_yet")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((q) => (
                <li key={q.id} className="flex items-start gap-2 group">
                  <button
                    onClick={() =>
                      setSession((s) => (s ? toggleQuestion(s, q.id, "selected") : s))
                    }
                    className="mt-0.5 shrink-0"
                    aria-label={q.selected ? "Deselect" : "Select"}
                    data-testid={`ptm-q-toggle-${q.id}`}
                  >
                    {q.selected ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <p
                    className={`flex-1 text-[12.5px] leading-snug ${q.selected ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {q.text}
                  </p>
                  {q.category === "custom" && (
                    <button
                      onClick={() => setSession((s) => (s ? removeQuestion(s, q.id) : s))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={t("components.ptm_prep.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-primary" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3">
        <p className="text-[12px] font-bold mb-2 inline-flex items-center gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> {t("components.ptm_prep.add_your_own_question")}
        </p>
        <div className="flex gap-2">
          <input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={t("components.ptm_prep.e_g_is_my_child_enjoying_art_class")}
            className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-white dark:bg-card text-[12.5px] focus:outline-none focus:border-border"
            data-testid="ptm-custom-input"
          />
          <button
            onClick={submit}
            className="h-9 px-3 rounded-lg bg-primary hover:bg-primary text-white text-[12.5px] font-bold inline-flex items-center gap-1"
            data-testid="ptm-custom-add"
          >
            <Plus className="h-4 w-4" /> {t("components.ptm_prep.add")}
          </button>
        </div>
      </div>

      <button
        onClick={() => setSession((s) => (s ? setStage(s, "attend") : s))}
        className="w-full h-10 rounded-xl bg-primary hover:bg-primary text-white font-bold text-[13px] inline-flex items-center justify-center gap-2"
        data-testid="ptm-next-attend"
      >
        {t("components.ptm_prep.i_m_ready_start_the_meeting")} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function AttendStage({
  session,
  setSession,
}: {
  session: PtmSession;
  setSession: (u: (s: PtmSession | null) => PtmSession | null) => void;
}) {
  const { t } = useTranslation();
  const selected = session.questions.filter((q) => q.selected);
  const noteFields = [
    ["teacherFeedback", "note_teacher_feedback", "note_teacher_feedback_ph"],
    ["weakAreas", "note_weak_areas", "note_weak_areas_ph"],
    ["suggestions", "note_suggestions", "note_suggestions_ph"],
  ] as const;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3 space-y-2.5">
        <p className="text-[12px] font-bold inline-flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" /> {t("components.ptm_prep.quick_notes")}
        </p>
        {noteFields.map(([k, labelKey, phKey]) => (
          <div key={k}>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              {t(`components.ptm_prep.${labelKey}`)}
            </label>
            <textarea
              value={session.notes[k]}
              onChange={(e) =>
                setSession((s) =>
                  s ? setNotes(s, { [k]: e.target.value.slice(0, 800) }) : s,
                )
              }
              placeholder={t(`components.ptm_prep.${phKey}`)}
              rows={3}
              className="w-full px-2.5 py-2 rounded-lg border border-border bg-white dark:bg-card text-[12.5px] resize-none focus:outline-none focus:border-border"
              data-testid={`ptm-note-${k}`}
            />
          </div>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3">
          <p className="text-[12px] font-bold mb-2">
            {t("components.ptm_prep.tick_off_questions_you_ve_asked")}
          </p>
          <ul className="space-y-2">
            {selected.map((q) => (
              <li key={q.id} className="space-y-1">
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => setSession((s) => (s ? toggleQuestion(s, q.id, "asked") : s))}
                    className="mt-0.5 shrink-0"
                    aria-label={q.asked ? "Mark not asked" : "Mark asked"}
                    data-testid={`ptm-asked-${q.id}`}
                  >
                    {q.asked ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <p
                    className={`flex-1 text-[12.5px] leading-snug ${q.asked ? "text-muted-foreground line-through" : "text-foreground"}`}
                  >
                    {q.text}
                  </p>
                </div>
                {q.asked && (
                  <input
                    value={q.response ?? ""}
                    onChange={(e) =>
                      setSession((s) =>
                        s ? setQuestionResponse(s, q.id, e.target.value.slice(0, 200)) : s,
                      )
                    }
                    placeholder={t("components.ptm_prep.what_did_the_teacher_say")}
                    className="ml-6 w-[calc(100%-1.5rem)] h-8 px-2 rounded-md border border-border bg-white dark:bg-card text-[11.5px] focus:outline-none focus:border-border"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSession((s) => (s ? setStage(s, "prepare") : s))}
          className="h-10 rounded-xl border border-border bg-white dark:bg-card font-bold text-[13px]"
        >
          {t("components.ptm_prep.back")}
        </button>
        <button
          onClick={() =>
            setSession((s) =>
              s
                ? {
                    ...setStage(s, "act"),
                    actions: s.actions.length === 0 ? suggestActions(s.notes) : s.actions,
                  }
                : s,
            )
          }
          className="h-10 rounded-xl bg-primary hover:bg-primary text-white font-bold text-[13px] inline-flex items-center justify-center gap-2"
          data-testid="ptm-next-act"
        >
          {t("components.ptm_prep.build_action_plan")} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ActStage({
  session,
  setSession,
  amyHint,
  onComplete,
  onShare,
  onAmyActions,
  amyLoading,
}: {
  session: PtmSession;
  setSession: (u: (s: PtmSession | null) => PtmSession | null) => void;
  amyHint: string | null;
  onComplete: () => void;
  onShare: () => void;
  onAmyActions: () => Promise<void>;
  amyLoading: boolean;
}) {
  const { t } = useTranslation();
  const [manualText, setManualText] = useState("");

  const regenerate = () => {
    setSession((s) => {
      if (!s) return s;
      const fresh = suggestActions(s.notes);
      const doneByText = new Map(
        s.actions.filter((a) => a.done).map((a) => [a.text.toLowerCase(), true]),
      );
      return {
        ...s,
        actions: fresh.map((a) =>
          doneByText.has(a.text.toLowerCase()) ? { ...a, done: true } : a,
        ),
      };
    });
  };

  const addManual = () => {
    if (!manualText.trim()) return;
    setSession((s) =>
      s ? { ...s, actions: addManualAction(s.actions, manualText) } : s,
    );
    setManualText("");
  };

  return (
    <div className="space-y-3">
      {amyHint && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted dark:bg-card border border-border dark:border-border">
          <AmyIcon size={16} bounce />
          <p className="text-[12px] leading-snug text-foreground/90">{amyHint}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="text-[12px] font-bold inline-flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> {t("components.ptm_prep.action_plan")}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void onAmyActions()}
              disabled={amyLoading}
              className="text-[10.5px] text-primary hover:text-primary font-bold disabled:opacity-60"
              data-testid="ptm-amy-actions"
            >
              {amyLoading ? "…" : t("components.ptm_prep.amy_refine_actions")}
            </button>
            <button
              onClick={regenerate}
              className="text-[10.5px] text-primary hover:text-primary font-bold"
              data-testid="ptm-regen"
            >
              {t("components.ptm_prep.re_generate_from_notes")}
            </button>
          </div>
        </div>
        {session.actions.length === 0 ? (
          <p className="text-[11.5px] italic text-muted-foreground">
            {t("components.ptm_prep.add_notes_in_the_attend_step_then_come_back_here_amy_will_pu")}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {session.actions.map((a) => (
              <li key={a.id} className="flex items-start gap-2 group">
                <button
                  onClick={() =>
                    setSession((s) =>
                      s ? { ...s, actions: toggleAction(s.actions, a.id) } : s,
                    )
                  }
                  className="mt-0.5 shrink-0"
                  aria-label={a.done ? "Mark not done" : "Mark done"}
                  data-testid={`ptm-action-toggle-${a.id}`}
                >
                  {a.done ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <p
                  className={`flex-1 text-[12.5px] leading-snug ${a.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                >
                  {a.text}
                </p>
                <button
                  onClick={() =>
                    setSession((s) =>
                      s ? { ...s, actions: removeAction(s.actions, a.id) } : s,
                    )
                  }
                  className="opacity-0 group-hover:opacity-100"
                  aria-label={t("components.ptm_prep.delete_2")}
                >
                  <Trash2 className="h-3.5 w-3.5 text-primary" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addManual()}
            placeholder={t("components.ptm_prep.e_g_daily_10_min_handwriting_practice")}
            className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-white dark:bg-card text-[12.5px] focus:outline-none focus:border-border"
            data-testid="ptm-action-input"
          />
          <button
            data-on-dark
            onClick={addManual}
            className="h-9 px-3 rounded-lg bg-card hover:bg-card text-white text-[12.5px] font-bold inline-flex items-center gap-1"
            data-testid="ptm-action-add"
          >
            <Plus className="h-4 w-4" /> {t("components.ptm_prep.add_2")}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void onShare()}
        className="w-full h-9 rounded-xl border border-border font-bold text-[12.5px] inline-flex items-center justify-center gap-2"
        data-testid="ptm-share"
      >
        <Share2 className="h-4 w-4" /> {t("components.ptm_prep.share_summary")}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSession((s) => (s ? setStage(s, "attend") : s))}
          className="h-10 rounded-xl border border-border bg-white dark:bg-card font-bold text-[13px]"
        >
          {t("components.ptm_prep.back_2")}
        </button>
        <button
          onClick={onComplete}
          className="h-10 rounded-xl bg-primary hover:bg-primary text-white font-bold text-[13px] inline-flex items-center justify-center gap-2"
          data-testid="ptm-complete"
        >
          {t("components.ptm_prep.save_finish")} <CheckCircle2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function HistoryBlock({
  history,
  open,
  setOpen,
  expandedId,
  setExpandedId,
  onDelete,
  onShare,
}: {
  history: PtmSession[];
  open: boolean;
  setOpen: (v: boolean) => void;
  expandedId: string | null;
  setExpandedId: (v: string | null) => void;
  onDelete: (id: string) => void;
  onShare: (s: PtmSession) => void;
}) {
  const { t } = useTranslation();
  if (history.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-left"
      >
        <span className="text-[12px] font-bold inline-flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> {t("components.ptm_prep.past_ptms")}
          {history.length})
        </span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {history.map((s) => {
            const stats = sessionStats(s);
            const isOpen = expandedId === s.id;
            return (
              <div key={s.id} className="rounded-lg border border-border bg-white/80 dark:bg-card">
                <button
                  onClick={() => setExpandedId(isOpen ? null : s.id)}
                  className="w-full px-2.5 py-2 flex items-center justify-between text-left"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-foreground">
                      {s.date}
                      {s.teacherName ? ` · ${s.teacherName}` : ""}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">
                      ✍️ {stats.asked} {t("components.ptm_prep.asked_2")} {stats.doneActions}/
                      {stats.totalActions} {t("components.ptm_prep.actions_done_2")}
                    </p>
                  </div>
                  <ChevronRight
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/60 pt-2">
                    {s.notes.teacherFeedback && (
                      <div>
                        <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                          {t("components.ptm_prep.feedback")}
                        </p>
                        <p className="text-[12px] whitespace-pre-wrap">{s.notes.teacherFeedback}</p>
                      </div>
                    )}
                    {s.notes.weakAreas && (
                      <div>
                        <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                          {t("components.ptm_prep.weak_areas")}
                        </p>
                        <p className="text-[12px] whitespace-pre-wrap">{s.notes.weakAreas}</p>
                      </div>
                    )}
                    {s.notes.suggestions && (
                      <div>
                        <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                          {t("components.ptm_prep.suggestions")}
                        </p>
                        <p className="text-[12px] whitespace-pre-wrap">{s.notes.suggestions}</p>
                      </div>
                    )}
                    {s.actions.length > 0 && (
                      <div>
                        <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                          {t("components.ptm_prep.actions_2")}
                        </p>
                        <ul className="text-[12px] space-y-0.5">
                          {s.actions.map((a) => (
                            <li
                              key={a.id}
                              className={a.done ? "line-through text-muted-foreground" : ""}
                            >
                              {a.done ? "✅" : "▫️"} {a.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void onShare(s)}
                        className="text-[11px] text-primary inline-flex items-center gap-1"
                      >
                        <Share2 className="h-3 w-3" /> {t("components.ptm_prep.share_summary")}
                      </button>
                      <button
                        onClick={() => onDelete(s.id)}
                        className="text-[11px] text-primary inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> {t("components.ptm_prep.delete_3")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function maybeNotifyReminders(reminders: PtmReminder[], childName?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  const due = activeReminders(reminders);
  if (due.length === 0) return;
  const show = () => {
    const first = due[0];
    if (!first) return;
    try {
      new Notification("PTM follow-up", {
        body: `${childName ? `${childName}: ` : ""}${first.actionText}`,
        tag: `ptm-reminder-${first.id}`,
      });
    } catch {
      /* permission denied */
    }
  };
  if (Notification.permission === "granted") {
    show();
  } else if (Notification.permission !== "denied") {
    void Notification.requestPermission().then((p) => {
      if (p === "granted") show();
    });
  }
}
