import React, {   useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  Animated, Platform, Modal, Dimensions, FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, palette, brandExtended } from "@/constants/colors";
import {
  GAMES, CATEGORY_LABEL, CATEGORY_EMOJI,
  getTotalPoints, getUnlocked, isUnlocked, unlockGame, recordPlay,
  dailyLimitReached, gamesPlayedToday, amySuggestion, getSkillPercents,
  DAILY_LIMIT_N, type GameDef, type GameCategory,
} from "@/utils/gamesStorage";
import { useTranslation } from "react-i18next";

const { width: SW } = Dimensions.get("window");

// ═══════════════════════════════════════════════════════════════════
// MINI-GAMES
// ═══════════════════════════════════════════════════════════════════

// ─── Speed Math ────────────────────────────────────────────────────
function buildMathRound() {
  const ops = ["+", "-", "×"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 10) + 1, b = Math.floor(Math.random() * 10) + 1, correct = 0;
  if (op === "+") correct = a + b;
  if (op === "-") { if (b > a) [a, b] = [b, a]; correct = a - b; }
  if (op === "×") { a = Math.floor(Math.random() * 6) + 2; b = Math.floor(Math.random() * 6) + 2; correct = a * b; }
  const wrongs = new Set<number>();
  while (wrongs.size < 3) { const d = Math.floor(Math.random() * 6) - 3 || 4; const w = correct + d; if (w !== correct && w >= 0) wrongs.add(w); }
  return { q: `${a} ${op} ${b}`, correct, choices: [correct, ...Array.from(wrongs)].sort(() => Math.random() - 0.5) };
}
function SpeedMathGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const TOTAL = 6, PER_Q = 8;
  const rounds = useMemo(() => Array.from({ length: TOTAL }, buildMathRound), []);
  const [idx, setIdx] = useState(0), [score, setScore] = useState(0);
  const [fb, setFb] = useState<string | null>(null), [timeLeft, setTimeLeft] = useState(PER_Q);
  const resolvedRef = useRef(false), tickRef = useRef<any>(null);
  const scoreRef = useRef(0);

  const advance = useCallback((ok: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    clearInterval(tickRef.current);
    setFb(ok ? "✓" : "✗");
    if (ok) { scoreRef.current += 1; setScore(s => s + 1); }
    setTimeout(() => {
      setFb(null);
      if (idx + 1 >= TOTAL) onFinish(scoreRef.current, TOTAL);
      else { setIdx(i => i + 1); resolvedRef.current = false; setTimeLeft(PER_Q); }
    }, 700);
  }, [idx, onFinish]);

  useEffect(() => {
    resolvedRef.current = false; setTimeLeft(PER_Q);
    tickRef.current = setInterval(() => {
      setTimeLeft(t => { if (resolvedRef.current) return t; if (t <= 1) { advance(false); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [idx]);

  const r = rounds[idx];
  return (
    <View style={gs.gameWrap}>
      <View style={gs.gameTopRow}><Text style={gs.gameMeta}>{idx + 1}/{TOTAL}</Text><Text style={[gs.gameMeta, { color: timeLeft <= 3 ? palette.red300 : brandExtended.violetMuted, fontWeight: "700" }]}>⏱ {timeLeft}s</Text></View>
      {fb ? <View style={gs.fbWrap}><Text style={[gs.fbText, { color: fb === "✓" ? palette.green400 : palette.red500 }]}>{fb}</Text></View>
        : (<><Text style={gs.mathQ}>{r.q} = ?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              {r.choices.map(c => (
                <TouchableOpacity key={c} onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(); advance(c === r.correct); }} style={gs.choiceBtn} activeOpacity={0.8}>
                  <Text style={gs.choiceText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View></>)}
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score })}</Text>
    </View>
  );
}

// ─── Number Match ──────────────────────────────────────────────────
function buildNMRound() {
  const count = Math.floor(Math.random() * 9) + 2;
  const wrongs = new Set<number>();
  while (wrongs.size < 3) { const w = Math.max(1, Math.min(12, count + (Math.floor(Math.random() * 5) - 2 || 1))); if (w !== count) wrongs.add(w); }
  return { count, choices: [count, ...Array.from(wrongs)].sort(() => Math.random() - 0.5) };
}
function NumberMatchGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const TOTAL = 6;
  const rounds = useMemo(() => Array.from({ length: TOTAL }, buildNMRound), []);
  const [idx, setIdx] = useState(0), [score, setScore] = useState(0), [picked, setPicked] = useState<number | null>(null);
  const scoreRef = useRef(0);
  const r = rounds[idx];
  const onPick = (n: number) => {
    if (picked !== null) return;
    setPicked(n); const ok = n === r.count;
    if (ok) { scoreRef.current += 1; setScore(s => s + 1); }
    if (Platform.OS !== "web") Haptics.impactAsync();
    setTimeout(() => { setPicked(null); if (idx + 1 >= TOTAL) onFinish(scoreRef.current, TOTAL); else setIdx(i => i + 1); }, 800);
  };
  const dots = Array.from({ length: r.count });
  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.dots_q", { idx: idx + 1, total: TOTAL })}</Text>
      <View style={gs.dotsWrap}>{dots.map((_, i) => <View key={i} style={gs.dot} />)}</View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 8 }}>
        {r.choices.map(c => {
          const isC = c === r.count, isP = picked === c;
          const bg = picked !== null ? (isC ? palette.green500 : isP ? palette.red500 : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.08)";
          return (<TouchableOpacity key={c} disabled={picked !== null} onPress={() => onPick(c)} style={[gs.choiceBtn, { backgroundColor: bg }]} activeOpacity={0.8}>
            <Text style={gs.choiceText}>{c}</Text></TouchableOpacity>);
        })}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score })}</Text>
    </View>
  );
}

// ─── Find the Mistake ──────────────────────────────────────────────
const MISTAKE_SETS = [
  { base: "A", mistake: "B" }, { base: "7", mistake: "1" }, { base: "★", mistake: "☆" },
  { base: "○", mistake: "◆" }, { base: "3", mistake: "8" }, { base: "b", mistake: "d" },
  { base: "+", mistake: "×" }, { base: "M", mistake: "N" }, { base: "9", mistake: "6" },
];
function buildFMRound() {
  const s = MISTAKE_SETS[Math.floor(Math.random() * MISTAKE_SETS.length)];
  const tiles = Array(9).fill(s.base);
  const idx = Math.floor(Math.random() * 9);
  tiles[idx] = s.mistake;
  return { tiles, mistakeIdx: idx };
}
function FindMistakeGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const TOTAL = 5;
  const rounds = useMemo(() => Array.from({ length: TOTAL }, buildFMRound), []);
  const [idx, setIdx] = useState(0), [score, setScore] = useState(0), [picked, setPicked] = useState<number | null>(null);
  const scoreRef = useRef(0);
  const r = rounds[idx];
  const onPick = (i: number) => {
    if (picked !== null) return;
    setPicked(i); const ok = i === r.mistakeIdx;
    if (ok) { scoreRef.current += 1; setScore(s => s + 1); }
    if (Platform.OS !== "web") Haptics.impactAsync();
    setTimeout(() => { setPicked(null); if (idx + 1 >= TOTAL) onFinish(scoreRef.current, TOTAL); else setIdx(n => n + 1); }, 900);
  };
  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.find_diff_q", { idx: idx + 1, total: TOTAL })}</Text>
      <View style={gs.gridWrap}>
        {r.tiles.map((c, i) => {
          const isM = i === r.mistakeIdx, isP = picked === i;
          const bg = picked !== null ? (isM ? palette.green500 : isP ? palette.red500 : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.08)";
          return (<TouchableOpacity key={i} disabled={picked !== null} onPress={() => onPick(i)} style={[gs.gridCell, { backgroundColor: bg }]} activeOpacity={0.8}>
            <Text style={gs.gridText}>{c}</Text></TouchableOpacity>);
        })}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score })}</Text>
    </View>
  );
}

// ─── Color Memory ──────────────────────────────────────────────────
const CMCOLORS = [
  { id: "r", nameKey: "color_red",    color: palette.red500 }, { id: "b", nameKey: "color_blue",  color: palette.blue500 },
  { id: "g", nameKey: "color_green",  color: palette.green500 }, { id: "y", nameKey: "color_yellow",color: palette.yellow400 },
  { id: "p", nameKey: "color_purple", color: brand.purple500 }, { id: "o", nameKey: "color_orange",color: palette.orange400 },
];
function ColorMemoryGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const seqLens = [3, 4, 5, 5];
  const sequences = useMemo(() => seqLens.map(l => Array.from({ length: l }, () => CMCOLORS[Math.floor(Math.random() * CMCOLORS.length)].id)), []);
  const [round, setRound] = useState(0), [phase, setPhase] = useState<"show"|"input"|"fb">("show");
  const [showIdx, setShowIdx] = useState(0), [input, setInput] = useState<string[]>([]);
  const [score, setScore] = useState(0), [okRound, setOkRound] = useState(false);
  const scoreRef = useRef(0), timerRef = useRef<any>(null);
  const seq = sequences[round];

  useEffect(() => {
    if (phase !== "show") return;
    setShowIdx(0); let i = 0;
    timerRef.current = setInterval(() => {
      i++; if (i >= seq.length) { clearInterval(timerRef.current); setTimeout(() => { setPhase("input"); setInput([]); }, 400); }
      else setShowIdx(i);
    }, 700);
    return () => clearInterval(timerRef.current);
  }, [round, phase]);

  const onPick = (id: string) => {
    if (phase !== "input") return;
    const next = [...input, id];
    setInput(next);
    if (Platform.OS !== "web") Haptics.selectionAsync();
    if (next.length === seq.length) {
      const ok = next.every((c, i) => c === seq[i]); setOkRound(ok);
      if (ok) { scoreRef.current += 1; setScore(s => s + 1); }
      setPhase("fb");
      setTimeout(() => { if (round + 1 >= sequences.length) onFinish(scoreRef.current, sequences.length); else { setRound(r => r + 1); setPhase("show"); } }, 1100);
    }
  };

  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.round_meta", { round: round + 1, total: sequences.length, length: seq.length })}</Text>
      <View style={gs.cmDisplay}>
        {phase === "show" && <View style={[gs.cmSwatch, { backgroundColor: CMCOLORS.find(c => c.id === seq[showIdx])?.color }]} />}
        {phase === "input" && <Text style={gs.cmHint}>{t("screens.games.color_input_hint", { done: input.length, total: seq.length })}</Text>}
        {phase === "fb" && <Text style={[gs.fbText, { color: okRound ? palette.green400 : palette.red500 }]}>{okRound ? "✓" : "✗"}</Text>}
      </View>
      <View style={gs.gridWrap}>
        {CMCOLORS.map(c => (
          <TouchableOpacity key={c.id} disabled={phase !== "input"} onPress={() => onPick(c.id)} style={[gs.gridCell, { backgroundColor: c.color, opacity: phase === "input" ? 1 : 0.4 }]} activeOpacity={0.8}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{t(`screens.games.${c.nameKey}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score })}</Text>
    </View>
  );
}

// ─── Target Tap ────────────────────────────────────────────────────
interface Target { id: number; x: number; y: number; born: number }
function TargetTapGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const DURATION = 25000, SPAWN_MS = 900, LIFE_MS = 1400;
  const [targets, setTargets] = useState<Target[]>([]);
  const [timeLeft, setTimeLeft] = useState(Math.round(DURATION / 1000));
  const scoreRef = useRef(0), totalRef = useRef(0), idRef = useRef(0), overRef = useRef(false);
  const [score, setScore] = useState(0), [total, setTotal] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      setTimeLeft(Math.max(0, Math.round((DURATION - elapsed) / 1000)));
      if (elapsed >= DURATION && !overRef.current) { overRef.current = true; clearInterval(tick); clearInterval(spawn); clearInterval(clean); onFinish(scoreRef.current, Math.max(totalRef.current, 1)); }
    }, 250);
    const spawn = setInterval(() => {
      if (overRef.current) return;
      const t: Target = { id: ++idRef.current, x: 10 + Math.random() * 72, y: 10 + Math.random() * 72, born: Date.now() };
      setTargets(a => [...a, t]); totalRef.current += 1; setTotal(totalRef.current);
    }, SPAWN_MS);
    const clean = setInterval(() => { const now = Date.now(); setTargets(a => a.filter(t => now - t.born < LIFE_MS)); }, 200);
    return () => { clearInterval(tick); clearInterval(spawn); clearInterval(clean); };
  }, []);

  const onTap = (id: number) => {
    setTargets(arr => {
      if (!arr.some(t => t.id === id)) return arr;
      scoreRef.current += 1; setScore(scoreRef.current);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return arr.filter(t => t.id !== id);
    });
  };

  return (
    <View style={gs.gameWrap}>
      <View style={gs.gameTopRow}><Text style={gs.gameMeta}>{t("screens.games.hits_label", { score, total })}</Text><Text style={[gs.gameMeta, { color: timeLeft <= 5 ? palette.red300 : brandExtended.violetMuted, fontWeight: "700" }]}>⏱ {timeLeft}s</Text></View>
      <View style={gs.tapArena}>
        {targets.map(tg => {
          const age = Date.now() - tg.born; const scale = 1 - Math.min(0.35, age / LIFE_MS * 0.35);
          return (
            <TouchableOpacity key={tg.id} onPress={() => onTap(tg.id)} style={[gs.target, { left: `${tg.x}%` as any, top: `${tg.y}%` as any, transform: [{ scale }] }]} activeOpacity={0.8} />
          );
        })}
        {targets.length === 0 && timeLeft > 0 && <Text style={gs.cmHint}>{t("screens.games.targets_coming")}</Text>}
      </View>
      <Text style={[gs.gameMeta, { marginTop: 8 }]}>{t("screens.games.target_hint")}</Text>
    </View>
  );
}

// ─── Behavior Choice ───────────────────────────────────────────────
const BC_SITUATIONS = [
  { qKey: "bc_q1", aKeys: ["bc_q1_a1","bc_q1_a2","bc_q1_a3","bc_q1_a4"], correct: 1 },
  { qKey: "bc_q2", aKeys: ["bc_q2_a1","bc_q2_a2","bc_q2_a3","bc_q2_a4"], correct: 2 },
  { qKey: "bc_q3", aKeys: ["bc_q3_a1","bc_q3_a2","bc_q3_a3","bc_q3_a4"], correct: 1 },
  { qKey: "bc_q4", aKeys: ["bc_q4_a1","bc_q4_a2","bc_q4_a3","bc_q4_a4"], correct: 2 },
  { qKey: "bc_q5", aKeys: ["bc_q5_a1","bc_q5_a2","bc_q5_a3","bc_q5_a4"], correct: 2 },
];
function BehaviorChoiceGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const TOTAL = 5;
  const rounds = useMemo(() => BC_SITUATIONS.sort(() => Math.random() - 0.5).slice(0, TOTAL), []);
  const [idx, setIdx] = useState(0), [score, setScore] = useState(0), [picked, setPicked] = useState<number | null>(null);
  const scoreRef = useRef(0);
  const r = rounds[idx];
  const onPick = (i: number) => {
    if (picked !== null) return;
    setPicked(i); const ok = i === r.correct;
    if (ok) { scoreRef.current += 1; setScore(s => s + 1); }
    if (Platform.OS !== "web") Haptics.impactAsync();
    setTimeout(() => { setPicked(null); if (idx + 1 >= TOTAL) onFinish(scoreRef.current, TOTAL); else setIdx(n => n + 1); }, 1100);
  };
  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.round_idx", { idx: idx + 1, total: TOTAL })}</Text>
      <Text style={gs.bcQ}>{t(`screens.games.${r.qKey}`)}</Text>
      <View style={{ gap: 10, width: "100%" }}>
        {r.aKeys.map((aKey, i) => {
          const isC = i === r.correct, isP = picked === i;
          const bg = picked !== null ? (isC ? palette.green500 : isP ? palette.red500 : "rgba(255,255,255,0.06)") : "rgba(255,255,255,0.08)";
          const border = picked !== null && isC ? palette.green400 : "rgba(139,92,246,0.35)";
          return (<TouchableOpacity key={i} disabled={picked !== null} onPress={() => onPick(i)} style={[gs.bcChoice, { backgroundColor: bg, borderColor: border }]} activeOpacity={0.8}>
            <Text style={gs.bcChoiceText}>{t(`screens.games.${aKey}`)}</Text></TouchableOpacity>);
        })}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score })}</Text>
    </View>
  );
}

// ─── Pattern Match ─────────────────────────────────────────────────
const SHAPES = ["●","▲","■","★","♦","◆"];
function buildPMRound() {
  const seq = Array.from({ length: 3 }, () => SHAPES[Math.floor(Math.random() * SHAPES.length)]);
  const correct = seq[Math.floor(Math.random() * seq.length)];
  const wrongs = new Set<string>();
  while (wrongs.size < 3) { const w = SHAPES[Math.floor(Math.random() * SHAPES.length)]; if (w !== correct) wrongs.add(w); }
  return { seq, correct, choices: [correct, ...Array.from(wrongs)].sort(() => Math.random() - 0.5) };
}
function PatternMatchGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const TOTAL = 5;
  const rounds = useMemo(() => Array.from({ length: TOTAL }, buildPMRound), []);
  const [idx, setIdx] = useState(0), [score, setScore] = useState(0), [picked, setPicked] = useState<string | null>(null);
  const scoreRef = useRef(0);
  const r = rounds[idx];
  const onPick = (c: string) => {
    if (picked !== null) return;
    setPicked(c); const ok = c === r.correct;
    if (ok) { scoreRef.current += 1; setScore(s => s + 1); }
    if (Platform.OS !== "web") Haptics.impactAsync();
    setTimeout(() => { setPicked(null); if (idx + 1 >= TOTAL) onFinish(scoreRef.current, TOTAL); else setIdx(n => n + 1); }, 800);
  };
  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.pattern_q", { idx: idx + 1, total: TOTAL })}</Text>
      <View style={{ flexDirection: "row", gap: 14, justifyContent: "center", marginVertical: 12 }}>
        {r.seq.map((s, i) => <View key={i} style={gs.seqBox}><Text style={gs.seqText}>{s}</Text></View>)}
        <View style={[gs.seqBox, { borderColor: palette.amber400, borderStyle: "dashed" }]}><Text style={gs.seqText}>?</Text></View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        {r.choices.map(c => {
          const isC = c === r.correct, isP = picked === c;
          const bg = picked !== null ? (isC ? palette.green500 : isP ? palette.red500 : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.08)";
          return (<TouchableOpacity key={c} disabled={picked !== null} onPress={() => onPick(c)} style={[gs.choiceBtn, { backgroundColor: bg }]} activeOpacity={0.8}>
            <Text style={[gs.choiceText, { fontSize: 24 }]}>{c}</Text></TouchableOpacity>);
        })}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score })}</Text>
    </View>
  );
}

// ─── Odd One Out ───────────────────────────────────────────────────
function buildOOORound() {
  const base = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const odd  = SHAPES.filter(s => s !== base)[Math.floor(Math.random() * (SHAPES.length - 1))];
  const items = [odd, ...Array(4).fill(base)].sort(() => Math.random() - 0.5);
  return { items, oddItem: odd };
}
function OddOneOutGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const TOTAL = 5;
  const rounds = useMemo(() => Array.from({ length: TOTAL }, buildOOORound), []);
  const [idx, setIdx] = useState(0), [score, setScore] = useState(0), [picked, setPicked] = useState<string | null>(null);
  const scoreRef = useRef(0);
  const r = rounds[idx];
  const onPick = (c: string) => {
    if (picked !== null) return;
    setPicked(c); const ok = c === r.oddItem;
    if (ok) { scoreRef.current += 1; setScore(s => s + 1); }
    if (Platform.OS !== "web") Haptics.impactAsync();
    setTimeout(() => { setPicked(null); if (idx + 1 >= TOTAL) onFinish(scoreRef.current, TOTAL); else setIdx(n => n + 1); }, 800);
  };
  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.odd_q", { idx: idx + 1, total: TOTAL })}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginVertical: 12 }}>
        {r.items.map((c, i) => {
          const isO = c === r.oddItem, isP = picked === c;
          const bg = picked !== null ? (isO ? palette.green500 : isP ? palette.red500 : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.08)";
          return (<TouchableOpacity key={i} disabled={picked !== null} onPress={() => onPick(c)} style={[gs.seqBox, { backgroundColor: bg, width: 62, height: 62, borderRadius: 14 }]} activeOpacity={0.8}>
            <Text style={[gs.seqText, { fontSize: 28 }]}>{c}</Text></TouchableOpacity>);
        })}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score })}</Text>
    </View>
  );
}

// ─── Card Flip Match ────────────────────────────────────────────────
const CF_EMOJIS = ["🦊","🐬","🌈","🍕","🚀","🎸","🦋","🍓","🐙","🏆","⚡","🎭"];
function buildCardFlipBoard() {
  const pairs = CF_EMOJIS.slice(0, 6);
  return [...pairs, ...pairs].map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5);
}
type CFCard = { id: number; emoji: string; flipped: boolean; matched: boolean };
function CardFlipGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const [cards, setCards] = useState<CFCard[]>(() => buildCardFlipBoard());
  const [selected, setSelected] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const lockRef = useRef(false);
  const TOTAL_PAIRS = 6;

  const onTap = (idx: number) => {
    if (lockRef.current || cards[idx]!.flipped || cards[idx]!.matched) return;
    const next = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    const newSel = [...selected, idx];
    setCards(next);
    setSelected(newSel);
    if (newSel.length === 2) {
      lockRef.current = true;
      setMoves(m => m + 1);
      const [a, b] = newSel;
      const match = next[a!]!.emoji === next[b!]!.emoji;
      setTimeout(() => {
        setCards(c => c.map((card, i) => {
          if (i === a || i === b) return match ? { ...card, matched: true, flipped: true } : { ...card, flipped: false };
          return card;
        }));
        const newMatches = match ? matches + 1 : matches;
        setMatches(newMatches);
        setSelected([]);
        lockRef.current = false;
        if (match && newMatches >= TOTAL_PAIRS) {
          const score = Math.max(1, TOTAL_PAIRS - Math.max(0, moves + 1 - TOTAL_PAIRS));
          onFinish(score, TOTAL_PAIRS);
        }
      }, 800);
    }
  };

  const CELL = (SW - 60) / 4 - 6;
  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.cf_hint", { matches, total: TOTAL_PAIRS, moves: moves })}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginVertical: 10 }}>
        {cards.map((c, i) => (
          <TouchableOpacity key={c.id} onPress={() => onTap(i)} activeOpacity={0.85}
            style={[{ width: CELL, height: CELL, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
              c.matched ? { backgroundColor: "rgba(34,197,94,0.25)", borderColor: palette.green500 }
                : c.flipped ? { backgroundColor: "rgba(167,139,250,0.25)", borderColor: brand.violet300 }
                : { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(139,92,246,0.35)" }]}>
            <Text style={{ fontSize: c.flipped || c.matched ? CELL * 0.45 : 22 }}>{c.flipped || c.matched ? c.emoji : "❓"}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score: matches })}</Text>
    </View>
  );
}

// ─── Sequence Memory ────────────────────────────────────────────────
const SM_PADS = [
  { id: "r", color: "#ef4444" },   // audit-ok: game accent red
  { id: "g", color: "#22c55e" },   // audit-ok: game accent green
  { id: "b", color: "#3b82f6" },   // audit-ok: game accent blue
  { id: "y", color: "#eab308" },   // audit-ok: game accent yellow
];
function SequenceMemoryGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const TOTAL = 5;
  const [seq, setSeq] = useState<string[]>([]);
  const [phase, setPhase] = useState<"show" | "input" | "result">("show");
  const [showIdx, setShowIdx] = useState(-1);
  const [inputSeq, setInputSeq] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [lit, setLit] = useState<string | null>(null);

  const runShow = useCallback((sequence: string[]) => {
    setPhase("show");
    setShowIdx(-1);
    let i = 0;
    const iv = setInterval(() => {
      if (i >= sequence.length) { clearInterval(iv); setPhase("input"); setShowIdx(-1); return; }
      setShowIdx(i);
      setLit(sequence[i]!);
      setTimeout(() => setLit(null), 500);
      i++;
    }, 750);
  }, []);

  useEffect(() => {
    const newSeq = Array.from({ length: round + 1 }, () => SM_PADS[Math.floor(Math.random() * 4)]!.id);
    setSeq(newSeq);
    setInputSeq([]);
    setTimeout(() => runShow(newSeq), 500);
  }, [round, runShow]);

  const onPress = (id: string) => {
    if (phase !== "input") return;
    if (Platform.OS !== "web") Haptics.impactAsync();
    const next = [...inputSeq, id];
    setInputSeq(next);
    const pos = next.length - 1;
    if (seq[pos] !== id) {
      setPhase("result");
      if (round > TOTAL) onFinish(score, TOTAL);
      else setTimeout(() => { setRound(r => r + 1); }, 1200);
      return;
    }
    if (next.length === seq.length) {
      const newScore = score + 1;
      setScore(newScore);
      setPhase("result");
      if (round >= TOTAL) { onFinish(newScore, TOTAL); return; }
      setTimeout(() => { setRound(r => r + 1); }, 1000);
    }
  };

  const PAD = (SW - 80) / 2 - 6;
  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.sm_round", { round: Math.min(round, TOTAL), total: TOTAL })}</Text>
      <Text style={[gs.cmHint, { marginVertical: 8 }]}>
        {phase === "show" ? t("screens.games.sm_watch") : phase === "input" ? t("screens.games.sm_repeat") : ""}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginVertical: 8 }}>
        {SM_PADS.map(p => (
          <TouchableOpacity key={p.id} onPress={() => onPress(p.id)} disabled={phase !== "input"} activeOpacity={0.75}
            style={{ width: PAD, height: PAD, borderRadius: 18, backgroundColor: p.color,
              opacity: lit === p.id ? 1 : phase === "input" ? 0.75 : 0.35,
              transform: [{ scale: lit === p.id ? 1.08 : 1 }],
              shadowColor: lit === p.id ? p.color : "transparent", shadowOpacity: 0.9, shadowRadius: 16, elevation: lit === p.id ? 10 : 0 }} />
        ))}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score })}</Text>
    </View>
  );
}

// ─── Maze Escape ────────────────────────────────────────────────────
const MAZE_SIZE = 5;
type MazeCell = 0 | 1; // 0=open, 1=wall
function buildMaze(): MazeCell[][] {
  const walls: MazeCell[][] = [
    [0,1,0,0,0],
    [0,1,0,1,0],
    [0,0,0,1,0],
    [1,1,0,0,0],
    [0,0,0,1,0],
  ];
  return walls;
}
function MazeEscapeGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const maze = useMemo(() => buildMaze(), []);
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const GOAL: [number, number] = [4, 4];
  const CELL = Math.min(52, (SW - 80) / MAZE_SIZE);

  const move = (dr: number, dc: number) => {
    if (won) return;
    const [r, c] = pos;
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= MAZE_SIZE || nc < 0 || nc >= MAZE_SIZE) return;
    if (maze[nr]![nc] === 1) { if (Platform.OS !== "web") Haptics.impactAsync(); return; }
    setPos([nr, nc]);
    setMoves(m => m + 1);
    if (nr === GOAL[0] && nc === GOAL[1]) {
      setWon(true);
      const score = Math.max(1, 10 - Math.floor(moves / 3));
      setTimeout(() => onFinish(score, 10), 800);
    }
  };

  const DPAD_BTN_SIZE = 52;
  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.maze_hint")}</Text>
      <View style={{ flexDirection: "column", gap: 2, marginVertical: 12, alignItems: "center" }}>
        {maze.map((row, r) => (
          <View key={r} style={{ flexDirection: "row", gap: 2 }}>
            {row.map((cell, c) => {
              const isPlayer = pos[0] === r && pos[1] === c;
              const isGoal = GOAL[0] === r && GOAL[1] === c;
              const bg = cell === 1 ? "rgba(139,92,246,0.55)"
                : isPlayer ? palette.amber400
                : isGoal ? palette.green500
                : "rgba(255,255,255,0.05)";
              return (
                <View key={c} style={{ width: CELL, height: CELL, borderRadius: 6, backgroundColor: bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(139,92,246,0.3)" }}>
                  {isPlayer && <Text style={{ fontSize: CELL * 0.55 }}>🔵</Text>}
                  {isGoal && !isPlayer && <Text style={{ fontSize: CELL * 0.55 }}>🏁</Text>}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View style={{ gap: 6, alignItems: "center" }}>
        <TouchableOpacity onPress={() => move(-1, 0)} style={{ width: DPAD_BTN_SIZE, height: DPAD_BTN_SIZE, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.2)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-up" size={24} color={brand.violet300} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity onPress={() => move(0, -1)} style={{ width: DPAD_BTN_SIZE, height: DPAD_BTN_SIZE, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.2)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="chevron-back" size={24} color={brand.violet300} />
          </TouchableOpacity>
          <View style={{ width: DPAD_BTN_SIZE, height: DPAD_BTN_SIZE }} />
          <TouchableOpacity onPress={() => move(0, 1)} style={{ width: DPAD_BTN_SIZE, height: DPAD_BTN_SIZE, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.2)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="chevron-forward" size={24} color={brand.violet300} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => move(1, 0)} style={{ width: DPAD_BTN_SIZE, height: DPAD_BTN_SIZE, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.2)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-down" size={24} color={brand.violet300} />
        </TouchableOpacity>
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.maze_moves", { moves })}</Text>
    </View>
  );
}

// ─── Shape Matching ────────────────────────────────────────────────
const SHAPE_ITEMS = [
  { emoji: "🔴", label: "Circle" }, { emoji: "🔷", label: "Diamond" },
  { emoji: "⭐", label: "Star" },   { emoji: "🔺", label: "Triangle" },
  { emoji: "⬛", label: "Square" }, { emoji: "🌙", label: "Crescent" },
];
function ShapeMatchingGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const TOTAL = 6;
  const order = useMemo(() => [...SHAPE_ITEMS].sort(() => Math.random() - 0.5), []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const current = order[idx]!;
  const shuffled = useMemo(
    () => SHAPE_ITEMS.map(s => s.label).sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx],
  );

  const onPick = (label: string) => {
    if (picked !== null) return;
    setPicked(label);
    const ok = label === current.label;
    const newScore = ok ? score + 1 : score;
    if (ok) setScore(newScore);
    if (Platform.OS !== "web") Haptics.impactAsync();
    setTimeout(() => {
      setPicked(null);
      if (idx + 1 >= TOTAL) onFinish(newScore, TOTAL);
      else setIdx(i => i + 1);
    }, 900);
  };

  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.sm_shape_q", { idx: idx + 1, total: TOTAL })}</Text>
      <Text style={{ fontSize: 72, marginVertical: 16 }}>{current.emoji}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {shuffled.map((lbl) => {
          const isCorrect = lbl === current.label;
          const isPicked = picked === lbl;
          const bg = picked !== null
            ? isCorrect ? "rgba(34,197,94,0.28)" : isPicked ? "rgba(239,68,68,0.22)" : "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.08)";
          const border = picked !== null
            ? isCorrect ? palette.green500 : isPicked ? palette.red500 : "rgba(139,92,246,0.35)"
            : "rgba(139,92,246,0.35)";
          return (
            <TouchableOpacity key={lbl} onPress={() => onPick(lbl)} disabled={picked !== null} activeOpacity={0.8}
              style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: bg, borderWidth: 1, borderColor: border, minWidth: (SW - 80) / 2 - 10, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{lbl}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score })}</Text>
    </View>
  );
}

// ─── Color Fill ────────────────────────────────────────────────────
const FILL_COLORS = [
  { id: "r", color: "#ef4444" }, // audit-ok: game fill red
  { id: "g", color: "#22c55e" }, // audit-ok: game fill green
  { id: "b", color: "#3b82f6" }, // audit-ok: game fill blue
  { id: "y", color: "#eab308" }, // audit-ok: game fill yellow
  { id: "p", color: "#a855f7" }, // audit-ok: game fill purple
];
const FILL_TARGET: Record<number, string> = {
  0:"r", 1:"b", 2:"g", 3:"r",
  4:"g", 5:"y", 6:"r", 7:"b",
  8:"b", 9:"r", 10:"g", 11:"y",
  12:"y", 13:"g", 14:"b", 15:"r",
};
function ColorFillGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const CELLS = 16;
  const [grid, setGrid] = useState<(string | null)[]>(Array(CELLS).fill(null));
  const [selected, setSelected] = useState("r");
  const [filled, setFilled] = useState(0);
  const CELL = (SW - 80) / 4 - 6;

  const fillCell = (i: number) => {
    if (grid[i] !== null) return;
    const newGrid = [...grid]; newGrid[i] = selected;
    setGrid(newGrid);
    const newFilled = filled + 1;
    setFilled(newFilled);
    if (newFilled >= CELLS) {
      const correct = newGrid.filter((c, i) => c === FILL_TARGET[i]).length;
      setTimeout(() => onFinish(correct, CELLS), 500);
    }
  };

  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.cf_fill_hint")}</Text>
      <View style={{ flexDirection: "row", gap: 10, marginVertical: 10 }}>
        {FILL_COLORS.map(fc => (
          <TouchableOpacity key={fc.id} onPress={() => setSelected(fc.id)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: fc.color, borderWidth: selected === fc.id ? 3 : 1, borderColor: selected === fc.id ? "#fff" : "transparent" }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
        {grid.map((cell, i) => (
          <TouchableOpacity key={i} onPress={() => fillCell(i)} disabled={cell !== null} activeOpacity={0.8}
            style={{ width: CELL, height: CELL, borderRadius: 8, backgroundColor: cell ? FILL_COLORS.find(f => f.id === cell)?.color ?? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(139,92,246,0.3)" }} />
        ))}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.cf_progress", { done: filled, total: CELLS })}</Text>
    </View>
  );
}

// ─── Hidden Objects ────────────────────────────────────────────────
const HO_POOL = ["🦁","🐧","🦊","🐬","🦋","🌺","🍎","🚀","⭐","🌙","🎸","🎭","🍕","🎯","🏆","🎪","🦄","🐝","🌈","🎠"];
function buildHiddenBoard() {
  const shuffled = [...HO_POOL].sort(() => Math.random() - 0.5).slice(0, 20);
  const targets = shuffled.slice(0, 4);
  return { items: shuffled, targets };
}
function HiddenObjectsGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const { items, targets } = useMemo(() => buildHiddenBoard(), []);
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [tapped, setTapped] = useState<Set<number>>(() => new Set());

  const onTap = (idx: number, emoji: string) => {
    if (tapped.has(idx)) return;
    setTapped(prev => { const n = new Set(prev); n.add(idx); return n; });
    if (targets.includes(emoji) && !found.has(emoji)) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newFound = new Set(found); newFound.add(emoji);
      setFound(newFound);
      if (newFound.size >= targets.length) {
        setTimeout(() => onFinish(targets.length, targets.length), 600);
      }
    } else {
      if (Platform.OS !== "web") Haptics.impactAsync();
    }
  };

  const CELL = (SW - 60) / 5 - 6;
  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.ho_find")}</Text>
      <View style={{ flexDirection: "row", gap: 10, marginVertical: 8, justifyContent: "center" }}>
        {targets.map(e => (
          <View key={e} style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ fontSize: 22, opacity: found.has(e) ? 0.35 : 1 }}>{e}</Text>
            {found.has(e) && <Text style={{ fontSize: 10, color: palette.green500 }}>✓</Text>}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, justifyContent: "center", marginTop: 6 }}>
        {items.map((emoji, i) => {
          const isFound = tapped.has(i) && targets.includes(emoji);
          const isMiss  = tapped.has(i) && !targets.includes(emoji);
          return (
            <TouchableOpacity key={i} onPress={() => onTap(i, emoji)} disabled={tapped.has(i)} activeOpacity={0.75}
              style={{ width: CELL, height: CELL, borderRadius: 10, alignItems: "center", justifyContent: "center",
                backgroundColor: isFound ? "rgba(34,197,94,0.22)" : isMiss ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
                borderWidth: 1, borderColor: isFound ? palette.green500 : "rgba(139,92,246,0.3)" }}>
              <Text style={{ fontSize: CELL * 0.48 }}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.ho_score", { found: found.size, total: targets.length })}</Text>
    </View>
  );
}

// ─── Spot the Difference ────────────────────────────────────────────
const STD_EMOJIS = ["🦁","🐧","🦊","🐬","🦋","🌺","🍎","🚀","⭐","🌙","🎸","🎭","🍕","🎯","🏆","🎪"];
function buildSTDBoards() {
  const base = [...STD_EMOJIS].sort(() => Math.random() - 0.5);
  const modified = [...base];
  const diffIndices = new Set<number>();
  while (diffIndices.size < 3) diffIndices.add(Math.floor(Math.random() * 16));
  const pool = STD_EMOJIS.filter(e => !base.includes(e));
  let pi = 0;
  diffIndices.forEach(i => { modified[i] = pool[pi % pool.length]!; pi++; });
  return { board1: base, board2: modified, diffs: diffIndices };
}
function SpotTheDifferenceGame({ onFinish }: { onFinish: (s: number, t: number) => void }) {
  const { t } = useTranslation();
  const { board1, board2, diffs } = useMemo(() => buildSTDBoards(), []);
  const [found, setFound] = useState<Set<number>>(() => new Set());
  const [wrong, setWrong] = useState<Set<number>>(() => new Set());
  const TOTAL = diffs.size;

  const onTapB2 = (idx: number) => {
    if (found.has(idx) || wrong.has(idx)) return;
    if (diffs.has(idx)) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const nf = new Set(found); nf.add(idx); setFound(nf);
      if (nf.size >= TOTAL) setTimeout(() => onFinish(TOTAL, TOTAL), 600);
    } else {
      if (Platform.OS !== "web") Haptics.impactAsync();
      const nw = new Set(wrong); nw.add(idx); setWrong(nw);
    }
  };

  const CELL = (SW - 76) / 2 / 4 - 4;
  const renderGrid = (board: string[], tappable: boolean) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3, width: (CELL + 3) * 4 - 3 }}>
      {board.map((emoji, i) => {
        const isFoundHere = found.has(i);
        const isWrong = tappable && wrong.has(i);
        return (
          <TouchableOpacity key={i} onPress={tappable ? () => onTapB2(i) : undefined}
            disabled={!tappable || found.has(i) || wrong.has(i)} activeOpacity={0.8}
            style={{ width: CELL, height: CELL, borderRadius: 6, alignItems: "center", justifyContent: "center",
              backgroundColor: isFoundHere ? "rgba(34,197,94,0.25)" : isWrong ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)",
              borderWidth: 1, borderColor: isFoundHere ? palette.green500 : isWrong ? palette.red500 : "rgba(139,92,246,0.25)" }}>
            <Text style={{ fontSize: CELL * 0.52 }}>{emoji}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={gs.gameWrap}>
      <Text style={gs.gameMeta}>{t("screens.games.std_hint", { found: found.size, total: TOTAL })}</Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10, justifyContent: "center" }}>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={[gs.gameMeta, { fontWeight: "700" }]}>{t("screens.games.std_pic1")}</Text>
          {renderGrid(board1, false)}
        </View>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={[gs.gameMeta, { fontWeight: "700" }]}>{t("screens.games.std_pic2")}</Text>
          {renderGrid(board2, true)}
        </View>
      </View>
      <Text style={gs.scoreLabel}>{t("screens.games.score_label", { score: found.size })}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GAME MODAL
// ═══════════════════════════════════════════════════════════════════
type GameResult = { game: GameDef; score: number; total: number; earned: number; perfect: boolean };

function GameModal({ game, onClose, onResult }: { game: GameDef; onClose: () => void; onResult: (r: GameResult) => void }) {
  const { t } = useTranslation();
  const [done, setDone] = useState<GameResult | null>(null);

  const finish = async (score: number, total: number) => {
    const ratio = total === 0 ? 0 : score / total;
    const perfect = ratio >= 0.95;
    const earned = perfect ? game.rewardMax : Math.max(game.rewardMin, Math.round(game.rewardMin + (game.rewardMax - game.rewardMin) * ratio));
    await recordPlay(game.id, score, total, perfect, earned);
    setDone({ game, score, total, earned, perfect });
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.sheetHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 24 }}>{game.emoji}</Text>
              <View>
                <Text style={ms.sheetTitle}>{game.title}</Text>
                <Text style={ms.sheetBlurb}>{game.blurb}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}><Ionicons name="close" size={18} color={brand.violet300} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {!done ? (
              <>
                {game.id === "speed-math"           && <SpeedMathGame onFinish={finish} />}
                {game.id === "number-match"        && <NumberMatchGame onFinish={finish} />}
                {game.id === "find-mistake"        && <FindMistakeGame onFinish={finish} />}
                {game.id === "color-memory"        && <ColorMemoryGame onFinish={finish} />}
                {game.id === "target-tap"          && <TargetTapGame onFinish={finish} />}
                {game.id === "what-should-you-do"  && <BehaviorChoiceGame onFinish={finish} />}
                {game.id === "pattern-match"       && <PatternMatchGame onFinish={finish} />}
                {game.id === "odd-one-out"         && <OddOneOutGame onFinish={finish} />}
                {game.id === "card-flip"           && <CardFlipGame onFinish={finish} />}
                {game.id === "sequence-memory"     && <SequenceMemoryGame onFinish={finish} />}
                {game.id === "maze-escape"         && <MazeEscapeGame onFinish={finish} />}
                {game.id === "shape-matching"      && <ShapeMatchingGame onFinish={finish} />}
                {game.id === "color-fill"          && <ColorFillGame onFinish={finish} />}
                {game.id === "hidden-objects"      && <HiddenObjectsGame onFinish={finish} />}
                {game.id === "spot-the-difference" && <SpotTheDifferenceGame onFinish={finish} />}
              </>
            ) : (
              <View style={gs.gameWrap}>
                <Ionicons name="trophy" size={52} color={done.perfect ? palette.amber400 : brand.violet300} style={{ alignSelf: "center", marginVertical: 12 }} />
                <Text style={[ms.sheetTitle, { textAlign: "center", fontSize: 20 }]}>{done.perfect ? t("screens.games.perfect_score") : t("screens.games.nice_work")}</Text>
                <Text style={[ms.sheetBlurb, { textAlign: "center", marginBottom: 16 }]}>{t("screens.games.you_scored", { score: done.score, total: done.total })}</Text>
                <View style={ms.earnedBadge}><Ionicons name="star" size={16} color="#fff" /><Text style={ms.earnedText}>{t("screens.games.earned_pts", { earned: done.earned })}</Text></View>
                <TouchableOpacity onPress={() => { onResult(done!); onClose(); }} style={ms.doneBtn} activeOpacity={0.85}>
                  <LinearGradient colors={[brand.primary, brand.pink500]} style={ms.doneBtnGrad}><Text style={ms.doneBtnText}>{t("screens.games.done_btn")}</Text></LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════
const ORDERED_CATS: GameCategory[] = ["brain","memory","math","focus","creativity","behavior","action"];
const SKILL_CATS: GameCategory[] = ["brain","memory","math","focus","behavior","action"];

export default function GamesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const [points, setPoints] = useState(0);
  const [unlockedList, setUnlockedList] = useState<string[]>([]);
  const [playedToday, setPlayedToday] = useState(0);
  const [limitHit, setLimitHit] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [skills, setSkills] = useState<Record<GameCategory, number>>({} as any);
  const [activeGame, setActiveGame] = useState<GameDef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    const [pts, ul, played, lim, sug, sk] = await Promise.all([
      getTotalPoints(), getUnlocked(), gamesPlayedToday(), dailyLimitReached(),
      amySuggestion(), getSkillPercents(),
    ]);
    setPoints(pts); setUnlockedList(ul); setPlayedToday(played);
    setLimitHit(lim); setSuggestion(sug.line); setSkills(sk);
  }, []);

  useEffect(() => { refresh(); }, [tick]);

  const onUnlock = async (g: GameDef) => {
    setError(null);
    const r = await unlockGame(g.id);
    if (!r.ok) setError(r.reason ?? t("screens.games.unlock_error"));
    setTick(n => n + 1);
    if (Platform.OS !== "web") Haptics.impactAsync();
  };

  const onPlay = (g: GameDef) => {
    if (limitHit) { setError(t("screens.games.limit_error", { limit: DAILY_LIMIT_N })); return; }
    setError(null); setActiveGame(g);
  };

  const gamesByCategory = useMemo(() => {
    const map = new Map<GameCategory, GameDef[]>();
    for (const g of GAMES) { if (!map.has(g.category)) map.set(g.category, []); map.get(g.category)!.push(g); }
    return ORDERED_CATS.filter(c => map.has(c)).map(c => [c, map.get(c)!] as const);
  }, []);

  return (
    <LinearGradient colors={["#0f0c29","#1a1040","#0c1220"]} style={{ flex: 1 }}> // audit-ok: intentional dark bg / custom color
      {/* Header */}
      <View style={[scr.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={scr.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={brand.violet300} />
        </TouchableOpacity>
        <MaterialCommunityIcons name="gamepad-variant" size={20} color={brand.violet300} style={{ marginRight: 6 }} />
        <Text style={scr.headerTitle}>{t("screens.games.header_title")}</Text>
        <View style={{ flex: 1 }} />
        {/* Points pill */}
        <LinearGradient colors={[palette.amber500,palette.orange500]} style={scr.ptsPill}>
          <Ionicons name="star" size={12} color="#fff" />
          <Text style={scr.ptsText}>{points}</Text>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily limit banner */}
        <View style={scr.bannerRow}>
          <Ionicons name="sparkles" size={16} color={palette.amber400} />
          <Text style={scr.bannerText} numberOfLines={3}>{suggestion}</Text>
        </View>
        <View style={scr.limitRow}>
          <Text style={scr.limitText}>{t("screens.games.played_today")} <Text style={{ color: limitHit ? palette.red300 : "#fff", fontWeight: "700" }}>{playedToday}/{DAILY_LIMIT_N}</Text></Text>
          <Text style={scr.limitText}>{t("screens.games.unlock_hint")}</Text>
        </View>

        {/* Error banner */}
        {error && (
          <View style={scr.errorRow}>
            <Text style={scr.errorText} numberOfLines={2}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}><Ionicons name="close" size={14} color={palette.rose200} /></TouchableOpacity>
          </View>
        )}

        {/* Skill Progress */}
        <View style={scr.skillCard}>
          <Text style={scr.skillTitle}>{t("screens.games.skill_progress")}</Text>
          {SKILL_CATS.map(cat => {
            const pct = skills[cat] ?? 0;
            const barColor = pct >= 75 ? [palette.green500,palette.green400] : pct >= 40 ? [palette.amber500,palette.amber400] : [brand.primary, brand.violet400] as any;
            return (
              <View key={cat} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={scr.skillCat}>{CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}</Text>
                  <Text style={[scr.skillCat, { color: pct >= 75 ? palette.green400 : pct >= 40 ? palette.amber400 : brandExtended.violetMuted, fontWeight: "700" }]}>{pct}%</Text>
                </View>
                <View style={scr.skillTrack}>
                  <LinearGradient colors={barColor} style={[scr.skillFill, { width: `${pct}%` as any }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Games by category */}
        {gamesByCategory.map(([cat, list]) => (
          <View key={cat} style={{ marginBottom: 20 }}>
            <View style={scr.catHeader}>
              <Text style={{ fontSize: 18 }}>{CATEGORY_EMOJI[cat]}</Text>
              <Text style={scr.catLabel}>{CATEGORY_LABEL[cat]}</Text>
              <Text style={scr.catCount}>{t(list.length === 1 ? "screens.games.games_count_one" : "screens.games.games_count_other", { count: list.length })}</Text>
            </View>
            <View style={scr.gamesRow}>
              {list.map(g => {
                const unlocked = unlockedList.includes(g.id);
                const soon = g.status === "soon";
                return (
                  <View key={g.id} style={[scr.gameCard, soon && { opacity: 0.55 }]}>
                    {!unlocked && !soon && (
                      <View style={scr.lockBadge}><Ionicons name="lock-closed" size={10} color={palette.amber400} /></View>
                    )}
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>{g.emoji}</Text>
                    <Text style={scr.gameTitle} numberOfLines={2}>{g.title}</Text>
                    {g.ageHint && <Text style={scr.gameAge}>{g.ageHint}</Text>}
                    {soon ? (
                      <Text style={scr.soonTag}>{t("screens.games.coming_soon")}</Text>
                    ) : unlocked ? (
                      <TouchableOpacity onPress={() => onPlay(g)} disabled={limitHit} style={[scr.playBtn, limitHit && { opacity: 0.4 }]} activeOpacity={0.85}>
                        <LinearGradient colors={[brand.primary,brand.pink500]} style={scr.playBtnGrad}><Text style={scr.playBtnText}>{t("screens.games.play")}</Text></LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => onUnlock(g)} style={scr.unlockBtn} activeOpacity={0.85}>
                        <Ionicons name="lock-closed" size={10} color={palette.amber400} />
                        <Text style={scr.unlockBtnText}>{t("screens.games.pts_cost", { cost: g.unlockCost })}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {activeGame && (
        <GameModal game={activeGame} onClose={() => { setActiveGame(null); setTick(t => t + 1); }} onResult={() => setTick(t => t + 1)} />
      )}
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const scr = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(139,92,246,0.2)", gap: 6 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(167,139,250,0.15)", alignItems: "center", justifyContent: "center", marginRight: 4 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  ptsPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  ptsText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  bannerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(139,92,246,0.25)", borderRadius: 14, padding: 12, marginTop: 14 },
  bannerText: { flex: 1, color: "#e6e1f5", fontSize: 13, lineHeight: 18 }, // audit-ok: custom dark-mode text
  limitRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, marginBottom: 2 },
  limitText: { color: brandExtended.violetMuted, fontSize: 12 },
  errorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 12, padding: 10, marginVertical: 8, gap: 8 },
  errorText: { flex: 1, color: palette.rose200, fontSize: 12 },
  skillCard: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(139,92,246,0.22)", borderRadius: 14, padding: 14, marginVertical: 14 },
  skillTitle: { color: brand.violet300, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  skillCat: { color: "#e6e1f5", fontSize: 11 }, // audit-ok: custom dark-mode text
  skillTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  skillFill: { height: "100%", borderRadius: 3 },
  catHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  catLabel: { color: "#e6e1f5", fontWeight: "800", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4, flex: 1 }, // audit-ok: custom dark-mode text
  catCount: { color: "#7c6fb8", fontSize: 11 }, // audit-ok: muted violet label
  gamesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gameCard: {
    width: (SW - 44) / 2 - 5, backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.25)",
    borderRadius: 16, padding: 14, alignItems: "center", position: "relative",
  },
  lockBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 999, padding: 4 },
  gameTitle: { color: "#fff", fontWeight: "800", fontSize: 13, textAlign: "center", lineHeight: 17, marginBottom: 4 },
  gameAge: { color: brandExtended.violetMuted, fontSize: 10.5, marginBottom: 6 },
  soonTag: { color: palette.amber400, fontWeight: "700", fontSize: 11, marginTop: 4 },
  playBtn: { width: "100%", borderRadius: 999, overflow: "hidden", marginTop: 4 },
  playBtnGrad: { paddingVertical: 7, alignItems: "center" },
  playBtnText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
  unlockBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 4, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(139,92,246,0.4)", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, width: "100%" },
  unlockBtnText: { color: "#fff", fontWeight: "700", fontSize: 11.5 },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(8,5,25,0.88)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#1a1040", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: "90%", paddingBottom: 36 }, // audit-ok: intentional dark bg / custom color
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  sheetTitle: { color: "#fff", fontWeight: "800", fontSize: 16, lineHeight: 20 },
  sheetBlurb: { color: brandExtended.violetMuted, fontSize: 11, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(167,139,250,0.15)", alignItems: "center", justifyContent: "center" },
  earnedBadge: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", backgroundColor: palette.amber500, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, marginVertical: 16 },
  earnedText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  doneBtn: { alignSelf: "center", borderRadius: 999, overflow: "hidden" },
  doneBtnGrad: { paddingHorizontal: 32, paddingVertical: 12 },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

// ── Game component shared styles ────────────────────────────────
const gs = StyleSheet.create({
  gameWrap: { paddingTop: 8, alignItems: "center", width: "100%", gap: 6 },
  gameTopRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 4 },
  gameMeta: { color: brandExtended.violetMuted, fontSize: 12 },
  fbWrap: { height: 100, alignItems: "center", justifyContent: "center" },
  fbText: { fontSize: 56, fontWeight: "900" },
  mathQ: { fontSize: 36, fontWeight: "900", color: "#fff", marginVertical: 14 },
  choiceBtn: { width: (SW - 80) / 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: "rgba(139,92,246,0.35)" },
  choiceText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  scoreLabel: { color: brand.violet300, fontSize: 12, fontWeight: "700", marginTop: 8 },
  dotsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 14, justifyContent: "center", width: "100%", minHeight: 90 },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: brand.primary },
  gridWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginVertical: 8 },
  gridCell: { width: (SW - 100) / 3, height: 60, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(139,92,246,0.35)" },
  gridText: { color: "#fff", fontSize: 24, fontWeight: "800" },
  cmDisplay: { height: 90, alignItems: "center", justifyContent: "center", marginVertical: 8 },
  cmSwatch: { width: 70, height: 70, borderRadius: 18 },
  cmHint: { color: brandExtended.violetSoft, fontSize: 13, textAlign: "center" },
  tapArena: { width: "100%", height: 240, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(139,92,246,0.3)", borderRadius: 16, position: "relative", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  target: { position: "absolute", width: 48, height: 48, borderRadius: 24, backgroundColor: palette.amber400, shadowColor: palette.amber400, shadowOpacity: 0.7, shadowRadius: 12, elevation: 8 },
  bcQ: { color: "#fff", fontSize: 15, fontWeight: "700", textAlign: "center", lineHeight: 22, marginVertical: 12 },
  bcChoice: { width: "100%", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(139,92,246,0.35)" },
  bcChoiceText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  seqBox: { width: 52, height: 52, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(139,92,246,0.4)", alignItems: "center", justifyContent: "center" },
  seqText: { color: "#fff", fontSize: 22, fontWeight: "800" },
});
