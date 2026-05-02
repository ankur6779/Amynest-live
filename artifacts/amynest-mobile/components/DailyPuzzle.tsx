import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/colors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import {
  ageMonthsToGroup,
  defaultPuzzleDifficulty,
  adjustPuzzleDifficulty,
  pickPuzzles,
  puzzleDateSeed,
  PUZZLE_PER_SESSION,
  DAILY_PUZZLES,
  type DailyPuzzle as Puzzle,
  type PuzzleDifficulty,
} from "@workspace/age-content";

type Persist = {
  date: string;
  difficulty: PuzzleDifficulty;
  correctStreak: number;
  wrongStreak: number;
  usedIds: string[];
  /** Puzzle ids picked for the current session, in order. */
  sessionPuzzleIds: string[];
  /** Per-question result: true=correct, false=wrong, null=not yet answered. */
  results: (boolean | null)[];
};

const lsKey = (childName: string) => `amynest_puzzle_v3_${childName}`;
const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PUZZLE_BY_ID = new Map(DAILY_PUZZLES.map((p) => [p.id, p]));

/** Reconstruct puzzle objects from a saved id list, dropping any unknown ids. */
function puzzlesFromIds(ids: readonly string[]): Puzzle[] {
  const out: Puzzle[] = [];
  for (const id of ids) {
    const p = PUZZLE_BY_ID.get(id);
    if (p) out.push(p);
  }
  return out;
}

/**
 * Build a fresh session for `state.date` + `state.difficulty`. Mutates
 * `state.sessionPuzzleIds` and `state.results` in place and returns the
 * picked puzzles so the caller can drop them into component state.
 */
function startNewSession(state: Persist, childName: string): Puzzle[] {
  const seed = puzzleDateSeed(state.date, childName);
  const ps = pickPuzzles(state.difficulty, seed, state.usedIds, PUZZLE_PER_SESSION);
  state.sessionPuzzleIds = ps.map((p) => p.id);
  state.results = Array(ps.length).fill(null);
  return ps;
}

/**
 * Hydrate from a previously-saved snapshot. If `sessionPuzzleIds` is missing
 * (e.g. an older client wrote it, or a fresh-start row from the server) we
 * pick a new session deterministically. Returns the puzzles to render.
 */
function rehydrateSession(state: Persist, childName: string): Puzzle[] {
  if (
    state.sessionPuzzleIds.length > 0 &&
    state.results.length === state.sessionPuzzleIds.length
  ) {
    const ps = puzzlesFromIds(state.sessionPuzzleIds);
    if (ps.length === state.sessionPuzzleIds.length) return ps;
    // Some saved id no longer exists in the bank — restart cleanly.
  }
  return startNewSession(state, childName);
}

type ServerProgress = {
  childId: number;
  date: string;
  difficulty: PuzzleDifficulty;
  correctStreak: number;
  wrongStreak: number;
  usedIds: string[];
  sessionPuzzleIds: string[];
  results: (boolean | null)[];
  updatedAt: string;
};

/** Convert a server row into the local Persist shape. */
function persistFromServer(row: ServerProgress): Persist {
  return {
    date: row.date,
    difficulty: row.difficulty,
    correctStreak: row.correctStreak,
    wrongStreak: row.wrongStreak,
    usedIds: row.usedIds ?? [],
    sessionPuzzleIds: row.sessionPuzzleIds ?? [],
    results: row.results ?? [],
  };
}

export function DailyPuzzle({
  ageMonths = 60,
  childName = "default",
  childId,
}: {
  ageMonths?: number;
  childName?: string;
  /**
   * When provided, today's progress is mirrored to the server so it follows
   * the child across devices. Falls back to AsyncStorage-only when omitted.
   */
  childId?: number;
}) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const group = ageMonthsToGroup(ageMonths);
  const authFetch = useAuthFetch();

  const [state, setState] = useState<Persist | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [results, setResults] = useState<(boolean | null)[]>(
    Array(PUZZLE_PER_SESSION).fill(null),
  );
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Latest writer wins — but we still want sequential PUTs per (child, date)
  // so the server never sees results going backwards mid-flight.
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());

  // Hydrate on mount / child change. Server wins when reachable so a parent
  // who answered on the phone can pick up on the tablet at the next
  // unanswered question. AsyncStorage is the offline / signed-out fallback.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const today = todayStr();
      const localRaw = await AsyncStorage.getItem(lsKey(childName));
      let local: Persist | null = null;
      if (localRaw) {
        try {
          local = normalizeLocal(JSON.parse(localRaw), group, today);
        } catch {
          local = null;
        }
      }

      let st: Persist | null = null;
      if (childId) {
        try {
          const res = await authFetch(
            `/api/daily-puzzle/progress?childId=${childId}&date=${today}`,
          );
          if (res.ok) {
            const json = (await res.json()) as {
              ok: boolean;
              progress: ServerProgress | null;
            };
            if (json.progress && json.progress.date === today) {
              st = persistFromServer(json.progress);
            }
          }
        } catch {
          // Network/auth errors are non-fatal — we'll fall back to local.
        }
      }

      if (!st) {
        st = local && local.date === today ? local : freshState(group, today);
      }

      if (cancelled) return;

      const ps = rehydrateSession(st, childName);
      setState(st);
      setPuzzles(ps);
      setResults(st.results.length === ps.length ? [...st.results] : Array(ps.length).fill(null));
      // Resume at the first unanswered question (or the end if all answered).
      const firstUnanswered = st.results.findIndex((r) => r === null);
      setIdx(firstUnanswered === -1 ? Math.max(0, ps.length - 1) : firstUnanswered);
      setSelected(null);
      setShowResult(firstUnanswered === -1 && ps.length > 0);
      setLoaded(true);

      // If we created a fresh session locally (e.g. no row on server yet,
      // or local was stale), persist the initial snapshot so other devices
      // see the same puzzle ordering.
      void persist(st);
    })();
    return () => {
      cancelled = true;
    };
    // authFetch is recreated on every render, but its identity changing
    // shouldn't re-hydrate the session. Only re-run when the actual child
    // identity (or its age bucket) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childName, childId, group]);

  /** Write `next` to AsyncStorage and (if signed-in) the server. */
  const persist = (next: Persist): Promise<void> => {
    setState(next);
    const writeLocal = AsyncStorage.setItem(
      lsKey(childName),
      JSON.stringify(next),
    ).catch(() => {});
    let writeServer: Promise<void> = Promise.resolve();
    if (childId) {
      const body = JSON.stringify({
        childId,
        date: next.date,
        difficulty: next.difficulty,
        correctStreak: next.correctStreak,
        wrongStreak: next.wrongStreak,
        usedIds: next.usedIds,
        sessionPuzzleIds: next.sessionPuzzleIds,
        results: next.results,
      });
      writeChainRef.current = writeChainRef.current
        .catch(() => {})
        .then(() =>
          authFetch("/api/daily-puzzle/progress", { method: "PUT", body })
            .then(() => undefined)
            .catch(() => undefined),
        );
      writeServer = writeChainRef.current;
    }
    return Promise.all([writeLocal, writeServer]).then(() => undefined);
  };

  const submit = () => {
    if (!selected || !state) return;
    const cur = puzzles[idx];
    if (!cur) return;
    const correct = selected === cur.correctAnswer;
    setShowResult(true);
    const nextResults = [...results];
    nextResults[idx] = correct;
    setResults(nextResults);
    const correctStreak = correct ? state.correctStreak + 1 : 0;
    const wrongStreak = correct ? 0 : state.wrongStreak + 1;
    const newDiff = adjustPuzzleDifficulty(state.difficulty, correctStreak, wrongStreak);
    void persist({
      ...state,
      difficulty: newDiff,
      correctStreak,
      wrongStreak,
      usedIds: state.usedIds.includes(cur.id)
        ? state.usedIds
        : [...state.usedIds, cur.id],
      results: nextResults,
    });
  };

  const next = () => {
    setSelected(null);
    setShowResult(false);
    setIdx((i) => Math.min(i + 1, PUZZLE_PER_SESSION - 1));
  };

  const restart = () => {
    if (!state) return;
    const fresh: Persist = {
      ...state,
      correctStreak: 0,
      wrongStreak: 0,
      sessionPuzzleIds: [],
      results: [],
    };
    const ps = startNewSession(fresh, childName);
    setPuzzles(ps);
    setResults([...fresh.results]);
    setIdx(0);
    setSelected(null);
    setShowResult(false);
    void persist(fresh);
  };

  if (!loaded || !state) {
    return (
      <View style={{ alignItems: "center", padding: 16 }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (puzzles.length === 0) {
    return <Text style={s.dim}>No puzzles available right now.</Text>;
  }

  const finished = idx >= PUZZLE_PER_SESSION - 1 && results[idx] !== null;
  const cur = puzzles[idx];
  const total = puzzles.length;

  if (finished) {
    const score = results.filter((r) => r === true).length;
    return (
      <View style={{ gap: 12 }}>
        <View style={s.scoreCard}>
          <Text style={s.scoreEmoji}>🎉</Text>
          <Text style={s.scoreTitle}>Session complete!</Text>
          <Text style={s.scoreText}>
            {score} / {total} correct · difficulty {state.difficulty}
          </Text>
        </View>
        <Pressable onPress={restart} style={s.primary}>
          <Ionicons name="refresh" size={14} color="#fff" />
          <Text style={s.primaryText}>Start a new session</Text>
        </Pressable>
      </View>
    );
  }

  if (!cur) return <Text style={s.dim}>No puzzle.</Text>;

  return (
    <View style={{ gap: 12 }}>
      <View style={s.metaRow}>
        <Text style={s.metaText}>
          Question {idx + 1} / {total}
        </Text>
        <View style={s.diffPill}>
          <Text style={s.diffText}>{cur.difficulty.toUpperCase()}</Text>
        </View>
      </View>

      <View style={s.questionCard}>
        {cur.visual ? <Text style={s.visual}>{cur.visual}</Text> : null}
        <Text style={s.question}>{cur.question}</Text>
      </View>

      <View style={{ gap: 8 }}>
        {cur.options.map((opt) => {
          const isSel = selected === opt;
          const isCorrect = showResult && opt === cur.correctAnswer;
          const isWrong = showResult && isSel && opt !== cur.correctAnswer;
          return (
            <Pressable
              key={opt}
              onPress={() => !showResult && setSelected(opt)}
              disabled={showResult}
              style={[
                s.option,
                isSel && !showResult && s.optionSel,
                isCorrect && s.optionCorrect,
                isWrong && s.optionWrong,
              ]}
            >
              <Text
                style={[
                  s.optionText,
                  (isCorrect || isWrong) && { color: "#fff" },
                ]}
              >
                {opt}
              </Text>
              {isCorrect ? (
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              ) : null}
              {isWrong ? <Ionicons name="close-circle" size={18} color="#fff" /> : null}
            </Pressable>
          );
        })}
      </View>

      {!showResult ? (
        <Pressable
          onPress={submit}
          disabled={!selected}
          style={[s.primary, !selected && s.primaryDisabled]}
        >
          <Text style={s.primaryText}>Submit</Text>
        </Pressable>
      ) : (
        <Pressable onPress={next} style={s.primary}>
          <Text style={s.primaryText}>Next →</Text>
        </Pressable>
      )}
    </View>
  );
}

function freshState(
  group: ReturnType<typeof ageMonthsToGroup>,
  today = todayStr(),
): Persist {
  return {
    date: today,
    difficulty: defaultPuzzleDifficulty(group),
    correctStreak: 0,
    wrongStreak: 0,
    usedIds: [],
    sessionPuzzleIds: [],
    results: [],
  };
}

/**
 * Coerce a parsed AsyncStorage blob into a valid `Persist` for `today`.
 * Carries over difficulty + usedIds across days but resets the in-progress
 * session — matches the v2 behaviour the previous component had.
 */
function normalizeLocal(
  raw: unknown,
  group: ReturnType<typeof ageMonthsToGroup>,
  today: string,
): Persist {
  const r = (raw ?? {}) as Partial<Persist> & { date?: string };
  const isToday = r.date === today;
  return {
    date: today,
    difficulty: (r.difficulty as PuzzleDifficulty | undefined) ??
      defaultPuzzleDifficulty(group),
    correctStreak: isToday ? r.correctStreak ?? 0 : 0,
    wrongStreak: isToday ? r.wrongStreak ?? 0 : 0,
    usedIds: Array.isArray(r.usedIds) ? r.usedIds : [],
    sessionPuzzleIds:
      isToday && Array.isArray(r.sessionPuzzleIds) ? r.sessionPuzzleIds : [],
    results: isToday && Array.isArray(r.results) ? r.results : [],
  };
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    dim: { color: c.textMuted, fontSize: 13 },
    metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    metaText: { color: c.textMuted, fontSize: 12, fontWeight: "700" },
    diffPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "rgba(123,63,242,0.25)",
      borderWidth: 1,
      borderColor: "rgba(123,63,242,0.5)",
    },
    diffText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
    questionCard: {
      backgroundColor: c.calloutBg,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: c.glassBorder,
      alignItems: "center",
      gap: 10,
    },
    visual: { fontSize: 40, textAlign: "center" },
    question: { color: c.foreground, fontSize: 16, fontWeight: "700", textAlign: "center", lineHeight: 22 },
    option: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: c.calloutBg,
      borderWidth: 1.5,
      borderColor: c.glassBorder,
    },
    optionSel: { borderColor: "rgba(123,63,242,0.8)", backgroundColor: "rgba(123,63,242,0.15)" },
    optionCorrect: { backgroundColor: palette.green500, borderColor: palette.green500 },
    optionWrong: { backgroundColor: palette.red500, borderColor: palette.red500 },
    optionText: { color: c.foreground, fontSize: 14, fontWeight: "700" },
    primary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: "rgba(123,63,242,0.55)",
      borderWidth: 1,
      borderColor: "rgba(255,78,205,0.4)",
    },
    primaryDisabled: { opacity: 0.5 },
    primaryText: { color: "#fff", fontWeight: "800", fontSize: 14 },
    scoreCard: {
      backgroundColor: c.calloutBg,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: c.glassBorder,
      alignItems: "center",
      gap: 6,
    },
    scoreEmoji: { fontSize: 36 },
    scoreTitle: { color: c.foreground, fontSize: 16, fontWeight: "800" },
    scoreText: { color: c.textMuted, fontSize: 13 },
  });
}
