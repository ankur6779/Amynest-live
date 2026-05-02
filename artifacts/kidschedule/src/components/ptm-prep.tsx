import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABELS, DEFAULT_QUESTIONS, MAX_HISTORY,
  STAGE_LABELS, STORAGE_KEY_DRAFT, STORAGE_KEY_HISTORY,
  addCustomQuestion, addManualAction, archiveSession,
  buildAmyHint, createSession, deleteFromHistory, progressVsPrevious,
  removeAction, removeQuestion, sessionStats, setMeta, setNotes,
  setQuestionResponse, setStage, suggestActions, toggleAction, toggleQuestion,
  type PtmCategory, type PtmSession, type PtmStage,
} from "@workspace/ptm-prep";
import { AmyIcon } from "@/components/amy-icon";
import {
  ChevronRight, ClipboardList, Pencil, Plus, Sparkles, Target, Trash2,
  CheckCircle2, Circle, History, ArrowRight,
} from "lucide-react";

interface ChildLite { id: string; name: string; age?: number; }
interface Props { child?: ChildLite | null; }

function loadDraft(): PtmSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DRAFT);
    return raw ? (JSON.parse(raw) as PtmSession) : null;
  } catch { return null; }
}
function saveDraft(s: PtmSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (s) window.localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(s));
    else window.localStorage.removeItem(STORAGE_KEY_DRAFT);
  } catch {}
}
function loadHistory(): PtmSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PtmSession[]).slice(0, MAX_HISTORY) : [];
  } catch { return []; }
}
function saveHistory(h: PtmSession[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(h)); } catch {}
}

const STAGE_ORDER: PtmStage[] = ["prepare", "attend", "act"];

export function PtmPrepAssistant({ child }: Props) {
  const [session, setSession] = useState<PtmSession | null>(() => loadDraft());
  const [history, setHistory] = useState<PtmSession[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Persist on every change
  useEffect(() => { saveDraft(session); }, [session]);

  // Keep child meta in sync if a session is active and the parent switches kids
  useEffect(() => {
    if (!session || !child) return;
    if (session.childId !== child.id || session.childName !== child.name) {
      setSession((s) => (s ? setMeta(s, { childId: child.id, childName: child.name }) : s));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id, child?.name]);

  const stats = useMemo(() => session ? sessionStats(session) : null, [session]);
  const amyHint = useMemo(() => session ? buildAmyHint(session.actions) : null, [session]);
  const carry = useMemo(() => session ? progressVsPrevious(session, history) : null, [session, history]);
  // Show only the active child's prior PTMs so siblings never bleed into the
  // current child's history view.
  const visibleHistory = useMemo(
    () => (child ? history.filter((h) => (h.childId ?? null) === child.id) : history),
    [history, child],
  );

  const startSession = () => {
    const s = createSession({ childId: child?.id, childName: child?.name });
    setSession(s);
  };

  const completeSession = () => {
    if (!session) return;
    const next = archiveSession(history, session);
    setHistory(next);
    saveHistory(next);
    setSession(null);
  };

  // ── No session yet — landing card ────────────────────────────────────────
  if (!session) {
    return (
      <div className="px-4 pb-4 space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-white to-pink-50/60 dark:from-violet-500/10 dark:via-slate-900/30 dark:to-pink-500/10 border border-violet-100 dark:border-violet-400/20 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-xl shrink-0">🧾</div>
            <div className="min-w-0 flex-1">
              <p className="font-quicksand font-bold text-sm text-foreground">PTM Prep Assistant</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                A simple Prepare → Attend → Act flow for your child's next Parent-Teacher Meeting.
              </p>
            </div>
          </div>
          <button
            onClick={startSession}
            className="mt-3 w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[13px] inline-flex items-center justify-center gap-2"
            data-testid="ptm-start"
          >
            <Sparkles className="h-4 w-4" /> Start a PTM Prep
          </button>
        </div>
        <HistoryBlock
          history={visibleHistory} open={historyOpen} setOpen={setHistoryOpen}
          expandedId={expandedHistoryId} setExpandedId={setExpandedHistoryId}
          onDelete={(id) => { const next = deleteFromHistory(history, id); setHistory(next); saveHistory(next); }}
        />
      </div>
    );
  }

  // ── Active session ───────────────────────────────────────────────────────
  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Stage header / stepper */}
      <div className="rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-border p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">PTM · {session.date}</p>
          <button
            onClick={() => { if (confirm("Discard this PTM draft?")) { setSession(null); }}}
            className="text-[11px] text-muted-foreground hover:text-rose-600 inline-flex items-center gap-1"
            data-testid="ptm-discard"
          >
            <Trash2 className="h-3 w-3" /> Discard
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {STAGE_ORDER.map((s, i) => {
            const active = session.stage === s;
            const done = STAGE_ORDER.indexOf(session.stage) > i;
            return (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <button
                  onClick={() => setSession((cur) => cur ? setStage(cur, s) : cur)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${
                    active ? "bg-violet-600 text-white border-violet-600 shadow-sm" :
                    done ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-400/30" :
                    "bg-white dark:bg-slate-900/40 text-muted-foreground border-border hover:border-violet-300"
                  }`}
                  data-testid={`ptm-stage-${s}`}
                >
                  {STAGE_LABELS[s].emoji} {STAGE_LABELS[s].title}
                </button>
                {i < STAGE_ORDER.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>
        {stats && (
          <div className="flex items-center gap-3 mt-2.5 text-[10.5px] text-muted-foreground">
            <span>📋 {stats.selected} prepared</span>
            <span>✍️ {stats.asked} asked</span>
            <span>🎯 {stats.doneActions}/{stats.totalActions} actions</span>
          </div>
        )}
      </div>

      {/* Carry-over hint */}
      {carry && carry.carriedOver.length > 0 && (
        <div className="rounded-xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-100">
          <span className="font-bold">Last PTM ({carry.prevDate}):</span> {carry.prevDoneCount}/{carry.prevTotal} actions done. {carry.carriedOver.length} item(s) still pending — keep going!
        </div>
      )}

      {/* Stage content */}
      {session.stage === "prepare" && (
        <PrepareStage session={session} setSession={setSession} />
      )}
      {session.stage === "attend" && (
        <AttendStage session={session} setSession={setSession} />
      )}
      {session.stage === "act" && (
        <ActStage
          session={session} setSession={setSession}
          amyHint={amyHint} onComplete={completeSession}
        />
      )}

      <HistoryBlock
        history={visibleHistory} open={historyOpen} setOpen={setHistoryOpen}
        expandedId={expandedHistoryId} setExpandedId={setExpandedHistoryId}
        onDelete={(id) => { const next = deleteFromHistory(history, id); setHistory(next); saveHistory(next); }}
      />
    </div>
  );
}

// ─── Stage 1 — Prepare ──────────────────────────────────────────────────────
function PrepareStage({
  session, setSession,
}: { session: PtmSession; setSession: (u: (s: PtmSession | null) => PtmSession | null) => void }) {
  const [customText, setCustomText] = useState("");
  const grouped = useMemo(() => {
    const cats: PtmCategory[] = ["academic", "behavior", "social", "custom"];
    return cats.map((c) => ({ cat: c, items: session.questions.filter((q) => q.category === c) }));
  }, [session.questions]);

  const submit = () => {
    if (!customText.trim()) return;
    setSession((s) => s ? addCustomQuestion(s, customText) : s);
    setCustomText("");
  };

  return (
    <div className="space-y-3">
      {/* Meta */}
      <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={session.teacherName ?? ""}
            onChange={(e) => setSession((s) => s ? setMeta(s, { teacherName: e.target.value.slice(0, 60) }) : s)}
            placeholder="Teacher's name"
            className="h-9 px-2.5 rounded-lg border border-border bg-white dark:bg-slate-900/40 text-[12.5px] focus:outline-none focus:border-violet-400"
            data-testid="ptm-teacher"
          />
          <input
            value={session.className ?? ""}
            onChange={(e) => setSession((s) => s ? setMeta(s, { className: e.target.value.slice(0, 30) }) : s)}
            placeholder="Class / grade"
            className="h-9 px-2.5 rounded-lg border border-border bg-white dark:bg-slate-900/40 text-[12.5px] focus:outline-none focus:border-violet-400"
            data-testid="ptm-class"
          />
        </div>
      </div>

      {/* Question groups */}
      {grouped.map(({ cat, items }) => (
        <div key={cat} className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3">
          <p className="text-[12px] font-bold mb-2 text-foreground inline-flex items-center gap-1.5">
            <span>{CATEGORY_LABELS[cat].emoji}</span> {CATEGORY_LABELS[cat].title}
            <span className="ml-1 text-[10.5px] font-medium text-muted-foreground">
              ({items.filter((q) => q.selected).length}/{items.length})
            </span>
          </p>
          {items.length === 0 ? (
            <p className="text-[11.5px] italic text-muted-foreground">No questions yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((q) => (
                <li key={q.id} className="flex items-start gap-2 group">
                  <button
                    onClick={() => setSession((s) => s ? toggleQuestion(s, q.id, "selected") : s)}
                    className="mt-0.5 shrink-0"
                    aria-label={q.selected ? "Deselect" : "Select"}
                    data-testid={`ptm-q-toggle-${q.id}`}
                  >
                    {q.selected
                      ? <CheckCircle2 className="h-4 w-4 text-violet-600" />
                      : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <p className={`flex-1 text-[12.5px] leading-snug ${q.selected ? "text-foreground" : "text-muted-foreground"}`}>
                    {q.text}
                  </p>
                  {q.category === "custom" && (
                    <button
                      onClick={() => setSession((s) => s ? removeQuestion(s, q.id) : s)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* Custom add */}
      <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3">
        <p className="text-[12px] font-bold mb-2 inline-flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> Add your own question</p>
        <div className="flex gap-2">
          <input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Is my child enjoying art class?"
            className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-white dark:bg-slate-900/40 text-[12.5px] focus:outline-none focus:border-violet-400"
            data-testid="ptm-custom-input"
          />
          <button
            onClick={submit}
            className="h-9 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[12.5px] font-bold inline-flex items-center gap-1"
            data-testid="ptm-custom-add"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <button
        onClick={() => setSession((s) => s ? setStage(s, "attend") : s)}
        className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[13px] inline-flex items-center justify-center gap-2"
        data-testid="ptm-next-attend"
      >
        I'm ready — start the meeting <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Stage 2 — Attend ──────────────────────────────────────────────────────
function AttendStage({
  session, setSession,
}: { session: PtmSession; setSession: (u: (s: PtmSession | null) => PtmSession | null) => void }) {
  const selected = session.questions.filter((q) => q.selected);
  return (
    <div className="space-y-3">
      {/* Notes */}
      <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3 space-y-2.5">
        <p className="text-[12px] font-bold inline-flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Quick notes</p>
        {([
          ["teacherFeedback", "Teacher feedback", "What did the teacher say overall?"],
          ["weakAreas", "Weak areas", "Where does my child struggle?"],
          ["suggestions", "Suggestions", "What did the teacher suggest we try?"],
        ] as const).map(([k, label, ph]) => (
          <div key={k}>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">{label}</label>
            <textarea
              value={session.notes[k]}
              onChange={(e) => setSession((s) => s ? setNotes(s, { [k]: e.target.value.slice(0, 800) }) : s)}
              placeholder={ph}
              rows={3}
              className="w-full px-2.5 py-2 rounded-lg border border-border bg-white dark:bg-slate-900/40 text-[12.5px] resize-none focus:outline-none focus:border-violet-400"
              data-testid={`ptm-note-${k}`}
            />
          </div>
        ))}
      </div>

      {/* Question checklist */}
      {selected.length > 0 && (
        <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3">
          <p className="text-[12px] font-bold mb-2">Tick off questions you've asked</p>
          <ul className="space-y-2">
            {selected.map((q) => (
              <li key={q.id} className="space-y-1">
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => setSession((s) => s ? toggleQuestion(s, q.id, "asked") : s)}
                    className="mt-0.5 shrink-0"
                    aria-label={q.asked ? "Mark not asked" : "Mark asked"}
                    data-testid={`ptm-asked-${q.id}`}
                  >
                    {q.asked
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <p className={`flex-1 text-[12.5px] leading-snug ${q.asked ? "text-muted-foreground line-through" : "text-foreground"}`}>{q.text}</p>
                </div>
                {q.asked && (
                  <input
                    value={q.response ?? ""}
                    onChange={(e) => setSession((s) => s ? setQuestionResponse(s, q.id, e.target.value.slice(0, 200)) : s)}
                    placeholder="What did the teacher say?"
                    className="ml-6 w-[calc(100%-1.5rem)] h-8 px-2 rounded-md border border-border bg-white dark:bg-slate-900/40 text-[11.5px] focus:outline-none focus:border-violet-400"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSession((s) => s ? setStage(s, "prepare") : s)}
          className="h-10 rounded-xl border border-border bg-white dark:bg-slate-900/40 font-bold text-[13px]"
        >
          ← Back
        </button>
        <button
          onClick={() => setSession((s) => s ? { ...setStage(s, "act"), actions: s.actions.length === 0 ? suggestActions(s.notes) : s.actions } : s)}
          className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[13px] inline-flex items-center justify-center gap-2"
          data-testid="ptm-next-act"
        >
          Build action plan <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Stage 3 — Act ─────────────────────────────────────────────────────────
function ActStage({
  session, setSession, amyHint, onComplete,
}: {
  session: PtmSession;
  setSession: (u: (s: PtmSession | null) => PtmSession | null) => void;
  amyHint: string | null;
  onComplete: () => void;
}) {
  const [manualText, setManualText] = useState("");

  const regenerate = () => {
    setSession((s) => {
      if (!s) return s;
      const fresh = suggestActions(s.notes);
      // Preserve done flags for ones whose text matches.
      const doneByText = new Map(s.actions.filter((a) => a.done).map((a) => [a.text.toLowerCase(), true]));
      return { ...s, actions: fresh.map((a) => doneByText.has(a.text.toLowerCase()) ? { ...a, done: true } : a) };
    });
  };

  const addManual = () => {
    if (!manualText.trim()) return;
    setSession((s) => s ? { ...s, actions: addManualAction(s.actions, manualText) } : s);
    setManualText("");
  };

  return (
    <div className="space-y-3">
      {/* Amy hint */}
      {amyHint && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-violet-50/80 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-400/20">
          <AmyIcon size={16} bounce />
          <p className="text-[12px] leading-snug text-foreground/90">{amyHint}</p>
        </div>
      )}

      {/* Action plan */}
      <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-bold inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Action plan</p>
          <button
            onClick={regenerate}
            className="text-[10.5px] text-violet-600 hover:text-violet-700 font-bold"
            data-testid="ptm-regen"
          >
            Re-generate from notes
          </button>
        </div>
        {session.actions.length === 0 ? (
          <p className="text-[11.5px] italic text-muted-foreground">Add notes in the Attend step, then come back here — Amy will pull out action items for you.</p>
        ) : (
          <ul className="space-y-1.5">
            {session.actions.map((a) => (
              <li key={a.id} className="flex items-start gap-2 group">
                <button
                  onClick={() => setSession((s) => s ? { ...s, actions: toggleAction(s.actions, a.id) } : s)}
                  className="mt-0.5 shrink-0"
                  aria-label={a.done ? "Mark not done" : "Mark done"}
                  data-testid={`ptm-action-toggle-${a.id}`}
                >
                  {a.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                </button>
                <p className={`flex-1 text-[12.5px] leading-snug ${a.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{a.text}</p>
                <button
                  onClick={() => setSession((s) => s ? { ...s, actions: removeAction(s.actions, a.id) } : s)}
                  className="opacity-0 group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Manual add */}
        <div className="mt-3 flex gap-2">
          <input
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addManual()}
            placeholder='e.g. "Daily 10 min handwriting practice"'
            className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-white dark:bg-slate-900/40 text-[12.5px] focus:outline-none focus:border-violet-400"
            data-testid="ptm-action-input"
          />
          <button
            data-on-dark
            onClick={addManual}
            className="h-9 px-3 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[12.5px] font-bold inline-flex items-center gap-1"
            data-testid="ptm-action-add"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSession((s) => s ? setStage(s, "attend") : s)}
          className="h-10 rounded-xl border border-border bg-white dark:bg-slate-900/40 font-bold text-[13px]"
        >
          ← Back
        </button>
        <button
          onClick={() => { onComplete(); }}
          className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] inline-flex items-center justify-center gap-2"
          data-testid="ptm-complete"
        >
          Save & finish <CheckCircle2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── History block ─────────────────────────────────────────────────────────
function HistoryBlock({
  history, open, setOpen, expandedId, setExpandedId, onDelete,
}: {
  history: PtmSession[];
  open: boolean; setOpen: (v: boolean) => void;
  expandedId: string | null; setExpandedId: (v: string | null) => void;
  onDelete: (id: string) => void;
}) {
  if (history.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-white/70 dark:bg-white/[0.04] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-left"
      >
        <span className="text-[12px] font-bold inline-flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Past PTMs ({history.length})
        </span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {history.map((s) => {
            const stats = sessionStats(s);
            const isOpen = expandedId === s.id;
            return (
              <div key={s.id} className="rounded-lg border border-border bg-white/80 dark:bg-slate-900/40">
                <button
                  onClick={() => setExpandedId(isOpen ? null : s.id)}
                  className="w-full px-2.5 py-2 flex items-center justify-between text-left"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-foreground">{s.date}{s.teacherName ? ` · ${s.teacherName}` : ""}</p>
                    <p className="text-[10.5px] text-muted-foreground">
                      ✍️ {stats.asked} asked · 🎯 {stats.doneActions}/{stats.totalActions} actions done
                    </p>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/60 pt-2">
                    {s.notes.teacherFeedback && (
                      <div><p className="text-[10.5px] font-bold uppercase text-muted-foreground">Feedback</p><p className="text-[12px] whitespace-pre-wrap">{s.notes.teacherFeedback}</p></div>
                    )}
                    {s.notes.weakAreas && (
                      <div><p className="text-[10.5px] font-bold uppercase text-muted-foreground">Weak areas</p><p className="text-[12px] whitespace-pre-wrap">{s.notes.weakAreas}</p></div>
                    )}
                    {s.notes.suggestions && (
                      <div><p className="text-[10.5px] font-bold uppercase text-muted-foreground">Suggestions</p><p className="text-[12px] whitespace-pre-wrap">{s.notes.suggestions}</p></div>
                    )}
                    {s.actions.length > 0 && (
                      <div>
                        <p className="text-[10.5px] font-bold uppercase text-muted-foreground">Actions</p>
                        <ul className="text-[12px] space-y-0.5">
                          {s.actions.map((a) => (
                            <li key={a.id} className={a.done ? "line-through text-muted-foreground" : ""}>
                              {a.done ? "✅" : "▫️"} {a.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <button
                      onClick={() => { if (confirm("Delete this past PTM?")) onDelete(s.id); }}
                      className="text-[11px] text-rose-600 inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
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
