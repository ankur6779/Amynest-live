import { useState, useCallback, useEffect, useRef } from "react";
import { useAmyVoice } from "@/hooks/use-amy-voice";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Trick data ───────────────────────────────────────────────────────────────

const TRICKS: MathTrick[] = [
  // ── Age 4–6 ────────────────────────────────────────────────────────────────
  {
    id: "t01", age: "4-6", emoji: "🔟", color: "#f59e0b",
    title: "Add 10 Easily",
    trick: "Just add 1 to the tens digit!",
    example: "23 + 10 = 33  →  tens: 2 becomes 3",
    audioText: "Add 10 Easily! When you add 10 to any number, the tens digit goes up by 1. So 23 plus 10 equals 33 — the 2 becomes a 3, and the 3 stays!",
    practiceQ: { question: "What is 35 + 10?", options: ["43","44","45","46"], answer: "45", hint: "Add 1 to the tens digit: 3 becomes 4 → 45" },
  },
  {
    id: "t02", age: "4-6", emoji: "9️⃣", color: "#8b5cf6",
    title: "Add 9 Trick",
    trick: "Add 10, then subtract 1!",
    example: "24 + 9 → 24 + 10 = 34 → 34 − 1 = 33",
    audioText: "The Add 9 Trick! To add 9 to any number, first add 10, then take away 1. Try 24 plus 9: add 10 to get 34, then minus 1 is 33!",
    practiceQ: { question: "What is 16 + 9?", options: ["24","25","26","27"], answer: "25", hint: "16 + 10 = 26, minus 1 = 25" },
  },
  {
    id: "t03", age: "4-6", emoji: "✌️", color: "#22c55e",
    title: "Double Numbers",
    trick: "Add the number to itself!",
    example: "6 + 6 = 12  →  double of 6",
    audioText: "Doubling! When you add a number to itself, you double it. 6 plus 6 equals 12. Try doubling 7 — seven plus seven is 14!",
    practiceQ: { question: "What is 8 + 8?", options: ["14","15","16","17"], answer: "16", hint: "Double 8 → 8 + 8 = 16" },
  },
  {
    id: "t04", age: "4-6", emoji: "🌟", color: "#06b6d4",
    title: "Near Double",
    trick: "Double the smaller, then add 1!",
    example: "6 + 7 → 6+6 = 12, then +1 = 13",
    audioText: "Near Doubles! When two numbers are close, double the smaller one and add 1. For 6 plus 7: double 6 is 12, add 1 equals 13!",
    practiceQ: { question: "What is 5 + 6?", options: ["10","11","12","13"], answer: "11", hint: "Double 5 = 10, add 1 = 11" },
  },
  {
    id: "t05", age: "4-6", emoji: "5️⃣", color: "#ef4444",
    title: "Add 5 Trick",
    trick: "Add 10, then subtract 5!",
    example: "12 + 5 → 12 + 10 = 22 → 22 − 5 = 17",
    audioText: "The Add 5 Trick! To add 5, first add 10 and then take away 5. So 12 plus 5: add 10 to get 22, subtract 5 equals 17!",
    practiceQ: { question: "What is 14 + 5?", options: ["18","19","20","21"], answer: "19", hint: "14 + 10 = 24, minus 5 = 19" },
  },

  // ── Age 6–8 ────────────────────────────────────────────────────────────────
  {
    id: "m01", age: "6-8", emoji: "⚡", color: "#8b5cf6",
    title: "Multiply by 9",
    trick: "Multiply by 10, then subtract the number!",
    example: "9 × 7 → 10×7 = 70 → 70 − 7 = 63",
    audioText: "Multiply by 9! Instead of struggling, multiply by 10 and subtract the number. 9 times 7: 10 times 7 is 70, minus 7 equals 63!",
    practiceQ: { question: "What is 9 × 8?", options: ["63","72","81","54"], answer: "72", hint: "10×8 = 80, minus 8 = 72" },
  },
  {
    id: "m02", age: "6-8", emoji: "1️⃣1️⃣", color: "#f59e0b",
    title: "Multiply by 11",
    trick: "Add the two digits and place in the middle!",
    example: "23 × 11: 2+(2+3)+3 = 253",
    audioText: "Multiply by 11! For any two-digit number, add its digits and put the sum in the middle. 23 times 11: 2 and 3 add to 5, so the answer is 253!",
    practiceQ: { question: "What is 14 × 11?", options: ["144","154","164","174"], answer: "154", hint: "1 + 4 = 5, put 5 in middle → 154" },
  },
  {
    id: "m03", age: "6-8", emoji: "💠", color: "#06b6d4",
    title: "Square Ending in 5",
    trick: "Multiply first digit by (first digit + 1), then add 25!",
    example: "25² → 2×3 = 6 → 625",
    audioText: "Squaring numbers that end in 5! Take the first digit, multiply it by one more than itself, then put 25 at the end. 25 squared: 2 times 3 is 6, so the answer is 625!",
    practiceQ: { question: "What is 35²?", options: ["1025","1125","1225","1325"], answer: "1225", hint: "3×4 = 12, add 25 → 1225" },
  },
  {
    id: "m04", age: "6-8", emoji: "✋", color: "#22c55e",
    title: "Multiply by 5",
    trick: "Multiply by 10, then divide by 2!",
    example: "8 × 5 → 8×10 = 80 → 80÷2 = 40",
    audioText: "Multiply by 5! To multiply any number by 5, first multiply by 10 and then cut it in half. 8 times 5: 8 times 10 is 80, divided by 2 equals 40!",
    practiceQ: { question: "What is 14 × 5?", options: ["60","65","70","75"], answer: "70", hint: "14 × 10 = 140, ÷2 = 70" },
  },
  {
    id: "m05", age: "6-8", emoji: "4️⃣", color: "#ef4444",
    title: "Multiply by 4",
    trick: "Double the number twice!",
    example: "6 × 4 → 6×2 = 12 → 12×2 = 24",
    audioText: "Multiply by 4! Just double the number twice. 6 times 4: first double 6 to get 12, then double 12 to get 24!",
    practiceQ: { question: "What is 7 × 4?", options: ["24","26","28","30"], answer: "28", hint: "7×2 = 14, then 14×2 = 28" },
  },
  {
    id: "m06", age: "6-8", emoji: "💯", color: "#f59e0b",
    title: "Multiply by 25",
    trick: "Divide by 4, then multiply by 100!",
    example: "8 × 25 → 8÷4 = 2 → 2×100 = 200",
    audioText: "Multiply by 25! Divide the number by 4 and add two zeros. 8 times 25: 8 divided by 4 is 2, then add two zeros to get 200!",
    practiceQ: { question: "What is 12 × 25?", options: ["200","250","300","350"], answer: "300", hint: "12÷4 = 3, then ×100 = 300" },
  },
  {
    id: "m07", age: "6-8", emoji: "5️⃣0️⃣", color: "#8b5cf6",
    title: "Multiply by 50",
    trick: "Multiply by 100, then divide by 2!",
    example: "6 × 50 → 6×100 = 600 → 600÷2 = 300",
    audioText: "Multiply by 50! Multiply by 100 and halve it. 6 times 50: 6 times 100 is 600, divided by 2 equals 300!",
    practiceQ: { question: "What is 8 × 50?", options: ["300","350","400","450"], answer: "400", hint: "8×100 = 800, ÷2 = 400" },
  },
  {
    id: "m08", age: "6-8", emoji: "💯", color: "#06b6d4",
    title: "Subtract from 100",
    trick: "Subtract each digit from 9, last from 10!",
    example: "100 − 47 → (9−4)(10−7) = 53",
    audioText: "Subtract from 100! For each digit except the last, subtract from 9. For the last digit, subtract from 10. 100 minus 47: 9 minus 4 is 5, and 10 minus 7 is 3, so the answer is 53!",
    practiceQ: { question: "What is 100 − 63?", options: ["27","37","47","57"], answer: "37", hint: "9−6=3, 10−3=7 → 37" },
  },
  {
    id: "m09", age: "6-8", emoji: "🚀", color: "#22c55e",
    title: "Add Big Numbers Fast",
    trick: "Round up, then adjust!",
    example: "98 + 36 → 100 + 36 = 136 → 136−2 = 134",
    audioText: "Add big numbers fast! Round one number to a friendly number, add, then adjust. 98 plus 36: round 98 to 100, add 36 to get 136, then subtract 2 to get 134!",
    practiceQ: { question: "What is 99 + 47?", options: ["144","145","146","147"], answer: "146", hint: "100 + 47 = 147, minus 1 = 146" },
  },
  {
    id: "m10", age: "6-8", emoji: "✖️", color: "#ef4444",
    title: "Multiply by 2",
    trick: "Just double the number!",
    example: "9 × 2 = 18  →  double of 9",
    audioText: "Multiply by 2! Just double the number. 9 times 2 equals 18. Easy as that!",
    practiceQ: { question: "What is 13 × 2?", options: ["24","25","26","27"], answer: "26", hint: "Just double: 13+13 = 26" },
  },
  {
    id: "m11", age: "6-8", emoji: "3️⃣", color: "#f59e0b",
    title: "Multiply by 3",
    trick: "Double the number, then add it once more!",
    example: "7 × 3 → 7×2 = 14 → 14+7 = 21",
    audioText: "Multiply by 3! Double the number and add it one more time. 7 times 3: double 7 is 14, add 7 equals 21!",
    practiceQ: { question: "What is 8 × 3?", options: ["21","22","23","24"], answer: "24", hint: "8×2 = 16, plus 8 = 24" },
  },
  {
    id: "m12", age: "6-8", emoji: "➗", color: "#8b5cf6",
    title: "Divide by 2",
    trick: "Just halve the number!",
    example: "20 ÷ 2 = 10  →  half of 20",
    audioText: "Divide by 2! Just find half of the number. Half of 20 is 10. Half of 36 is 18!",
    practiceQ: { question: "What is 36 ÷ 2?", options: ["16","17","18","19"], answer: "18", hint: "Half of 36 = 18" },
  },
  {
    id: "m13", age: "6-8", emoji: "🔟", color: "#06b6d4",
    title: "Multiply by 10",
    trick: "Add a zero at the end!",
    example: "7 × 10 = 70  →  just add 0",
    audioText: "Multiply by 10! The easiest trick — just add a zero to the end of the number. 7 times 10 is 70. 23 times 10 is 230!",
    practiceQ: { question: "What is 15 × 10?", options: ["105","115","150","151"], answer: "150", hint: "Add zero: 15 → 150" },
  },
  {
    id: "m14", age: "6-8", emoji: "💯", color: "#22c55e",
    title: "Multiply by 100",
    trick: "Add two zeros at the end!",
    example: "5 × 100 = 500  →  add 00",
    audioText: "Multiply by 100! Add two zeros to the end. 5 times 100 is 500. 12 times 100 is 1200!",
    practiceQ: { question: "What is 7 × 100?", options: ["70","107","700","7000"], answer: "700", hint: "Add two zeros: 7 → 700" },
  },
  {
    id: "m15", age: "6-8", emoji: "9️⃣9️⃣", color: "#ef4444",
    title: "Add 99 Trick",
    trick: "Add 100, then subtract 1!",
    example: "45 + 99 → 45+100 = 145 → 145−1 = 144",
    audioText: "The Add 99 Trick! To add 99, first add 100 then subtract 1. 45 plus 99: add 100 to get 145, minus 1 equals 144!",
    practiceQ: { question: "What is 56 + 99?", options: ["153","154","155","156"], answer: "155", hint: "56+100=156, minus 1=155" },
  },
  {
    id: "m16", age: "6-8", emoji: "➖", color: "#f59e0b",
    title: "Subtract 9 Trick",
    trick: "Subtract 10, then add 1!",
    example: "56 − 9 → 56−10 = 46 → 46+1 = 47",
    audioText: "The Subtract 9 Trick! To subtract 9, first take away 10 and then add 1 back. 56 minus 9: minus 10 gives 46, plus 1 equals 47!",
    practiceQ: { question: "What is 43 − 9?", options: ["32","33","34","35"], answer: "34", hint: "43−10=33, plus 1=34" },
  },
  {
    id: "m17", age: "6-8", emoji: "8️⃣", color: "#8b5cf6",
    title: "Multiply by 8",
    trick: "Double 3 times!",
    example: "5 × 8 → ×2=10 → ×2=20 → ×2=40",
    audioText: "Multiply by 8! Double the number three times. 5 times 8: double 5 is 10, double 10 is 20, double 20 is 40!",
    practiceQ: { question: "What is 6 × 8?", options: ["42","46","48","52"], answer: "48", hint: "6×2=12, ×2=24, ×2=48" },
  },
  {
    id: "m18", age: "6-8", emoji: "6️⃣", color: "#06b6d4",
    title: "Multiply by 6",
    trick: "Multiply by 3, then double!",
    example: "8 × 6 → 8×3=24 → 24×2=48",
    audioText: "Multiply by 6! First multiply by 3, then double the result. 8 times 6: 8 times 3 is 24, doubled is 48!",
    practiceQ: { question: "What is 7 × 6?", options: ["36","40","42","44"], answer: "42", hint: "7×3=21, then ×2=42" },
  },
  {
    id: "m19", age: "6-8", emoji: "7️⃣", color: "#22c55e",
    title: "Multiply by 7",
    trick: "Use 5s and 2s: ×5 + ×2!",
    example: "7 × 8 → 5×8=40 → 2×8=16 → 40+16=56",
    audioText: "Multiply by 7! Split it into 5 and 2. 7 times 8: 5 times 8 is 40, 2 times 8 is 16, add them to get 56!",
    practiceQ: { question: "What is 7 × 9?", options: ["54","56","63","65"], answer: "63", hint: "5×9=45 + 2×9=18 → 45+18=63" },
  },
  {
    id: "m20", age: "6-8", emoji: "1️⃣1️⃣", color: "#ef4444",
    title: "Quick Square 11",
    trick: "11 × 11 = 121 (memorise!)",
    example: "1+1 = 2 in middle → 121",
    audioText: "11 squared equals 121! The middle digit is 1+1 which is 2. So 121. Remember it: one, two, one!",
    practiceQ: { question: "What is 11 × 11?", options: ["110","121","131","211"], answer: "121", hint: "11×11 = 121 — one, two, one!" },
  },
  {
    id: "m21", age: "6-8", emoji: "1️⃣2️⃣", color: "#f59e0b",
    title: "Quick Square 12",
    trick: "12 × 12 = 144 (memorise!)",
    example: "12 × 12 = (10+2)² = 100+40+4 = 144",
    audioText: "12 squared equals 144! Remember: 144. You can check: 12 times 10 is 120, plus 12 times 2 is 24, total 144!",
    practiceQ: { question: "What is 12 × 12?", options: ["124","134","144","154"], answer: "144", hint: "12×12 = 144 — one, four, four!" },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }

function dateSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickTodayTricks(pool: MathTrick[], childName: string, seenIds: string[]): MathTrick[] {
  const today = todayStr();
  const seed  = dateSeed(today + childName);
  const fresh = pool.filter(t => !seenIds.includes(t.id));
  const src   = fresh.length >= 2 ? fresh : pool;
  const shuffled = [...src];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = ((s * 1664525 + 1013904223) >>> 0);
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, 2);
}

const LS = "amynest_math_tricks";

type MathState = {
  date: string;
  seenIds: string[];     // last 7 days
  starIds: string[];     // mastered tricks
  practiceIdx: number;   // current practice position
  practiceResults: Record<string, boolean>;
};

function loadMathState(childName: string): MathState {
  try {
    const raw = localStorage.getItem(`${LS}_${childName}`);
    if (raw) {
      const p: MathState = JSON.parse(raw);
      if (p.date !== todayStr()) {
        return { date: todayStr(), seenIds: p.seenIds.slice(-14), starIds: p.starIds, practiceIdx: 0, practiceResults: {} };
      }
      return p;
    }
  } catch {}
  return { date: todayStr(), seenIds: [], starIds: [], practiceIdx: 0, practiceResults: {} };
}

function saveMathState(childName: string, st: MathState) {
  try { localStorage.setItem(`${LS}_${childName}`, JSON.stringify(st)); } catch {}
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const MATH_STYLES = `
  @keyframes mt-appear  { from { opacity:0; transform:translateY(12px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
  @keyframes mt-correct { 0% { transform:scale(1) } 25% { transform:scale(1.06) } 70% { transform:scale(1.02) } 100% { transform:scale(1) } }
  @keyframes mt-wrong   { 0% { transform:translateX(0) } 20% { transform:translateX(-8px) } 40% { transform:translateX(8px) } 60% { transform:translateX(-6px) } 80% { transform:translateX(6px) } 100% { transform:translateX(0) } }
  @keyframes mt-pop     { 0% { opacity:0; transform:scale(0.3) } 60% { transform:scale(1.15) } 100% { opacity:1; transform:scale(1) } }
  @keyframes mt-float   { 0% { opacity:1; transform:translateY(0) scale(1) } 100% { opacity:0; transform:translateY(-64px) scale(1.8) } }
  @keyframes mt-shine   { 0% { background-position:200% center } 100% { background-position:-200% center } }
`;

// ─── Floating stars ───────────────────────────────────────────────────────────

function FloatStars({ k }: { k: number }) {
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"visible" }} aria-hidden>
      {["⭐","✨","🌟","💫","⭐","✨"].map((s, i) => (
        <span key={`${k}-${i}`} style={{
          position:"absolute", left:`${10 + i * 15}%`, bottom:"20%",
          fontSize: 18 + (i % 3) * 6,
          animation: `mt-float ${0.7 + i * 0.1}s ${i * 0.07}s ease-out forwards`,
        }}>{s}</span>
      ))}
    </div>
  );
}

// ─── Trick card ───────────────────────────────────────────────────────────────

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
  const { speak, stop, speaking, loading } = useAmyVoice();
  const [practiceMode, setPracticeMode] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [floatKey, setFloatKey] = useState(0);

  const handleSpeak = useCallback(() => {
    if (speaking || loading) { stop(); return; }
    void speak(trick.audioText);
  }, [speaking, loading, speak, stop, trick.audioText]);

  const handleSubmit = useCallback(() => {
    if (!selected) return;
    setSubmitted(true);
    if (selected === trick.practiceQ.answer) {
      setFloatKey(k => k + 1);
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
  const isWrong   = submitted && selected !== trick.practiceQ.answer;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: `1.5px solid rgba(255,255,255,0.1)`, animation: "mt-appear 300ms ease both" }}
    >
      {/* Card header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span style={{ fontSize: 28 }}>{trick.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm leading-tight">{trick.title}</p>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{trick.trick}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {starred && <span style={{ fontSize: 16 }}>⭐</span>}
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 18 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ animation: "mt-appear 200ms ease both" }}>
          {/* Example box */}
          <div
            className="rounded-xl px-4 py-3 text-center"
            style={{ background: `${trick.color}22`, border: `1px solid ${trick.color}44` }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: trick.color }}>HOW IT WORKS</p>
            <p className="font-black text-white text-base leading-snug">{trick.trick}</p>
          </div>
          <div
            className="rounded-xl px-4 py-3 text-center font-mono"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <p className="text-xs text-white/40 mb-1 font-sans font-bold">EXAMPLE</p>
            <p className="text-white font-black text-sm">{trick.example}</p>
          </div>

          {/* Actions row */}
          {!practiceMode && (
            <div className="flex gap-2">
              <button
                onClick={handleSpeak}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                style={{
                  background: (speaking || loading) ? `${trick.color}33` : "rgba(255,255,255,0.1)",
                  border: `1.5px solid ${(speaking || loading) ? trick.color : "rgba(255,255,255,0.15)"}`,
                  color: (speaking || loading) ? trick.color : "rgba(255,255,255,0.7)",
                }}
              >
                {loading ? "⏳" : speaking ? "🔊" : "🔈"} {speaking ? "Playing…" : "Hear Trick"}
              </button>
              {showPractice && (
                <button
                  onClick={() => setPracticeMode(true)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  style={{ background: `${trick.color}22`, border: `1.5px solid ${trick.color}55`, color: trick.color }}
                >
                  ✏️ Try It
                </button>
              )}
              <button
                onClick={() => { onStar(); }}
                className="px-3 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95"
                style={{ background: starred ? "#fbbf2433" : "rgba(255,255,255,0.08)", border: `1.5px solid ${starred ? "#fbbf24" : "rgba(255,255,255,0.12)"}`, color: starred ? "#fbbf24" : "rgba(255,255,255,0.4)" }}
                title="Mark as mastered"
              >
                {starred ? "⭐" : "☆"}
              </button>
            </div>
          )}

          {/* Practice mini quiz */}
          {practiceMode && (
            <div className="space-y-2.5 relative" style={{ animation: "mt-appear 200ms ease both" }}>
              {floatKey > 0 && <FloatStars k={floatKey} />}
              <p className="text-white font-black text-sm text-center py-1">{trick.practiceQ.question}</p>
              <div className="grid grid-cols-2 gap-2">
                {trick.practiceQ.options.map(opt => {
                  const isC = opt === trick.practiceQ.answer;
                  const isSel = selected === opt;
                  let bg = "rgba(255,255,255,0.07)";
                  let border = "rgba(255,255,255,0.12)";
                  let color = "white";
                  let anim = "none";
                  if (submitted) {
                    if (isC) { bg = "rgba(34,197,94,0.2)"; border = "#22c55e"; anim = "mt-correct 500ms ease both"; }
                    else if (isSel && !isC) { bg = "rgba(239,68,68,0.2)"; border = "#ef4444"; anim = "mt-wrong 400ms ease both"; }
                    else { color = "rgba(255,255,255,0.25)"; border = "rgba(255,255,255,0.06)"; }
                  } else if (isSel) { bg = `${trick.color}25`; border = trick.color; }
                  return (
                    <button key={opt} disabled={submitted} onClick={() => setSelected(opt)}
                      className="py-3 px-2 rounded-xl font-bold text-sm text-center transition-all active:scale-95 disabled:cursor-default"
                      style={{ background: bg, border: `1.5px solid ${border}`, color, animation: anim }}
                    >{opt}</button>
                  );
                })}
              </div>
              {!submitted ? (
                <button onClick={handleSubmit} disabled={!selected}
                  className="w-full py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-30"
                  style={{ background: `linear-gradient(135deg,${trick.color},${trick.color}cc)` }}
                >Check ✓</button>
              ) : (
                <div>
                  <div className="rounded-xl px-3 py-2 text-center text-xs font-bold mb-2"
                    style={{ background: isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: isCorrect ? "#4ade80" : "#f87171" }}>
                    {isCorrect ? `✅ Correct! ${trick.practiceQ.hint}` : `❌ Answer: ${trick.practiceQ.answer} — ${trick.practiceQ.hint}`}
                  </div>
                  <button onClick={resetPractice}
                    className="w-full py-2 rounded-xl font-bold text-xs text-white/60 hover:text-white/80 transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    ← Back to Trick
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Today's Tricks ──────────────────────────────────────────────────────

function TodayTab({ pool, childName, starIds, onStar }: {
  pool: MathTrick[]; childName: string; starIds: string[]; onStar(id: string): void;
}) {
  const [state]      = useState(() => loadMathState(childName));
  const todayTricks  = pickTodayTricks(pool, childName, state.seenIds);
  const [expanded, setExpanded] = useState<string | null>(todayTricks[0]?.id ?? null);

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 text-center">2 new tricks every day ✨</p>
      {todayTricks.map(t => (
        <TrickCard
          key={t.id}
          trick={t}
          starred={starIds.includes(t.id)}
          onStar={() => onStar(t.id)}
          expanded={expanded === t.id}
          onToggle={() => setExpanded(prev => prev === t.id ? null : t.id)}
          showPractice
        />
      ))}
      <div className="text-center pt-1">
        <p className="text-[11px] text-white/30">New tricks unlock tomorrow! 🌅</p>
      </div>
    </div>
  );
}

// ─── Tab: Learn All ───────────────────────────────────────────────────────────

function LearnAllTab({ pool, starIds, onStar }: {
  pool: MathTrick[]; starIds: string[]; onStar(id: string): void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const mastered = pool.filter(t => starIds.includes(t.id)).length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-white/40">{pool.length} tricks in your level</p>
        <p className="text-xs font-bold" style={{ color: "#fbbf24" }}>⭐ {mastered}/{pool.length} mastered</p>
      </div>
      {pool.map(t => (
        <TrickCard
          key={t.id}
          trick={t}
          starred={starIds.includes(t.id)}
          onStar={() => onStar(t.id)}
          expanded={expanded === t.id}
          onToggle={() => setExpanded(prev => prev === t.id ? null : t.id)}
          showPractice
        />
      ))}
    </div>
  );
}

// ─── Tab: Practice ────────────────────────────────────────────────────────────

function PracticeTab({ pool, childName, starIds, onStar }: {
  pool: MathTrick[]; childName: string; starIds: string[]; onStar(id: string): void;
}) {
  const SESSION_SIZE = Math.min(5, pool.length);
  const [sessionTricks] = useState(() => {
    const seed = dateSeed(todayStr() + childName + "practice");
    const arr  = [...pool];
    let s = seed;
    for (let i = arr.length - 1; i > 0; i--) {
      s = ((s * 1664525 + 1013904223) >>> 0);
      const j = s % (i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr.slice(0, SESSION_SIZE);
  });

  const [idx,       setIdx]       = useState(0);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results,   setResults]   = useState<(boolean | null)[]>(Array(SESSION_SIZE).fill(null));
  const [done,      setDone]      = useState(false);
  const [floatKey,  setFloatKey]  = useState(0);
  const { speak, stop } = useAmyVoice();

  const cur = sessionTricks[idx]!;

  // Auto-speak question
  const questionKeyRef = useRef(0);
  useEffect(() => {
    questionKeyRef.current++;
    if (!cur) return;
    void speak(cur.practiceQ.question);
    return () => { stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const handleSubmit = () => {
    if (!selected || submitted) return;
    stop();
    const isC = selected === cur.practiceQ.answer;
    setSubmitted(true);
    setResults(prev => { const n=[...prev]; n[idx]=isC; return n; });
    if (isC) { setFloatKey(k=>k+1); void speak("Correct! Well done!"); onStar(cur.id); }
    else      { void speak(`The correct answer is ${cur.practiceQ.answer}. ${cur.practiceQ.hint}`); }
  };

  const handleNext = () => {
    stop();
    if (idx+1 >= SESSION_SIZE) { setDone(true); }
    else { setIdx(i=>i+1); setSelected(null); setSubmitted(false); }
  };

  const handleRestart = () => {
    stop(); setIdx(0); setSelected(null); setSubmitted(false);
    setResults(Array(SESSION_SIZE).fill(null)); setDone(false);
  };

  if (done) {
    const correct = results.filter(Boolean).length;
    const pct = Math.round((correct/SESSION_SIZE)*100);
    return (
      <div className="text-center py-6 space-y-4" style={{ animation:"mt-appear 300ms ease both" }}>
        <div style={{ fontSize:64, animation:"mt-pop 500ms cubic-bezier(0.34,1.56,0.64,1) both" }}>🏆</div>
        <p className="text-white font-black text-lg">Practice Complete!</p>
        <div className="flex justify-center gap-1.5">
          {results.map((r, i) => <span key={i} style={{ fontSize:24, animation:`mt-pop 400ms ${i*80}ms ease both` }}>{r ? "⭐" : "💔"}</span>)}
        </div>
        <div className="rounded-2xl px-6 py-3 inline-block font-black text-2xl"
          style={{ background:"rgba(255,255,255,0.1)", color: pct===100?"#fbbf24":"#94a3b8" }}>
          {correct}/{SESSION_SIZE} ⭐
        </div>
        <p className="text-white/40 text-xs">
          {pct===100?"🌟 Perfect! You're a math genius!":pct>=60?"👍 Great work! Keep practising!":"💪 Keep going — you'll nail it!"}
        </p>
        <button onClick={handleRestart}
          className="w-full max-w-xs py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95"
          style={{ background:"linear-gradient(135deg,#f59e0b,#fbbf24)" }}>
          🔄 Try Again
        </button>
      </div>
    );
  }

  const isCorrect = submitted && selected === cur.practiceQ.answer;
  const isWrong   = submitted && selected !== cur.practiceQ.answer;

  return (
    <div className="space-y-3 relative">
      {floatKey > 0 && <FloatStars k={floatKey} />}

      {/* Progress */}
      <div className="flex items-center justify-center gap-1.5">
        {results.map((r, i) => (
          <span key={i} style={{ fontSize:16 }}>
            {r===true?"⭐":r===false?"💔":i===idx?"👉":"○"}
          </span>
        ))}
      </div>

      {/* Question */}
      <div
        className="rounded-2xl px-4 py-4 text-center"
        key={idx}
        style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", animation:"mt-appear 280ms ease both" }}
      >
        <p className="text-white/40 text-[11px] font-bold mb-2">Q {idx+1} of {SESSION_SIZE}</p>
        <p className="text-white font-black text-base leading-snug">{cur.practiceQ.question}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {cur.practiceQ.options.map(opt => {
          const isC = opt === cur.practiceQ.answer;
          const isSel = selected === opt;
          let bg = "rgba(255,255,255,0.07)";
          let border = "rgba(255,255,255,0.12)";
          let color = "white";
          let anim = "none";
          if (submitted) {
            if (isC) { bg="rgba(34,197,94,0.2)"; border="#22c55e"; anim="mt-correct 500ms ease both"; }
            else if (isSel) { bg="rgba(239,68,68,0.2)"; border="#ef4444"; anim="mt-wrong 400ms ease both"; }
            else { color="rgba(255,255,255,0.25)"; border="rgba(255,255,255,0.06)"; }
          } else if (isSel) { bg="rgba(245,158,11,0.2)"; border="#f59e0b"; }
          return (
            <button key={opt} disabled={submitted} onClick={() => setSelected(opt)}
              className="py-3.5 px-2 rounded-xl font-black text-sm text-center transition-all active:scale-95 disabled:cursor-default"
              style={{ background:bg, border:`2px solid ${border}`, color, animation:anim }}
            >{opt}</button>
          );
        })}
      </div>

      {/* Feedback */}
      {submitted && (
        <div className="rounded-xl px-4 py-2.5 text-center text-xs font-bold"
          style={{ animation:"mt-appear 200ms ease both", background:isCorrect?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)", color:isCorrect?"#4ade80":"#f87171" }}>
          {isCorrect ? `✅ ${cur.practiceQ.hint}` : `❌ Correct: ${cur.practiceQ.answer} — ${cur.practiceQ.hint}`}
        </div>
      )}

      {/* Trick reveal after submit */}
      {submitted && (
        <div className="rounded-xl px-3 py-2.5 text-center text-xs"
          style={{ background:`${cur.color}15`, border:`1px solid ${cur.color}33`, color:cur.color }}>
          <span style={{fontSize:16}}>{cur.emoji}</span> <strong>{cur.title}:</strong> {cur.trick}
        </div>
      )}

      {/* Action */}
      {!submitted ? (
        <button onClick={handleSubmit} disabled={!selected}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-30"
          style={{ background:"linear-gradient(135deg,#f59e0b,#fbbf24)" }}>
          Check Answer ✓
        </button>
      ) : (
        <button onClick={handleNext}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95"
          style={{ background: idx+1>=SESSION_SIZE ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          {idx+1>=SESSION_SIZE ? "🏆 See Results!" : "Next →"}
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "today" | "learn" | "practice";

interface SmartMathTricksProps {
  childName: string;
  ageYears: number;
}

export function SmartMathTricks({ childName, ageYears }: SmartMathTricksProps) {
  // Only for ages 4–8
  if (ageYears < 4 || ageYears > 8) return null;

  const trickAge: TrickAge = ageYears <= 6 ? "4-6" : "6-8";
  const pool = TRICKS.filter(t => t.age === trickAge);

  const [tab,     setTab]     = useState<Tab>("today");
  const [mathSt,  setMathSt]  = useState(() => loadMathState(childName));

  const handleStar = useCallback((id: string) => {
    setMathSt(prev => {
      const starIds = prev.starIds.includes(id)
        ? prev.starIds.filter(s => s !== id)
        : [...prev.starIds, id];
      const seenIds = prev.seenIds.includes(id) ? prev.seenIds : [...prev.seenIds, id];
      const next = { ...prev, starIds, seenIds };
      saveMathState(childName, next);
      return next;
    });
  }, [childName]);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "today",    label: "Today",    icon: "📅" },
    { key: "learn",    label: "Learn All", icon: "📚" },
    { key: "practice", label: "Practice",  icon: "✏️" },
  ];

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: "linear-gradient(160deg,#451a03 0%,#1c0a00 100%)" }}
    >
      <style>{MATH_STYLES}</style>

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-black text-base leading-tight">🧮 Smart Math Tricks</p>
            <p className="text-white/40 text-[11px] mt-0.5">
              {trickAge === "4-6" ? "Basic addition & counting tricks" : "Multiplication & mental math shortcuts"} · Age {trickAge}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold" style={{ color: "#fbbf24" }}>⭐ {mathSt.starIds.length}</p>
            <p className="text-[10px] text-white/30">mastered</p>
          </div>
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1 p-1 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2 rounded-xl font-bold text-xs transition-all active:scale-95"
              style={{
                background: tab === t.key ? "rgba(245,158,11,0.3)" : "transparent",
                color: tab === t.key ? "#fbbf24" : "rgba(255,255,255,0.4)",
                border: tab === t.key ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pb-4">
        {tab === "today" && (
          <TodayTab pool={pool} childName={childName} starIds={mathSt.starIds} onStar={handleStar} />
        )}
        {tab === "learn" && (
          <LearnAllTab pool={pool} starIds={mathSt.starIds} onStar={handleStar} />
        )}
        {tab === "practice" && (
          <PracticeTab pool={pool} childName={childName} starIds={mathSt.starIds} onStar={handleStar} />
        )}
      </div>
    </div>
  );
}
