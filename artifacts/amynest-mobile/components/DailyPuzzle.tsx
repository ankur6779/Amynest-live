import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/colors";
import {
  ageMonthsToGroup,
  defaultPuzzleDifficulty,
  adjustPuzzleDifficulty,
  pickPuzzles,
  puzzleDateSeed,
  PUZZLE_PER_SESSION,
  type DailyPuzzle as Puzzle,
  type PuzzleDifficulty,
} from "@workspace/age-content";

type Persist = {
  date: string;
  difficulty: PuzzleDifficulty;
  correctStreak: number;
  wrongStreak: number;
  usedIds: string[];
};

const lsKey = (childName: string) => `amynest_puzzle_v2_${childName}`;
const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function DailyPuzzle({
  ageMonths = 60,
  childName = "default",
}: {
  ageMonths?: number;
  childName?: string;
}) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const group = ageMonthsToGroup(ageMonths);

  const [state, setState] = useState<Persist | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [results, setResults] = useState<(boolean | null)[]>(
    Array(PUZZLE_PER_SESSION).fill(null),
  );
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Hydrate from AsyncStorage on mount / child change.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const raw = await AsyncStorage.getItem(lsKey(childName));
      const today = todayStr();
      let st: Persist;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Persist;
          if (parsed.date === today) {
            st = parsed;
          } else {
            st = {
              date: today,
              difficulty: parsed.difficulty ?? defaultPuzzleDifficulty(group),
              correctStreak: 0,
              wrongStreak: 0,
              usedIds: parsed.usedIds ?? [],
            };
          }
        } catch {
          st = freshState(group);
        }
      } else {
        st = freshState(group);
      }
      if (cancelled) return;
      const seed = puzzleDateSeed(st.date, childName);
      const ps = pickPuzzles(st.difficulty, seed, st.usedIds, PUZZLE_PER_SESSION);
      setState(st);
      setPuzzles(ps);
      setResults(Array(PUZZLE_PER_SESSION).fill(null));
      setIdx(0);
      setSelected(null);
      setShowResult(false);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [childName, group]);

  const persist = (next: Persist) => {
    setState(next);
    void AsyncStorage.setItem(lsKey(childName), JSON.stringify(next));
  };

  const submit = () => {
    if (!selected || !state) return;
    const cur = puzzles[idx];
    if (!cur) return;
    const correct = selected === cur.correctAnswer;
    setShowResult(true);
    setResults((rs) => {
      const next = [...rs];
      next[idx] = correct;
      return next;
    });
    const correctStreak = correct ? state.correctStreak + 1 : 0;
    const wrongStreak = correct ? 0 : state.wrongStreak + 1;
    const newDiff = adjustPuzzleDifficulty(state.difficulty, correctStreak, wrongStreak);
    persist({
      ...state,
      difficulty: newDiff,
      correctStreak,
      wrongStreak,
      usedIds: state.usedIds.includes(cur.id)
        ? state.usedIds
        : [...state.usedIds, cur.id],
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
      usedIds: [],
    };
    const seed = puzzleDateSeed(fresh.date, childName);
    const ps = pickPuzzles(fresh.difficulty, seed, [], PUZZLE_PER_SESSION);
    persist(fresh);
    setPuzzles(ps);
    setResults(Array(PUZZLE_PER_SESSION).fill(null));
    setIdx(0);
    setSelected(null);
    setShowResult(false);
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

function freshState(group: ReturnType<typeof ageMonthsToGroup>): Persist {
  return {
    date: todayStr(),
    difficulty: defaultPuzzleDifficulty(group),
    correctStreak: 0,
    wrongStreak: 0,
    usedIds: [],
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
