// ─── PTM Prep Assistant — shared lib ─────────────────────────────────────────
// Helps a parent prepare for a Parent-Teacher Meeting, take notes during it,
// and turn those notes into action steps after — entirely on-device.

export type PtmCategory = "academic" | "behavior" | "social" | "custom";
export type PtmStage = "prepare" | "attend" | "act" | "done";

export interface PtmQuestion {
  id: string;
  category: PtmCategory;
  text: string;
  /** Parent ticked the question to ask in this PTM. */
  selected: boolean;
  /** Parent marked the question as actually asked during the meeting. */
  asked: boolean;
  /** Optional one-line teacher response captured during the meeting. */
  response?: string;
}

export interface PtmNotes {
  teacherFeedback: string;
  weakAreas: string;
  suggestions: string;
}

export interface PtmActionItem {
  id: string;
  text: string;
  done: boolean;
  /** Tag so the UI can show where the action came from. */
  source?: "feedback" | "weak" | "suggestion" | "manual";
}

export interface PtmSession {
  id: string;
  childId?: string;
  childName?: string;
  /** YYYY-MM-DD */
  date: string;
  teacherName?: string;
  className?: string;
  stage: PtmStage;
  questions: PtmQuestion[];
  notes: PtmNotes;
  actions: PtmActionItem[];
  createdAt: number;
  completedAt?: number;
}

export const STAGE_LABELS: Record<PtmStage, { title: string; emoji: string }> = {
  prepare: { title: "Prepare",  emoji: "📋" },
  attend:  { title: "Attend",   emoji: "✍️" },
  act:     { title: "Act",      emoji: "🎯" },
  done:    { title: "Done",     emoji: "✅" },
};

export const CATEGORY_LABELS: Record<PtmCategory, { title: string; emoji: string }> = {
  academic: { title: "Academic",          emoji: "📚" },
  behavior: { title: "Behavior",          emoji: "🧭" },
  social:   { title: "Social Development", emoji: "🤝" },
  custom:   { title: "My Questions",      emoji: "✏️" },
};

// ─── Default question bank ──────────────────────────────────────────────────
export const DEFAULT_QUESTIONS: { category: PtmCategory; text: string }[] = [
  // Academic
  { category: "academic", text: "How is my child performing in core subjects this term?" },
  { category: "academic", text: "Which areas need the most improvement right now?" },
  { category: "academic", text: "How is my child's focus and attention in class?" },
  { category: "academic", text: "Is homework being completed on time and to expectation?" },
  { category: "academic", text: "Are there any subjects where extra help at home would matter most?" },
  // Behavior
  { category: "behavior", text: "How does my child behave in the classroom day-to-day?" },
  { category: "behavior", text: "How do they handle correction or feedback from the teacher?" },
  { category: "behavior", text: "Are there any patterns of distraction or disruption to flag?" },
  { category: "behavior", text: "How well do they follow instructions and classroom routines?" },
  // Social development
  { category: "social", text: "Does my child interact well with peers and join group activities?" },
  { category: "social", text: "Are there friendships you've noticed forming or any conflicts?" },
  { category: "social", text: "Is my child confident speaking up or asking for help in class?" },
  { category: "social", text: "How does my child cope with losing a game or making a mistake?" },
];

// ─── Storage keys (callers persist with localStorage / AsyncStorage) ────────
export const STORAGE_KEY_DRAFT = "amynest.ptm_prep.draft.v1";
export const STORAGE_KEY_HISTORY = "amynest.ptm_prep.history.v1";
export const MAX_HISTORY = 12;

// ─── Helpers ────────────────────────────────────────────────────────────────
function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createSession(input: {
  childId?: string;
  childName?: string;
  date?: string;
} = {}): PtmSession {
  return {
    id: rid("ptm"),
    childId: input.childId,
    childName: input.childName,
    date: input.date ?? todayKey(),
    stage: "prepare",
    questions: DEFAULT_QUESTIONS.map((q) => ({
      id: rid("q"),
      category: q.category,
      text: q.text,
      selected: q.category === "academic",
      asked: false,
    })),
    notes: { teacherFeedback: "", weakAreas: "", suggestions: "" },
    actions: [],
    createdAt: Date.now(),
  };
}

export function addCustomQuestion(session: PtmSession, text: string): PtmSession {
  const trimmed = text.trim();
  if (!trimmed) return session;
  return {
    ...session,
    questions: [
      ...session.questions,
      {
        id: rid("q"),
        category: "custom",
        text: trimmed.slice(0, 200),
        selected: true,
        asked: false,
      },
    ],
  };
}

export function removeQuestion(session: PtmSession, questionId: string): PtmSession {
  return { ...session, questions: session.questions.filter((q) => q.id !== questionId) };
}

export function toggleQuestion(
  session: PtmSession,
  questionId: string,
  field: "selected" | "asked",
): PtmSession {
  return {
    ...session,
    questions: session.questions.map((q) =>
      q.id === questionId ? { ...q, [field]: !q[field] } : q,
    ),
  };
}

export function setQuestionResponse(
  session: PtmSession,
  questionId: string,
  response: string,
): PtmSession {
  return {
    ...session,
    questions: session.questions.map((q) =>
      q.id === questionId ? { ...q, response } : q,
    ),
  };
}

export function setNotes(session: PtmSession, patch: Partial<PtmNotes>): PtmSession {
  return { ...session, notes: { ...session.notes, ...patch } };
}

export function setStage(session: PtmSession, stage: PtmStage): PtmSession {
  return { ...session, stage };
}

export function setMeta(
  session: PtmSession,
  patch: Partial<Pick<PtmSession, "childId" | "childName" | "teacherName" | "className" | "date">>,
): PtmSession {
  return { ...session, ...patch };
}

// ─── Action plan generation ────────────────────────────────────────────────
/**
 * Turn free-form notes into bite-sized action steps. Splits each note field
 * into clauses and keeps the meaningful ones (8+ chars), so a parent can
 * skim and tick them off later.
 */
export function suggestActions(notes: PtmNotes): PtmActionItem[] {
  const out: PtmActionItem[] = [];
  const seen = new Set<string>();
  const sources: { src: PtmActionItem["source"]; text: string }[] = [
    { src: "weak", text: notes.weakAreas },
    { src: "suggestion", text: notes.suggestions },
    { src: "feedback", text: notes.teacherFeedback },
  ];
  // Sentence-boundary splitter without regex lookbehind. The original used
  // `(?<=[.!?])\s+` to split AFTER sentence-ending punctuation, but that
  // assertion is a parse-time SyntaxError on Safari < 16.4 — the entire
  // bundle fails to load on those iOS versions. Equivalent fix: replace
  // "punctuation + whitespace" with "punctuation + U+0001 sentinel" first,
  // then include the sentinel in the regular split regex.
  const SENT_BREAK = "\u0001";
  for (const { src, text } of sources) {
    const clauses = (text || "")
      .replace(/([.!?])\s+/g, `$1${SENT_BREAK}`)
      .split(/\r?\n|[•\-*]| {2,}|\u0001/g)
      .map((s) => s.trim())
      .filter((s) => s.length >= 8);
    for (const raw of clauses) {
      // Normalise — trim trailing punctuation, capitalise.
      const cleaned = raw.replace(/[.!?]+$/g, "").trim();
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: rid("a"),
        text: cleaned.length > 140 ? cleaned.slice(0, 140) + "…" : cleaned,
        done: false,
        source: src,
      });
      if (out.length >= 8) return out;
    }
  }
  return out;
}

export function addManualAction(actions: PtmActionItem[], text: string): PtmActionItem[] {
  const trimmed = text.trim();
  if (!trimmed) return actions;
  return [
    ...actions,
    { id: rid("a"), text: trimmed.slice(0, 200), done: false, source: "manual" },
  ];
}

export function toggleAction(actions: PtmActionItem[], id: string): PtmActionItem[] {
  return actions.map((a) => (a.id === id ? { ...a, done: !a.done } : a));
}

export function removeAction(actions: PtmActionItem[], id: string): PtmActionItem[] {
  return actions.filter((a) => a.id !== id);
}

// ─── Amy hint ─────────────────────────────────────────────────────────────
/**
 * Returns a short Amy AI message focusing on the top 2 open actions.
 * Returns null if there's nothing actionable yet.
 */
export function buildAmyHint(actions: PtmActionItem[]): string | null {
  const open = actions.filter((a) => !a.done).slice(0, 2);
  if (open.length === 0) return null;
  const list = open.map((a) => `“${a.text}”`).join(" and ");
  if (open.length === 1) {
    return `Amy AI: Focus on ${list} this week — small daily steps add up.`;
  }
  return `Amy AI: Focus on these 2 areas this week — ${list}.`;
}

// ─── History ──────────────────────────────────────────────────────────────
export function archiveSession(history: PtmSession[], session: PtmSession): PtmSession[] {
  const completed: PtmSession = {
    ...session,
    stage: "done",
    completedAt: Date.now(),
  };
  // Replace any existing entry with same id, then prepend, cap.
  const filtered = history.filter((s) => s.id !== completed.id);
  return [completed, ...filtered].slice(0, MAX_HISTORY);
}

export function deleteFromHistory(history: PtmSession[], id: string): PtmSession[] {
  return history.filter((s) => s.id !== id);
}

export interface ProgressDelta {
  prevDate: string;
  prevDoneCount: number;
  prevTotal: number;
  carriedOver: PtmActionItem[];
}

/**
 * Compare current open actions to the previous session's actions to highlight
 * carry-overs — items the parent hasn't yet acted on. Helps avoid the same
 * feedback showing up PTM after PTM.
 */
export function progressVsPrevious(
  current: PtmSession,
  history: PtmSession[],
): ProgressDelta | null {
  // Scope to the same child so a multi-child household never sees
  // sibling A's pending actions while prepping sibling B's PTM. Falls
  // back to "no childId on current" → match other entries with no
  // childId either, never cross-mix.
  const prev = history.find((s) => {
    if (s.id === current.id) return false;
    return (s.childId ?? null) === (current.childId ?? null);
  });
  if (!prev) return null;
  const currentTexts = new Set(current.actions.map((a) => a.text.toLowerCase()));
  const carried = prev.actions.filter(
    (a) => !a.done && currentTexts.has(a.text.toLowerCase()),
  );
  const prevDone = prev.actions.filter((a) => a.done).length;
  return {
    prevDate: prev.date,
    prevDoneCount: prevDone,
    prevTotal: prev.actions.length,
    carriedOver: carried,
  };
}

// ─── Counters for the hub badge ───────────────────────────────────────────
export interface SessionStats {
  selected: number;
  asked: number;
  totalActions: number;
  doneActions: number;
}

export function sessionStats(s: PtmSession): SessionStats {
  return {
    selected: s.questions.filter((q) => q.selected).length,
    asked: s.questions.filter((q) => q.asked).length,
    totalActions: s.actions.length,
    doneActions: s.actions.filter((a) => a.done).length,
  };
}
