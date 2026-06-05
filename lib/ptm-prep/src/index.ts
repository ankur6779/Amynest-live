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

/** Preschool (roughly ages 3–5) — social readiness and classroom basics. */
export const PRESCHOOL_QUESTIONS: { category: PtmCategory; text: string }[] = [
  { category: "social", text: "Is my child settling in well and feeling comfortable at school?" },
  { category: "social", text: "How do they share, take turns, and play with classmates?" },
  { category: "behavior", text: "How do they handle transitions (class to lunch, home time)?" },
  { category: "academic", text: "Are they showing interest in letters, numbers, or early reading?" },
  { category: "academic", text: "How is their pencil grip and fine-motor work progressing?" },
  { category: "behavior", text: "Do they follow simple classroom rules without constant reminders?" },
  { category: "social", text: "Are there any separation-anxiety or crying patterns to note?" },
  { category: "social", text: "Can they express needs to the teacher (bathroom, hunger, help)?" },
];

/** Primary (roughly ages 6–8) — homework, reading, peer dynamics. */
export const PRIMARY_QUESTIONS: { category: PtmCategory; text: string }[] = [
  { category: "academic", text: "How is reading fluency and comprehension at grade level?" },
  { category: "academic", text: "Which subject needs the most support at home right now?" },
  { category: "academic", text: "Is homework quality consistent, or rushed at the last minute?" },
  { category: "behavior", text: "How is classroom participation and attention during lessons?" },
  { category: "social", text: "Are there friendship changes or playground conflicts I should know about?" },
  { category: "behavior", text: "How do they respond when corrected or given constructive feedback?" },
  { category: "academic", text: "Are there upcoming assessments or projects we should prepare for?" },
  { category: "social", text: "Is my child confident raising their hand or asking for help?" },
];

/** Upper primary (ages 9+) — study habits, exams, independence. */
export const UPPER_QUESTIONS: { category: PtmCategory; text: string }[] = [
  { category: "academic", text: "How are unit-test / exam scores trending this term?" },
  { category: "academic", text: "Which topics need revision before the next assessment?" },
  { category: "behavior", text: "Is my child managing study time and deadlines independently?" },
  { category: "academic", text: "Are there gaps in Hindi/regional language or second-language subjects?" },
  { category: "social", text: "How is peer pressure or classroom dynamics affecting them?" },
  { category: "behavior", text: "Is screen time or distractions affecting school performance?" },
  { category: "academic", text: "Would extra coaching or Olympiad prep be appropriate now?" },
  { category: "social", text: "Is my child comfortable discussing problems with teachers?" },
];

export type PtmAgeBand = "preschool" | "primary" | "upper" | "general";

export function resolveAgeBand(childAge?: number): PtmAgeBand {
  if (childAge == null || childAge < 3) return "general";
  if (childAge < 6) return "preschool";
  if (childAge < 9) return "primary";
  return "upper";
}

export function getQuestionsForAge(childAge?: number): { category: PtmCategory; text: string }[] {
  const band = resolveAgeBand(childAge);
  switch (band) {
    case "preschool":
      return PRESCHOOL_QUESTIONS;
    case "primary":
      return PRIMARY_QUESTIONS;
    case "upper":
      return UPPER_QUESTIONS;
    default:
      return DEFAULT_QUESTIONS;
  }
}

/** Categories pre-selected on a fresh session per age band. */
export function defaultSelectedCategories(childAge?: number): Set<PtmCategory> {
  const band = resolveAgeBand(childAge);
  if (band === "preschool") return new Set(["social", "behavior"]);
  if (band === "primary") return new Set(["academic", "social"]);
  if (band === "upper") return new Set(["academic", "behavior"]);
  return new Set(["academic"]);
}

// ─── Storage keys (callers persist with localStorage / AsyncStorage) ────────
export const STORAGE_KEY_DRAFT = "amynest.ptm_prep.draft.v1";
export const STORAGE_KEY_HISTORY = "amynest.ptm_prep.history.v1";
export const STORAGE_KEY_REMINDERS = "amynest.ptm_prep.reminders.v1";
export const STORAGE_KEY_CLIENT_UPDATED_AT = "amynest.ptm_prep.client_updated_at.v1";
export const MAX_HISTORY = 12;

/** Clear all PTM Prep localStorage keys — required on sign-out / account switch. */
export function clearPtmPrepLocalCache(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    localStorage.removeItem(STORAGE_KEY_REMINDERS);
    localStorage.removeItem(STORAGE_KEY_CLIENT_UPDATED_AT);
  } catch {
    /* private mode */
  }
}

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
  childAge?: number;
  date?: string;
} = {}): PtmSession {
  const bank = getQuestionsForAge(input.childAge);
  const preselect = defaultSelectedCategories(input.childAge);
  return {
    id: rid("ptm"),
    childId: input.childId,
    childName: input.childName,
    date: input.date ?? todayKey(),
    stage: "prepare",
    questions: bank.map((q) => ({
      id: rid("q"),
      category: q.category,
      text: q.text,
      selected: preselect.has(q.category),
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

// ─── Amy AI helpers (local fallbacks + parsers) ───────────────────────────

export interface AmyQuestionsResult {
  questions: string[];
  source: "ai" | "local";
}

export interface AmyActionsResult {
  actions: string[];
  source: "ai" | "local";
}

export function generateAmyQuestionsLocal(input: {
  childAge?: number;
  childName?: string;
  teacherName?: string;
  className?: string;
  previousWeakAreas?: string;
}): AmyQuestionsResult {
  const band = resolveAgeBand(input.childAge);
  const name = input.childName?.trim() || "my child";
  const pool: string[] = [];
  if (band === "preschool") {
    pool.push(
      `How is ${name} adjusting to the daily school routine?`,
      "Are there any toileting or self-care skills we should practise at home?",
      "Which play-based activities does my child enjoy most in class?",
    );
  } else if (band === "primary") {
    pool.push(
      `How is ${name}'s reading and writing compared to classmates?`,
      "Are there spelling or handwriting habits we should reinforce?",
      "Is my child participating in class discussions?",
    );
  } else if (band === "upper") {
    pool.push(
      "How should we plan revision before the next unit test?",
      "Is my child taking ownership of homework without daily reminders?",
      "Are there co-curricular areas worth encouraging?",
    );
  } else {
    pool.push(
      `How is ${name} progressing overall this term?`,
      "What is one strength and one area to work on at home?",
    );
  }
  if (input.previousWeakAreas?.trim()) {
    pool.push(`Last time we discussed "${input.previousWeakAreas.slice(0, 60)}" — any improvement?`);
  }
  if (input.teacherName?.trim()) {
    pool.push(`From your perspective, ${input.teacherName.trim()}, what should we prioritise this month?`);
  }
  return { questions: pool.slice(0, 5), source: "local" };
}

export function parseAmyQuestionsResponse(
  json: unknown,
  fallback: AmyQuestionsResult,
): AmyQuestionsResult {
  if (!json || typeof json !== "object") return fallback;
  const items = (json as { questions?: unknown }).questions;
  if (!Array.isArray(items)) return fallback;
  const questions = items
    .filter((q): q is string => typeof q === "string")
    .map((q) => q.trim())
    .filter((q) => q.length >= 8)
    .slice(0, 6);
  if (questions.length === 0) return fallback;
  return { questions, source: "ai" };
}

export function generateAmyActionsLocal(notes: PtmNotes): AmyActionsResult {
  const fromNotes = suggestActions(notes).map((a) => a.text);
  return { actions: fromNotes, source: "local" };
}

export function parseAmyActionsResponse(
  json: unknown,
  fallback: AmyActionsResult,
): AmyActionsResult {
  if (!json || typeof json !== "object") return fallback;
  const items = (json as { actions?: unknown }).actions;
  if (!Array.isArray(items)) return fallback;
  const actions = items
    .filter((a): a is string => typeof a === "string")
    .map((a) => a.trim())
    .filter((a) => a.length >= 8)
    .slice(0, 8);
  if (actions.length === 0) return fallback;
  return { actions, source: "ai" };
}

export function mergeAmyQuestionsIntoSession(
  session: PtmSession,
  result: AmyQuestionsResult,
): PtmSession {
  const existing = new Set(session.questions.map((q) => q.text.toLowerCase()));
  const added = result.questions
    .filter((text) => !existing.has(text.toLowerCase()))
    .map((text) => ({
      id: rid("q"),
      category: "custom" as const,
      text: text.slice(0, 200),
      selected: true,
      asked: false,
    }));
  return { ...session, questions: [...session.questions, ...added] };
}

export function mergeAmyActionsIntoSession(
  session: PtmSession,
  result: AmyActionsResult,
): PtmSession {
  const existing = new Set(session.actions.map((a) => a.text.toLowerCase()));
  const added: PtmActionItem[] = result.actions
    .filter((text) => !existing.has(text.toLowerCase()))
    .map((text) => ({
      id: rid("a"),
      text: text.slice(0, 200),
      done: false,
      source: "suggestion" as const,
    }));
  return { ...session, actions: [...session.actions, ...added] };
}

// ─── Share / export ─────────────────────────────────────────────────────────

export function formatPtmSummaryText(session: PtmSession): string {
  const lines: string[] = [];
  const child = session.childName?.trim() || "Child";
  lines.push(`PTM Summary — ${child}`);
  lines.push(`Date: ${session.date}`);
  if (session.teacherName) lines.push(`Teacher: ${session.teacherName}`);
  if (session.className) lines.push(`Class: ${session.className}`);
  lines.push("");

  const asked = session.questions.filter((q) => q.asked);
  if (asked.length > 0) {
    lines.push("Questions discussed:");
    for (const q of asked) {
      lines.push(`• ${q.text}`);
      if (q.response?.trim()) lines.push(`  → ${q.response.trim()}`);
    }
    lines.push("");
  }

  if (session.notes.teacherFeedback.trim()) {
    lines.push(`Teacher feedback: ${session.notes.teacherFeedback.trim()}`);
  }
  if (session.notes.weakAreas.trim()) {
    lines.push(`Weak areas: ${session.notes.weakAreas.trim()}`);
  }
  if (session.notes.suggestions.trim()) {
    lines.push(`Suggestions: ${session.notes.suggestions.trim()}`);
  }
  lines.push("");

  if (session.actions.length > 0) {
    lines.push("Action plan:");
    for (const a of session.actions) {
      lines.push(`${a.done ? "✅" : "▫️"} ${a.text}`);
    }
    lines.push("");
  }

  lines.push("— Prepared with AmyNest PTM Prep Assistant");
  return lines.join("\n");
}

// ─── Reminders ──────────────────────────────────────────────────────────────

export const REMINDER_OFFSETS_DAYS = [7, 14] as const;

export interface PtmReminder {
  id: string;
  sessionId: string;
  childId?: string;
  childName?: string;
  actionText: string;
  dueDate: string;
  /** YYYY-MM-DD when parent dismissed this reminder. */
  dismissedAt?: string;
}

export function buildRemindersFromSession(session: PtmSession): PtmReminder[] {
  const open = session.actions.filter((a) => !a.done);
  if (open.length === 0) return [];
  const base = session.completedAt ?? Date.now();
  const baseDate = new Date(base);
  const out: PtmReminder[] = [];
  for (const action of open.slice(0, 4)) {
    for (const offset of REMINDER_OFFSETS_DAYS) {
      const due = new Date(baseDate);
      due.setDate(due.getDate() + offset);
      out.push({
        id: rid("rem"),
        sessionId: session.id,
        childId: session.childId,
        childName: session.childName,
        actionText: action.text,
        dueDate: todayKey(due),
      });
    }
  }
  return out;
}

export function activeReminders(reminders: PtmReminder[], today = todayKey()): PtmReminder[] {
  return reminders.filter((r) => !r.dismissedAt && r.dueDate <= today);
}

// ─── Cloud sync payload ─────────────────────────────────────────────────────

export interface PtmPrepSyncPayload {
  draft: PtmSession | null;
  history: PtmSession[];
  reminders: PtmReminder[];
  clientUpdatedAt: number;
}
