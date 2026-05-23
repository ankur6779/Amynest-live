import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { useColors } from "@/hooks/useColors";
import { brand, palette } from "@/constants/colors";
import { useTranslation } from "react-i18next";

type TrickAge = "4-6" | "6-8";

type PracticeQ = {
  question: string;
  options: string[];
  answer: string;
  hint: string;
};

type MathTrick = {
  id: string;
  age: TrickAge;
  title: string;
  trick: string;
  example: string;
  emoji: string;
  color: string;
  audioText: string;
  practiceQ: PracticeQ;
};

const TRICKS: MathTrick[] = [
  { id: "t01", age: "4-6", emoji: "🔟", color: palette.amber500,
    title: "Add 10 Easily", trick: "Just add 1 to the tens digit!",
    example: "23 + 10 = 33  →  tens: 2 becomes 3",
    audioText: "Add 10 Easily! When you add 10 to any number, the tens digit goes up by 1. So 23 plus 10 equals 33 — the 2 becomes a 3, and the 3 stays!",
    practiceQ: { question: "What is 35 + 10?", options: ["43","44","45","46"], answer: "45", hint: "Add 1 to the tens digit: 3 becomes 4 → 45" } },
  { id: "t02", age: "4-6", emoji: "9️⃣", color: brand.violet500,
    title: "Add 9 Trick", trick: "Add 10, then subtract 1!",
    example: "24 + 9 → 24 + 10 = 34 → 34 − 1 = 33",
    audioText: "The Add 9 Trick! To add 9 to any number, first add 10, then take away 1. Try 24 plus 9: add 10 to get 34, then minus 1 is 33!",
    practiceQ: { question: "What is 16 + 9?", options: ["24","25","26","27"], answer: "25", hint: "16 + 10 = 26, minus 1 = 25" } },
  { id: "t03", age: "4-6", emoji: "✌️", color: palette.green500,
    title: "Double Numbers", trick: "Add the number to itself!",
    example: "6 + 6 = 12  →  double of 6",
    audioText: "Doubling! When you add a number to itself, you double it. 6 plus 6 equals 12. Try doubling 7 — seven plus seven is 14!",
    practiceQ: { question: "What is 8 + 8?", options: ["14","15","16","17"], answer: "16", hint: "Double 8 → 8 + 8 = 16" } },
  { id: "t04", age: "4-6", emoji: "🌟", color: palette.cyan500,
    title: "Near Double", trick: "Double the smaller, then add 1!",
    example: "6 + 7 → 6+6 = 12, then +1 = 13",
    audioText: "Near Doubles! When two numbers are close, double the smaller one and add 1. For 6 plus 7: double 6 is 12, add 1 equals 13!",
    practiceQ: { question: "What is 5 + 6?", options: ["10","11","12","13"], answer: "11", hint: "Double 5 = 10, add 1 = 11" } },
  { id: "t05", age: "4-6", emoji: "5️⃣", color: palette.red500,
    title: "Add 5 Trick", trick: "Add 10, then subtract 5!",
    example: "12 + 5 → 12 + 10 = 22 → 22 − 5 = 17",
    audioText: "The Add 5 Trick! To add 5, first add 10 and then take away 5. So 12 plus 5: add 10 to get 22, subtract 5 equals 17!",
    practiceQ: { question: "What is 14 + 5?", options: ["18","19","20","21"], answer: "19", hint: "14 + 10 = 24, minus 5 = 19" } },
  { id: "m01", age: "6-8", emoji: "⚡", color: brand.violet500,
    title: "Multiply by 9", trick: "Multiply by 10, then subtract the number!",
    example: "9 × 7 → 10×7 = 70 → 70 − 7 = 63",
    audioText: "Multiply by 9! Instead of struggling, multiply by 10 and subtract the number. 9 times 7: 10 times 7 is 70, minus 7 equals 63!",
    practiceQ: { question: "What is 9 × 8?", options: ["63","72","81","54"], answer: "72", hint: "10×8 = 80, minus 8 = 72" } },
  { id: "m02", age: "6-8", emoji: "1️⃣1️⃣", color: palette.amber500,
    title: "Multiply by 11", trick: "Add the two digits and place in the middle!",
    example: "23 × 11: 2+(2+3)+3 = 253",
    audioText: "Multiply by 11! For any two-digit number, add its digits and put the sum in the middle. 23 times 11: 2 and 3 add to 5, so the answer is 253!",
    practiceQ: { question: "What is 14 × 11?", options: ["144","154","164","174"], answer: "154", hint: "1 + 4 = 5, put 5 in middle → 154" } },
  { id: "m03", age: "6-8", emoji: "💠", color: palette.cyan500,
    title: "Square Ending in 5", trick: "Multiply first digit by (first digit + 1), then add 25!",
    example: "25² → 2×3 = 6 → 625",
    audioText: "Squaring numbers that end in 5! Take the first digit, multiply it by one more than itself, then put 25 at the end. 25 squared: 2 times 3 is 6, so the answer is 625!",
    practiceQ: { question: "What is 35²?", options: ["1025","1125","1225","1325"], answer: "1225", hint: "3×4 = 12, add 25 → 1225" } },
  { id: "m04", age: "6-8", emoji: "✋", color: palette.green500,
    title: "Multiply by 5", trick: "Multiply by 10, then divide by 2!",
    example: "8 × 5 → 8×10 = 80 → 80÷2 = 40",
    audioText: "Multiply by 5! To multiply any number by 5, first multiply by 10 and then cut it in half. 8 times 5: 8 times 10 is 80, divided by 2 equals 40!",
    practiceQ: { question: "What is 14 × 5?", options: ["60","65","70","75"], answer: "70", hint: "14 × 10 = 140, ÷2 = 70" } },
  { id: "m05", age: "6-8", emoji: "4️⃣", color: palette.red500,
    title: "Multiply by 4", trick: "Double the number twice!",
    example: "6 × 4 → 6×2 = 12 → 12×2 = 24",
    audioText: "Multiply by 4! Just double the number twice. 6 times 4: first double 6 to get 12, then double 12 to get 24!",
    practiceQ: { question: "What is 7 × 4?", options: ["24","26","28","30"], answer: "28", hint: "7×2 = 14, then 14×2 = 28" } },
  { id: "m06", age: "6-8", emoji: "💯", color: palette.amber500,
    title: "Multiply by 25", trick: "Divide by 4, then multiply by 100!",
    example: "8 × 25 → 8÷4 = 2 → 2×100 = 200",
    audioText: "Multiply by 25! Divide the number by 4 and add two zeros. 8 times 25: 8 divided by 4 is 2, then add two zeros to get 200!",
    practiceQ: { question: "What is 12 × 25?", options: ["200","250","300","350"], answer: "300", hint: "12÷4 = 3, then ×100 = 300" } },
  { id: "m07", age: "6-8", emoji: "5️⃣0️⃣", color: brand.violet500,
    title: "Multiply by 50", trick: "Multiply by 100, then divide by 2!",
    example: "6 × 50 → 6×100 = 600 → 600÷2 = 300",
    audioText: "Multiply by 50! Multiply by 100 and halve it. 6 times 50: 6 times 100 is 600, divided by 2 equals 300!",
    practiceQ: { question: "What is 8 × 50?", options: ["300","350","400","450"], answer: "400", hint: "8×100 = 800, ÷2 = 400" } },
  { id: "m08", age: "6-8", emoji: "💯", color: palette.cyan500,
    title: "Subtract from 100", trick: "Subtract each digit from 9, last from 10!",
    example: "100 − 47 → (9−4)(10−7) = 53",
    audioText: "Subtract from 100! For each digit except the last, subtract from 9. For the last digit, subtract from 10. 100 minus 47: 9 minus 4 is 5, and 10 minus 7 is 3, so the answer is 53!",
    practiceQ: { question: "What is 100 − 63?", options: ["27","37","47","57"], answer: "37", hint: "9−6=3, 10−3=7 → 37" } },
  { id: "m09", age: "6-8", emoji: "🚀", color: palette.green500,
    title: "Add Big Numbers Fast", trick: "Round up, then adjust!",
    example: "98 + 36 → 100 + 36 = 136 → 136−2 = 134",
    audioText: "Add big numbers fast! Round one number to a friendly number, add, then adjust. 98 plus 36: round 98 to 100, add 36 to get 136, then subtract 2 to get 134!",
    practiceQ: { question: "What is 99 + 47?", options: ["144","145","146","147"], answer: "146", hint: "100 + 47 = 147, minus 1 = 146" } },
  { id: "m10", age: "6-8", emoji: "✖️", color: palette.red500,
    title: "Multiply by 2", trick: "Just double the number!",
    example: "9 × 2 = 18  →  double of 9",
    audioText: "Multiply by 2! Just double the number. 9 times 2 equals 18. Easy as that!",
    practiceQ: { question: "What is 13 × 2?", options: ["24","25","26","27"], answer: "26", hint: "Just double: 13+13 = 26" } },
  { id: "m11", age: "6-8", emoji: "3️⃣", color: palette.amber500,
    title: "Multiply by 3", trick: "Double the number, then add it once more!",
    example: "7 × 3 → 7×2 = 14 → 14+7 = 21",
    audioText: "Multiply by 3! Double the number and add it one more time. 7 times 3: double 7 is 14, add 7 equals 21!",
    practiceQ: { question: "What is 8 × 3?", options: ["21","22","23","24"], answer: "24", hint: "8×2 = 16, plus 8 = 24" } },
  { id: "m12", age: "6-8", emoji: "➗", color: brand.violet500,
    title: "Divide by 2", trick: "Just halve the number!",
    example: "20 ÷ 2 = 10  →  half of 20",
    audioText: "Divide by 2! Just find half of the number. Half of 20 is 10. Half of 36 is 18!",
    practiceQ: { question: "What is 36 ÷ 2?", options: ["16","17","18","19"], answer: "18", hint: "Half of 36 = 18" } },
  { id: "m13", age: "6-8", emoji: "🔟", color: palette.cyan500,
    title: "Multiply by 10", trick: "Add a zero at the end!",
    example: "7 × 10 = 70  →  just add 0",
    audioText: "Multiply by 10! The easiest trick — just add a zero to the end of the number. 7 times 10 is 70. 23 times 10 is 230!",
    practiceQ: { question: "What is 15 × 10?", options: ["105","115","150","151"], answer: "150", hint: "Add zero: 15 → 150" } },
  { id: "m14", age: "6-8", emoji: "💯", color: palette.green500,
    title: "Multiply by 100", trick: "Add two zeros at the end!",
    example: "5 × 100 = 500  →  add 00",
    audioText: "Multiply by 100! Add two zeros to the end. 5 times 100 is 500. 12 times 100 is 1200!",
    practiceQ: { question: "What is 7 × 100?", options: ["70","107","700","7000"], answer: "700", hint: "Add two zeros: 7 → 700" } },
  { id: "m15", age: "6-8", emoji: "9️⃣9️⃣", color: palette.red500,
    title: "Add 99 Trick", trick: "Add 100, then subtract 1!",
    example: "45 + 99 → 45+100 = 145 → 145−1 = 144",
    audioText: "The Add 99 Trick! To add 99, first add 100 then subtract 1. 45 plus 99: add 100 to get 145, minus 1 equals 144!",
    practiceQ: { question: "What is 56 + 99?", options: ["153","154","155","156"], answer: "155", hint: "56+100=156, minus 1=155" } },
  { id: "m16", age: "6-8", emoji: "➖", color: palette.amber500,
    title: "Subtract 9 Trick", trick: "Subtract 10, then add 1!",
    example: "56 − 9 → 56−10 = 46 → 46+1 = 47",
    audioText: "The Subtract 9 Trick! To subtract 9, first take away 10 and then add 1 back. 56 minus 9: minus 10 gives 46, plus 1 equals 47!",
    practiceQ: { question: "What is 43 − 9?", options: ["32","33","34","35"], answer: "34", hint: "43−10=33, plus 1=34" } },
  { id: "m17", age: "6-8", emoji: "8️⃣", color: brand.violet500,
    title: "Multiply by 8", trick: "Double 3 times!",
    example: "5 × 8 → ×2=10 → ×2=20 → ×2=40",
    audioText: "Multiply by 8! Double the number three times. 5 times 8: double 5 is 10, double 10 is 20, double 20 is 40!",
    practiceQ: { question: "What is 6 × 8?", options: ["42","46","48","52"], answer: "48", hint: "6×2=12, ×2=24, ×2=48" } },
  { id: "m18", age: "6-8", emoji: "6️⃣", color: palette.cyan500,
    title: "Multiply by 6", trick: "Multiply by 3, then double!",
    example: "8 × 6 → 8×3=24 → 24×2=48",
    audioText: "Multiply by 6! First multiply by 3, then double the result. 8 times 6: 8 times 3 is 24, doubled is 48!",
    practiceQ: { question: "What is 7 × 6?", options: ["36","40","42","44"], answer: "42", hint: "7×3=21, then ×2=42" } },
  { id: "m19", age: "6-8", emoji: "7️⃣", color: palette.green500,
    title: "Multiply by 7", trick: "Use 5s and 2s: ×5 + ×2!",
    example: "7 × 8 → 5×8=40 → 2×8=16 → 40+16=56",
    audioText: "Multiply by 7! Split it into 5 and 2. 7 times 8: 5 times 8 is 40, 2 times 8 is 16, add them to get 56!",
    practiceQ: { question: "What is 7 × 9?", options: ["54","56","63","65"], answer: "63", hint: "5×9=45 + 2×9=18 → 45+18=63" } },
  { id: "m20", age: "6-8", emoji: "1️⃣1️⃣", color: palette.red500,
    title: "Quick Square 11", trick: "11 × 11 = 121 (memorise!)",
    example: "1+1 = 2 in middle → 121",
    audioText: "11 squared equals 121! The middle digit is 1+1 which is 2. So 121. Remember it: one, two, one!",
    practiceQ: { question: "What is 11 × 11?", options: ["110","121","131","211"], answer: "121", hint: "11×11 = 121 — one, two, one!" } },
  { id: "m21", age: "6-8", emoji: "1️⃣2️⃣", color: palette.amber500,
    title: "Quick Square 12", trick: "12 × 12 = 144 (memorise!)",
    example: "12 × 12 = (10+2)² = 100+40+4 = 144",
    audioText: "12 squared equals 144! Remember: 144. You can check: 12 times 10 is 120, plus 12 times 2 is 24, total 144!",
    practiceQ: { question: "What is 12 × 12?", options: ["124","134","144","154"], answer: "144", hint: "12×12 = 144 — one, four, four!" } },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function dateSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickTodayTricks(pool: MathTrick[], childName: string, seenIds: string[]): MathTrick[] {
  const today = todayStr();
  const seed = dateSeed(today + childName);
  const fresh = pool.filter(t => !seenIds.includes(t.id));
  const src = fresh.length >= 2 ? fresh : pool;
  const shuffled = [...src];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = ((s * 1664525 + 1013904223) >>> 0);
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, 2);
}

const STORAGE_KEY = "amynest_math_tricks";

type MathState = {
  date: string;
  seenIds: string[];
  starIds: string[];
};

async function loadMathState(childName: string): Promise<MathState> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY}_${childName}`);
    if (raw) {
      const p: MathState = JSON.parse(raw);
      if (p.date !== todayStr()) {
        return { date: todayStr(), seenIds: p.seenIds.slice(-14), starIds: p.starIds };
      }
      return p;
    }
  } catch {}
  return { date: todayStr(), seenIds: [], starIds: [] };
}

async function saveMathState(childName: string, st: MathState) {
  try { await AsyncStorage.setItem(`${STORAGE_KEY}_${childName}`, JSON.stringify(st)); } catch {}
}

type Tab = "today" | "learn" | "practice";

export function SmartMathTricks({
  childName,
  childAgeYears,
}: {
  childName: string;
  childAgeYears: number;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const ageGroup: TrickAge = childAgeYears <= 6 ? "4-6" : "6-8";
  const pool = useMemo(() => TRICKS.filter(tr => tr.age === ageGroup), [ageGroup]);

  const [tab, setTab] = useState<Tab>("today");
  const [starIds, setStarIds] = useState<string[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const st = await loadMathState(childName);
      if (cancelled) return;
      setStarIds(st.starIds);
      setSeenIds(st.seenIds);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [childName]);

  const onStar = useCallback((id: string) => {
    setStarIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      void saveMathState(childName, { date: todayStr(), seenIds, starIds: next });
      return next;
    });
  }, [childName, seenIds]);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {/* Tab strip */}
      <View style={styles.tabRow}>
        {([
          { key: "today", label: "Today", icon: "✨" },
          { key: "learn", label: "Learn All", icon: "📚" },
          { key: "practice", label: "Practice", icon: "🎯" },
        ] as { key: Tab; label: string; icon: string }[]).map(item => {
          const active = tab === item.key;
          return (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.icon} {item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "today" && (
        <TodayTab pool={pool} childName={childName} starIds={starIds} seenIds={seenIds} onStar={onStar} />
      )}
      {tab === "learn" && (
        <LearnAllTab pool={pool} starIds={starIds} onStar={onStar} />
      )}
      {tab === "practice" && (
        <PracticeTab pool={pool} childName={childName} onStar={onStar} />
      )}
    </View>
  );
}

function TrickCard({
  trick, starred, onStar, expanded, onToggle, showPractice = false,
}: {
  trick: MathTrick;
  starred: boolean;
  onStar(): void;
  expanded: boolean;
  onToggle(): void;
  showPractice?: boolean;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { speak, stop, speaking, loading } = useAmyVoice();
  const [practiceMode, setPracticeMode] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSpeak = useCallback(() => {
    if (speaking || loading) { stop(); return; }
    void speak(trick.audioText);
  }, [speaking, loading, speak, stop, trick.audioText]);

  const handleSubmit = useCallback(() => {
    if (!selected) return;
    setSubmitted(true);
    if (selected === trick.practiceQ.answer) {
      void speak("Correct! Well done!");
      onStar();
    } else {
      void speak(`The correct answer is ${trick.practiceQ.answer}`);
    }
  }, [selected, trick, speak, onStar]);

  const resetPractice = () => {
    setSelected(null); setSubmitted(false); setPracticeMode(false);
  };

  const isCorrect = submitted && selected === trick.practiceQ.answer;

  return (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.cardHeader}>
        <Text style={{ fontSize: 26 }}>{trick.emoji}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle}>{trick.title}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{trick.trick}</Text>
        </View>
        {starred && <Text style={{ fontSize: 14 }}>⭐</Text>}
        <Text style={styles.chev}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {expanded && (
        <View style={{ padding: 12, paddingTop: 0, gap: 10 }}>
          <View style={[styles.box, { backgroundColor: `${trick.color}22`, borderColor: `${trick.color}44` }]}>
            <Text style={[styles.boxLabel, { color: trick.color }]}>{t("components.smart_math_tricks.how_it_works")}</Text>
            <Text style={styles.boxBody}>{trick.trick}</Text>
          </View>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>{t("components.smart_math_tricks.example")}</Text>
            <Text style={styles.exampleText}>{trick.example}</Text>
          </View>

          {!practiceMode && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={handleSpeak} style={[styles.actionBtn, (speaking || loading) && { borderColor: trick.color, backgroundColor: `${trick.color}33` }]}>
                <Text style={[styles.actionText, (speaking || loading) && { color: trick.color }]}>
                  {loading ? "⏳" : speaking ? "🔊 Playing…" : "🔈 Hear Trick"}
                </Text>
              </Pressable>
              {showPractice && (
                <Pressable onPress={() => setPracticeMode(true)} style={[styles.actionBtn, { backgroundColor: `${trick.color}22`, borderColor: `${trick.color}55` }]}>
                  <Text style={[styles.actionText, { color: trick.color }]}>{t("components.smart_math_tricks.try_it")}</Text>
                </Pressable>
              )}
              <Pressable onPress={onStar} style={[styles.starBtn, starred && { backgroundColor: "rgba(251,191,36,0.2)", borderColor: palette.amber400 }]}>
                <Text style={{ fontSize: 14, color: starred ? palette.amber400 : "rgba(255,255,255,0.4)" }}>{starred ? "⭐" : "☆"}</Text>
              </Pressable>
            </View>
          )}

          {practiceMode && (
            <View style={{ gap: 8 }}>
              <Text style={styles.qText}>{trick.practiceQ.question}</Text>
              <View style={styles.optGrid}>
                {trick.practiceQ.options.map(opt => {
                  const isC = opt === trick.practiceQ.answer;
                  const isSel = selected === opt;
                  let bg: string = "rgba(255,255,255,0.07)";
                  let border: string = "rgba(255,255,255,0.12)";
                  let color: string = c.foreground;
                  if (submitted) {
                    if (isC) { bg = "rgba(34,197,94,0.2)"; border = palette.green500; }
                    else if (isSel && !isC) { bg = "rgba(239,68,68,0.2)"; border = palette.red500; }
                    else { color = c.textDim; }
                  } else if (isSel) { bg = `${trick.color}25`; border = trick.color; }
                  return (
                    <Pressable
                      key={opt}
                      disabled={submitted}
                      onPress={() => setSelected(opt)}
                      style={[styles.optBtn, { backgroundColor: bg, borderColor: border }]}
                    >
                      <Text style={[styles.optText, { color }]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {!submitted ? (
                <Pressable onPress={handleSubmit} disabled={!selected} style={[styles.submitBtn, { backgroundColor: trick.color }, !selected && { opacity: 0.3 }]}>
                  <Text style={styles.submitText}>{t("components.smart_math_tricks.check")}</Text>
                </Pressable>
              ) : (
                <View style={{ gap: 6 }}>
                  <View style={[styles.feedback, { backgroundColor: isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }]}>
                    <Text style={{ color: isCorrect ? palette.green400 : palette.red400, fontSize: 12, fontWeight: "700", textAlign: "center" }}>
                      {isCorrect ? `✅ Correct! ${trick.practiceQ.hint}` : `❌ Answer: ${trick.practiceQ.answer} — ${trick.practiceQ.hint}`}
                    </Text>
                  </View>
                  <Pressable onPress={resetPractice} style={styles.backBtn}>
                    <Text style={styles.backText}>{t("components.smart_math_tricks.back_to_trick")}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function TodayTab({ pool, childName, starIds, seenIds, onStar }: {
  pool: MathTrick[]; childName: string; starIds: string[]; seenIds: string[]; onStar(id: string): void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const todayTricks = useMemo(() => pickTodayTricks(pool, childName, seenIds), [pool, childName, seenIds]);
  const [expanded, setExpanded] = useState<string | null>(todayTricks[0]?.id ?? null);

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.tabHint}>{t("components.smart_math_tricks.2_new_tricks_every_day")}</Text>
      {todayTricks.map(tr => (
        <TrickCard
          key={tr.id}
          trick={tr}
          starred={starIds.includes(tr.id)}
          onStar={() => onStar(tr.id)}
          expanded={expanded === tr.id}
          onToggle={() => setExpanded(prev => prev === tr.id ? null : tr.id)}
          showPractice
        />
      ))}
      <Text style={styles.footHint}>{t("components.smart_math_tricks.new_tricks_unlock_tomorrow")}</Text>
    </View>
  );
}

function LearnAllTab({ pool, starIds, onStar }: {
  pool: MathTrick[]; starIds: string[]; onStar(id: string): void;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const mastered = pool.filter(tr => starIds.includes(tr.id)).length;

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.statsRow}>
        <Text style={styles.tabHint}>{pool.length} tricks in your level</Text>
        <Text style={[styles.tabHint, { color: palette.amber400, fontWeight: "700" }]}>⭐ {mastered}/{pool.length} mastered</Text>
      </View>
      {pool.map(tr => (
        <TrickCard
          key={tr.id}
          trick={tr}
          starred={starIds.includes(tr.id)}
          onStar={() => onStar(tr.id)}
          expanded={expanded === tr.id}
          onToggle={() => setExpanded(prev => prev === tr.id ? null : tr.id)}
          showPractice
        />
      ))}
    </View>
  );
}

function PracticeTab({ pool, childName, onStar }: {
  pool: MathTrick[]; childName: string; onStar(id: string): void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const SESSION_SIZE = Math.min(5, pool.length);

  const [sessionTricks] = useState<MathTrick[]>(() => {
    const seed = dateSeed(todayStr() + childName + "practice");
    const arr = [...pool];
    let s = seed;
    for (let i = arr.length - 1; i > 0; i--) {
      s = ((s * 1664525 + 1013904223) >>> 0);
      const j = s % (i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr.slice(0, SESSION_SIZE);
  });

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<(boolean | null)[]>(Array(SESSION_SIZE).fill(null));
  const [done, setDone] = useState(false);
  const { speak, stop } = useAmyVoice();

  const cur = sessionTricks[idx];
  const lastIdxRef = useRef(-1);

  useEffect(() => {
    if (!cur) return;
    if (lastIdxRef.current === idx) return;
    lastIdxRef.current = idx;
    void speak(cur.practiceQ.question);
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const handleSubmit = () => {
    if (!selected || submitted || !cur) return;
    stop();
    const isC = selected === cur.practiceQ.answer;
    setSubmitted(true);
    setResults(prev => { const n = [...prev]; n[idx] = isC; return n; });
    if (isC) { void speak("Correct! Well done!"); onStar(cur.id); }
    else { void speak(`The correct answer is ${cur.practiceQ.answer}. ${cur.practiceQ.hint}`); }
  };

  const handleNext = () => {
    stop();
    if (idx + 1 >= SESSION_SIZE) { setDone(true); }
    else { setIdx(i => i + 1); setSelected(null); setSubmitted(false); }
  };

  const handleRestart = () => {
    stop(); setIdx(0); setSelected(null); setSubmitted(false);
    setResults(Array(SESSION_SIZE).fill(null)); setDone(false);
    lastIdxRef.current = -1;
  };

  if (done) {
    const correct = results.filter(Boolean).length;
    const pct = Math.round((correct / SESSION_SIZE) * 100);
    return (
      <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
        <Text style={{ fontSize: 56 }}>🏆</Text>
        <Text style={[styles.qText, { fontSize: 16 }]}>{t("components.smart_math_tricks.practice_complete")}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {results.map((r, i) => <Text key={i} style={{ fontSize: 22 }}>{r ? "⭐" : "💔"}</Text>)}
        </View>
        <View style={[styles.scorePill, { backgroundColor: pct === 100 ? "rgba(251,191,36,0.2)" : "rgba(148,163,184,0.2)" }]}>
          <Text style={[styles.scoreText, { color: pct === 100 ? palette.amber400 : c.textMuted }]}>
            {correct}/{SESSION_SIZE} ⭐
          </Text>
        </View>
        <Text style={[styles.tabHint, { textAlign: "center" }]}>
          {pct === 100 ? "🌟 Perfect! You're a math genius!" : pct >= 60 ? "👍 Great work! Keep practising!" : "💪 Keep going — you'll nail it!"}
        </Text>
        <Pressable onPress={handleRestart} style={[styles.submitBtn, { backgroundColor: palette.amber500, paddingHorizontal: 32 }]}>
          <Text style={styles.submitText}>{t("components.smart_math_tricks.try_again")}</Text>
        </Pressable>
      </View>
    );
  }

  if (!cur) return null;
  const isCorrect = submitted && selected === cur.practiceQ.answer;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
        {results.map((r, i) => (
          <Text key={i} style={{ fontSize: 14 }}>
            {r === true ? "⭐" : r === false ? "💔" : i === idx ? "👉" : "○"}
          </Text>
        ))}
      </View>
      <View style={styles.questionBox}>
        <Text style={styles.qHeader}>Q {idx + 1} of {SESSION_SIZE}</Text>
        <Text style={styles.qText}>{cur.practiceQ.question}</Text>
      </View>
      <View style={styles.optGrid}>
        {cur.practiceQ.options.map(opt => {
          const isC = opt === cur.practiceQ.answer;
          const isSel = selected === opt;
          let bg: string = "rgba(255,255,255,0.07)";
          let border: string = "rgba(255,255,255,0.12)";
          let color: string = c.foreground;
          if (submitted) {
            if (isC) { bg = "rgba(34,197,94,0.2)"; border = palette.green500; }
            else if (isSel) { bg = "rgba(239,68,68,0.2)"; border = palette.red500; }
            else { color = c.textDim; }
          } else if (isSel) { bg = "rgba(245,158,11,0.2)"; border = palette.amber500; }
          return (
            <Pressable
              key={opt}
              disabled={submitted}
              onPress={() => setSelected(opt)}
              style={[styles.optBtn, { backgroundColor: bg, borderColor: border }]}
            >
              <Text style={[styles.optText, { color }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {submitted && (
        <View style={[styles.feedback, { backgroundColor: isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }]}>
          <Text style={{ color: isCorrect ? palette.green400 : palette.red400, fontSize: 12, fontWeight: "700", textAlign: "center" }}>
            {isCorrect ? `✅ ${cur.practiceQ.hint}` : `❌ Correct: ${cur.practiceQ.answer} — ${cur.practiceQ.hint}`}
          </Text>
        </View>
      )}
      {submitted && (
        <View style={[styles.box, { backgroundColor: `${cur.color}15`, borderColor: `${cur.color}33` }]}>
          <Text style={[styles.boxBody, { color: cur.color, fontSize: 12 }]}>
            {cur.emoji}  {cur.title}: {cur.trick}
          </Text>
        </View>
      )}
      {!submitted ? (
        <Pressable onPress={handleSubmit} disabled={!selected} style={[styles.submitBtn, { backgroundColor: palette.amber500 }, !selected && { opacity: 0.3 }]}>
          <Text style={styles.submitText}>{t("components.smart_math_tricks.check_answer")}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={handleNext} style={[styles.submitBtn, { backgroundColor: idx + 1 >= SESSION_SIZE ? palette.amber500 : palette.indigo500 }]}>
          <Text style={styles.submitText}>{idx + 1 >= SESSION_SIZE ? "🏆 See Results!" : "Next →"}</Text>
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { paddingVertical: 24, alignItems: "center", gap: 8 },
    tabRow: { flexDirection: "row", gap: 6, padding: 4, borderRadius: 12, backgroundColor: c.calloutBg, borderWidth: 1, borderColor: c.glassBorder },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
    tabActive: { backgroundColor: c.primary },
    tabText: { color: c.textBody, fontWeight: "700", fontSize: 12 },
    tabTextActive: { color: "#fff" },
    tabHint: { color: c.textDim, fontSize: 11.5 },
    footHint: { color: c.textDim, fontSize: 10.5, textAlign: "center", paddingTop: 4 },
    statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 },

    card: { borderRadius: 14, backgroundColor: c.calloutBg, borderWidth: 1, borderColor: c.glassBorder, overflow: "hidden" },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
    cardTitle: { color: c.foreground, fontWeight: "800", fontSize: 13 },
    cardSub: { color: c.textDim, fontSize: 11, marginTop: 2 },
    chev: { color: c.textDim, fontSize: 14 },

    box: { padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
    boxLabel: { fontSize: 10, fontWeight: "800", marginBottom: 4, letterSpacing: 0.5 },
    boxBody: { color: c.foreground, fontWeight: "800", fontSize: 13, textAlign: "center" },

    exampleBox: { padding: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center" },
    exampleLabel: { color: c.textDim, fontWeight: "700", fontSize: 10, marginBottom: 2, letterSpacing: 0.5 },
    exampleText: { color: c.foreground, fontWeight: "800", fontSize: 12 },

    actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.08)" },
    actionText: { color: c.textBody, fontWeight: "700", fontSize: 11.5 },
    starBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.08)" },

    qText: { color: c.foreground, fontWeight: "800", fontSize: 14, textAlign: "center" },
    qHeader: { color: c.textDim, fontSize: 10, fontWeight: "800", marginBottom: 4, textAlign: "center" },
    questionBox: { padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },

    optGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    optBtn: { flexBasis: "48%", flexGrow: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
    optText: { fontWeight: "800", fontSize: 13 },

    submitBtn: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
    submitText: { color: "#fff", fontWeight: "800", fontSize: 13 },

    feedback: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },

    backBtn: { paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)" },
    backText: { color: c.textDim, fontWeight: "700", fontSize: 11 },

    scorePill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16 },
    scoreText: { fontSize: 20, fontWeight: "800" },
  });
}
