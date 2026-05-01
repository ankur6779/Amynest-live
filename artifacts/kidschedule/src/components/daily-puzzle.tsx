import { useState, useEffect, useCallback, useRef } from "react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import type { AgeGroup } from "@/lib/age-groups";

// ─── Puzzle data ──────────────────────────────────────────────────────────────

type Puzzle = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: "easy" | "medium" | "hard";
  visual?: string;    // emoji object(s) shown above question for younger kids
  audioQ?: string;    // override spoken text (defaults to question)
};

const PUZZLES: Puzzle[] = [
  // ── EASY (preschool, 3–5 years) ──────────────────────────────────────────
  { id:"e01", difficulty:"easy", question:"What comes after A, B, C?",         options:["D","E","F","G"], correctAnswer:"D", visual:"🔤" },
  { id:"e02", difficulty:"easy", question:"What colour is the sky on a sunny day?", options:["Green","Blue","Red","Yellow"], correctAnswer:"Blue", visual:"☀️🌤️" },
  { id:"e03", difficulty:"easy", question:"How many fingers are on ONE hand?",  options:["4","6","5","10"], correctAnswer:"5", visual:"✋" },
  { id:"e04", difficulty:"easy", question:"Which animal says Moo?",              options:["Dog","Cat","Cow","Duck"], correctAnswer:"Cow", visual:"🐄" },
  { id:"e05", difficulty:"easy", question:"What shape is a ball?",               options:["Square","Triangle","Circle","Rectangle"], correctAnswer:"Circle", visual:"⚽" },
  { id:"e06", difficulty:"easy", question:"What comes after the number 4?",     options:["3","6","7","5"], correctAnswer:"5", visual:"4️⃣ → ?" },
  { id:"e07", difficulty:"easy", question:"Which fruit is yellow and curved?",   options:["Apple","Banana","Grape","Mango"], correctAnswer:"Banana", visual:"🍌" },
  { id:"e08", difficulty:"easy", question:"How many wheels does a car have?",   options:["2","3","4","6"], correctAnswer:"4", visual:"🚗" },
  { id:"e09", difficulty:"easy", question:"What do bees make?",                  options:["Milk","Honey","Butter","Juice"], correctAnswer:"Honey", visual:"🐝🍯" },
  { id:"e10", difficulty:"easy", question:"Which is the biggest animal?",        options:["Cat","Dog","Elephant","Rabbit"], correctAnswer:"Elephant", visual:"🐘" },
  { id:"e11", difficulty:"easy", question:"How many sides does a triangle have?", options:["2","4","5","3"], correctAnswer:"3", visual:"🔺" },
  { id:"e12", difficulty:"easy", question:"What do plants need to grow?",        options:["Sand and Ice","Sun and Water","Dark and Cold","Wind and Fire"], correctAnswer:"Sun and Water", visual:"🌱☀️💧" },
  { id:"e13", difficulty:"easy", question:"Which one can fly?",                  options:["Dog","Fish","Bird","Cat"], correctAnswer:"Bird", visual:"🐦" },
  { id:"e14", difficulty:"easy", question:"What colour is grass?",               options:["Blue","Red","Yellow","Green"], correctAnswer:"Green", visual:"🌿" },
  { id:"e15", difficulty:"easy", question:"How many days are in a week?",        options:["5","6","8","7"], correctAnswer:"7", visual:"📅" },
  { id:"e16", difficulty:"easy", question:"Which season is the coldest?",        options:["Summer","Spring","Winter","Autumn"], correctAnswer:"Winter", visual:"❄️🌨️" },
  { id:"e17", difficulty:"easy", question:"What do we use to brush our teeth?",  options:["Comb","Spoon","Toothbrush","Towel"], correctAnswer:"Toothbrush", visual:"🪥" },
  { id:"e18", difficulty:"easy", question:"Which number is the biggest?",        options:["3","7","2","5"], correctAnswer:"7", visual:"🔢" },

  // ── MEDIUM (early school, 6–10 years) ────────────────────────────────────
  { id:"m01", difficulty:"medium", question:"What is 8 × 7?",                   options:["54","56","63","48"], correctAnswer:"56" },
  { id:"m02", difficulty:"medium", question:"Which planet is closest to the Sun?", options:["Venus","Earth","Mercury","Mars"], correctAnswer:"Mercury" },
  { id:"m03", difficulty:"medium", question:"How many months are in a year?",   options:["10","11","12","13"], correctAnswer:"12" },
  { id:"m04", difficulty:"medium", question:"What is the capital of India?",     options:["Mumbai","Delhi","Chennai","Kolkata"], correctAnswer:"Delhi" },
  { id:"m05", difficulty:"medium", question:"What is 144 ÷ 12?",                options:["10","14","11","12"], correctAnswer:"12" },
  { id:"m06", difficulty:"medium", question:"Who invented the telephone?",       options:["Edison","Einstein","Bell","Newton"], correctAnswer:"Bell" },
  { id:"m07", difficulty:"medium", question:"What is 7² (seven squared)?",      options:["14","42","56","49"], correctAnswer:"49" },
  { id:"m08", difficulty:"medium", question:"How many sides does a hexagon have?", options:["5","8","6","7"], correctAnswer:"6" },
  { id:"m09", difficulty:"medium", question:"Which is the largest ocean?",       options:["Atlantic","Indian","Pacific","Arctic"], correctAnswer:"Pacific" },
  { id:"m10", difficulty:"medium", question:"What is 25 + 37?",                  options:["52","62","61","63"], correctAnswer:"62" },
  { id:"m11", difficulty:"medium", question:"What gas do plants breathe in?",    options:["Oxygen","Nitrogen","Carbon Dioxide","Hydrogen"], correctAnswer:"Carbon Dioxide" },
  { id:"m12", difficulty:"medium", question:"How many zeroes are in one million?", options:["5","7","4","6"], correctAnswer:"6" },
  { id:"m13", difficulty:"medium", question:"What is 25% of 200?",               options:["40","60","25","50"], correctAnswer:"50" },
  { id:"m14", difficulty:"medium", question:"Which instrument has 88 keys?",     options:["Guitar","Violin","Flute","Piano"], correctAnswer:"Piano" },
  { id:"m15", difficulty:"medium", question:"What is the boiling point of water in °C?", options:["90","100","80","110"], correctAnswer:"100" },
  { id:"m16", difficulty:"medium", question:"How many continents are on Earth?", options:["5","6","7","8"], correctAnswer:"7" },
  { id:"m17", difficulty:"medium", question:"What is the square root of 81?",    options:["7","8","10","9"], correctAnswer:"9" },
  { id:"m18", difficulty:"medium", question:"A triangle has angles of 60°, 60° and ___?", options:["90°","60°","45°","80°"], correctAnswer:"60°" },

  // ── HARD (pre-teen, 10–15 years) ─────────────────────────────────────────
  { id:"h01", difficulty:"hard", question:"A train travels at 60 km/h for 2.5 hours. How far?", options:["120 km","150 km","180 km","90 km"], correctAnswer:"150 km" },
  { id:"h02", difficulty:"hard", question:"What is the value of π to 2 decimal places?", options:["3.41","3.12","3.14","3.17"], correctAnswer:"3.14" },
  { id:"h03", difficulty:"hard", question:"If 5x = 35, what is x?",             options:["5","8","6","7"], correctAnswer:"7" },
  { id:"h04", difficulty:"hard", question:"Who wrote Romeo and Juliet?",          options:["Dickens","Austen","Shakespeare","Tolstoy"], correctAnswer:"Shakespeare" },
  { id:"h05", difficulty:"hard", question:"What is the speed of light (approx)?", options:["200,000 km/s","3,00,000 km/s","1,50,000 km/s","5,00,000 km/s"], correctAnswer:"3,00,000 km/s" },
  { id:"h06", difficulty:"hard", question:"What is the chemical symbol for Gold?", options:["Go","Gd","Au","Ag"], correctAnswer:"Au" },
  { id:"h07", difficulty:"hard", question:"In a class of 40, 60% are girls. How many boys?", options:["20","18","24","16"], correctAnswer:"16" },
  { id:"h08", difficulty:"hard", question:"What is the smallest prime number?",  options:["0","3","1","2"], correctAnswer:"2" },
  { id:"h09", difficulty:"hard", question:"Which element has atomic number 1?",  options:["Helium","Oxygen","Carbon","Hydrogen"], correctAnswer:"Hydrogen" },
  { id:"h10", difficulty:"hard", question:"What is 15% of 360?",                 options:["48","54","60","45"], correctAnswer:"54" },
  { id:"h11", difficulty:"hard", question:"The sum of angles in a quadrilateral is:", options:["180°","270°","360°","540°"], correctAnswer:"360°" },
  { id:"h12", difficulty:"hard", question:"If you fold a paper in half twice, how many layers?", options:["2","4","6","8"], correctAnswer:"4" },
  { id:"h13", difficulty:"hard", question:"What is the powerhouse of the cell?", options:["Nucleus","Ribosome","Mitochondria","Golgi Body"], correctAnswer:"Mitochondria" },
  { id:"h14", difficulty:"hard", question:"Solve: 2² + 3² + 4² = ?",            options:["25","27","29","30"], correctAnswer:"29" },
  { id:"h15", difficulty:"hard", question:"What is the freezing point of water in Fahrenheit?", options:["0°F","100°F","32°F","212°F"], correctAnswer:"32°F" },
  { id:"h16", difficulty:"hard", question:"A rectangle is 12cm × 8cm. What is its perimeter?", options:["40 cm","96 cm","32 cm","20 cm"], correctAnswer:"40 cm" },
  { id:"h17", difficulty:"hard", question:"A palindrome reads the same forwards and backwards. Which of these is one?", options:["race","level","tiger","panel"], correctAnswer:"level" },
  { id:"h18", difficulty:"hard", question:"What fraction of a day is 6 hours?",  options:["1/3","1/6","1/4","1/2"], correctAnswer:"1/4" },
];

// ─── State types ──────────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard";

type PuzzleState = {
  date: string;
  difficulty: Difficulty;
  correctStreak: number;
  wrongStreak: number;
  totalCorrect: number;
  totalAttempted: number;
  usedIds: string[];
};

const LS_KEY = "amynest_puzzle_v2";
const PER_SESSION = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

function dateSeed(dateStr: string, childName: string): number {
  const str = dateStr + childName;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getDefaultDifficulty(ageGroup: AgeGroup): Difficulty {
  if (ageGroup === "preschool") return "easy";
  if (ageGroup === "early_school") return "medium";
  return "hard";
}

function adjustDifficulty(cur: Difficulty, correct: number, wrong: number): Difficulty {
  if (correct >= 3) {
    if (cur === "easy") return "medium";
    if (cur === "medium") return "hard";
  }
  if (wrong >= 2) {
    if (cur === "hard") return "medium";
    if (cur === "medium") return "easy";
  }
  return cur;
}

function pickPuzzles(diff: Difficulty, seed: number, used: string[], n: number): Puzzle[] {
  let pool = PUZZLES.filter(p => p.difficulty === diff && !used.includes(p.id));
  if (pool.length < n) pool = PUZZLES.filter(p => p.difficulty === diff);
  if (pool.length < n) pool = PUZZLES;
  const src = [...pool];
  let s = seed;
  for (let i = src.length - 1; i > 0; i--) {
    s = ((s * 1664525 + 1013904223) >>> 0);
    const j = s % (i + 1);
    [src[i], src[j]] = [src[j]!, src[i]!];
  }
  return src.slice(0, n);
}

function loadState(childName: string, ageGroup: AgeGroup): PuzzleState {
  try {
    const raw = localStorage.getItem(LS_KEY + "_" + childName);
    if (raw) {
      const p: PuzzleState = JSON.parse(raw);
      if (p.date === todayStr()) return p;
      return { date: todayStr(), difficulty: p.difficulty, correctStreak: 0, wrongStreak: 0, totalCorrect: p.totalCorrect, totalAttempted: p.totalAttempted, usedIds: [] };
    }
  } catch {}
  return { date: todayStr(), difficulty: getDefaultDifficulty(ageGroup), correctStreak: 0, wrongStreak: 0, totalCorrect: 0, totalAttempted: 0, usedIds: [] };
}

function saveState(name: string, st: PuzzleState) {
  try { localStorage.setItem(LS_KEY + "_" + name, JSON.stringify(st)); } catch {}
}

// ─── Difficulty config ─────────────────────────────────────────────────────────

const DIFF_CFG: Record<Difficulty, { label: string; stars: string; color: string; bg: string; timer: number | null }> = {
  easy:   { label: "Easy",   stars: "⭐",       color: "#22c55e", bg: "rgba(34,197,94,0.12)",   timer: null },
  medium: { label: "Medium", stars: "⭐⭐",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)", timer: null },
  hard:   { label: "Hard",   stars: "⭐⭐⭐",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",   timer: 30 },
};

// ─── CSS keyframes (injected once) ──────────────────────────────────────────

const PUZZLE_STYLES = `
  @keyframes pz-appear    { from { opacity:0; transform:translateY(16px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
  @keyframes pz-correct   { 0% { transform:scale(1) } 25% { transform:scale(1.07) } 60% { transform:scale(1.03) } 100% { transform:scale(1) } }
  @keyframes pz-wrong     { 0% { transform:translateX(0) } 15% { transform:translateX(-10px) } 30% { transform:translateX(10px) } 45% { transform:translateX(-8px) } 60% { transform:translateX(8px) } 75% { transform:translateX(-4px) } 100% { transform:translateX(0) } }
  @keyframes pz-float-star { 0% { opacity:1; transform:translateY(0) scale(1) rotate(0deg) } 100% { opacity:0; transform:translateY(-80px) scale(2) rotate(30deg) } }
  @keyframes pz-pop       { 0% { opacity:0; transform:scale(0.2) } 55% { transform:scale(1.15) } 80% { transform:scale(0.95) } 100% { opacity:1; transform:scale(1) } }
  @keyframes pz-drain     { from { width:100% } to { width:0% } }
  @keyframes pz-pulse-ring { 0% { box-shadow:0 0 0 0 rgba(34,197,94,0.5) } 70% { box-shadow:0 0 0 10px rgba(34,197,94,0) } 100% { box-shadow:0 0 0 0 rgba(34,197,94,0) } }
`;

// ─── Floating stars (correct celebration) ─────────────────────────────────────

function FloatingStars({ trigger }: { trigger: number }) {
  const stars = ["⭐","✨","🌟","💫","⭐","🌟"];
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"visible" }} aria-hidden>
      {stars.map((s, i) => (
        <span
          key={`${trigger}-${i}`}
          style={{
            position: "absolute",
            left: `${15 + i * 14}%`,
            bottom: "30%",
            fontSize: 20 + (i % 3) * 8,
            animation: `pz-float-star ${0.8 + i * 0.12}s ${i * 0.08}s ease-out forwards`,
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// ─── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current, results }: {
  total: number; current: number; results: (boolean | null)[];
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const res = results[i];
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-0.5"
          >
            <span style={{ fontSize: 14, opacity: res === null ? (i === current ? 1 : 0.3) : 1 }}>
              {res === true ? "⭐" : res === false ? "💔" : i === current ? "👉" : "○"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Timer bar ─────────────────────────────────────────────────────────────────

function TimerBar({
  seconds, onExpire, running,
}: { seconds: number; onExpire(): void; running: boolean }) {
  const [left, setLeft] = useState(seconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLeft(seconds);
    if (!running) return;
    ref.current = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) {
          clearInterval(ref.current!);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, running]);

  const pct = (left / seconds) * 100;
  const color = pct > 50 ? "#22c55e" : pct > 25 ? "#f59e0b" : "#ef4444";

  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] font-bold mb-1" style={{ color }}>
        <span>⏱ Timer</span>
        <span>{left}s</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-none"
          style={{ width: `${pct}%`, background: color, transition: "width 1s linear" }}
        />
      </div>
    </div>
  );
}

// ─── Option button ─────────────────────────────────────────────────────────────

function OptionBtn({
  label, selected, submitted, isCorrect, isWrongSelected, onClick, animKey,
}: {
  label: string; selected: boolean; submitted: boolean;
  isCorrect: boolean; isWrongSelected: boolean;
  onClick(): void; animKey: number;
}) {
  let bg = "rgba(255,255,255,0.08)";
  let border = "rgba(255,255,255,0.15)";
  let color = "white";
  let anim = "none";
  let icon = null;

  if (!submitted) {
    if (selected) { bg = "rgba(99,102,241,0.25)"; border = "#6366f1"; }
  } else {
    if (isCorrect) {
      bg = "rgba(34,197,94,0.25)"; border = "#22c55e";
      anim = `pz-correct 600ms ease both`;
      icon = "✅";
    } else if (isWrongSelected) {
      bg = "rgba(239,68,68,0.25)"; border = "#ef4444";
      anim = `pz-wrong 500ms ease both`;
      icon = "❌";
    } else {
      color = "rgba(255,255,255,0.35)"; border = "rgba(255,255,255,0.08)";
    }
  }

  return (
    <button
      key={animKey}
      onClick={onClick}
      disabled={submitted}
      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 text-left disabled:cursor-default"
      style={{
        background: bg,
        border: `2px solid ${border}`,
        color,
        animation: anim,
      }}
    >
      <span>{label}</span>
      {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
    </button>
  );
}

// ─── Session-done screen ──────────────────────────────────────────────────────

function SessionDone({
  results, childName, difficulty, onRestart,
}: {
  results: (boolean | null)[]; childName: string; difficulty: Difficulty; onRestart(): void;
}) {
  const correct = results.filter(Boolean).length;
  const total   = results.filter(r => r !== null).length;
  const pct     = total ? Math.round((correct / total) * 100) : 0;

  const msg =
    pct === 100 ? `🌟 Perfect score, ${childName}!` :
    pct >= 80   ? `🎉 Amazing job, ${childName}!` :
    pct >= 60   ? `👍 Great effort, ${childName}!` :
                  `💪 Keep practising, ${childName}!`;

  return (
    <div
      className="flex flex-col items-center text-center py-6 px-4"
      style={{ animation: "pz-appear 400ms ease both" }}
    >
      <div style={{ fontSize: 72, animation: "pz-pop 600ms cubic-bezier(0.34,1.56,0.64,1) both" }}>
        🏆
      </div>

      <h3 className="text-xl font-black text-white mt-3 mb-1">Session Complete!</h3>
      <p className="text-white/60 text-sm mb-4">{msg}</p>

      {/* Stars */}
      <div className="flex gap-2 mb-3">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} style={{ fontSize: 28, animation: `pz-pop 500ms ${i * 80}ms cubic-bezier(0.34,1.56,0.64,1) both` }}>
            {results[i] ? "⭐" : "💔"}
          </span>
        ))}
      </div>

      <div
        className="rounded-2xl px-5 py-3 mb-6 font-black text-2xl"
        style={{ background: "rgba(255,255,255,0.1)", color: correct === total ? "#fbbf24" : "#94a3b8" }}
      >
        {correct} / {total} ⭐
      </div>

      <div className="text-xs text-white/40 mb-5">
        Difficulty: {DIFF_CFG[difficulty].stars} {DIFF_CFG[difficulty].label}
      </div>

      <button
        onClick={onRestart}
        className="w-full max-w-xs py-3.5 rounded-2xl font-black text-base text-white transition-all active:scale-95"
        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
      >
        🔄 Play Again
      </button>

      <p className="text-[11px] text-white/30 mt-4">New puzzles unlock tomorrow! Come back for more 🧠</p>
    </div>
  );
}

// ─── PuzzleEngine ─────────────────────────────────────────────────────────────

function PuzzleEngine({ childName, ageGroup }: { childName: string; ageGroup: AgeGroup }) {
  const [state,          setState]        = useState<PuzzleState>(() => loadState(childName, ageGroup));
  const [puzzles,        setPuzzles]      = useState<Puzzle[]>([]);
  const [idx,            setIdx]          = useState(0);
  const [selected,       setSelected]     = useState<string | null>(null);
  const [submitted,      setSubmitted]    = useState(false);
  const [results,        setResults]      = useState<(boolean | null)[]>(Array(PER_SESSION).fill(null));
  const [done,           setDone]         = useState(false);
  const [correctKey,     setCorrectKey]   = useState(0);  // bumped to re-trigger stars
  const [questionKey,    setQuestionKey]  = useState(0);  // bumped to re-trigger appear animation
  const [levelMsg,       setLevelMsg]     = useState<string | null>(null);
  const [timerRunning,   setTimerRunning] = useState(false);

  const { speak, stop, speaking } = useAmyVoice();

  const cur = puzzles[idx];
  const diff = DIFF_CFG[state.difficulty];

  // ── Init / restart ───────────────────────────────────────────────────────
  const init = useCallback((st: PuzzleState) => {
    const seed = dateSeed(st.date, childName);
    const ps = pickPuzzles(st.difficulty, seed, st.usedIds, PER_SESSION);
    setPuzzles(ps);
    setIdx(0);
    setSelected(null);
    setSubmitted(false);
    setResults(Array(PER_SESSION).fill(null));
    setDone(false);
    setLevelMsg(null);
    setQuestionKey(k => k + 1);
    setTimerRunning(false);
  }, [childName]);

  useEffect(() => { init(state); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-speak question on each new puzzle ───────────────────────────────
  useEffect(() => {
    if (!cur || done) return;
    const text = cur.audioQ ?? cur.question;
    void speak(text);
    if (state.difficulty === "hard" && !submitted) setTimerRunning(true);
    return () => { stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionKey]);

  // ── Timer expired → treat as wrong ──────────────────────────────────────
  const handleTimerExpire = useCallback(() => {
    if (submitted) return;
    setSelected(cur?.options[0] ?? "");
    setSubmitted(true);
    setTimerRunning(false);
    const isCorrect = false;
    setState(prev => {
      const next: PuzzleState = {
        ...prev,
        correctStreak: 0,
        wrongStreak: prev.wrongStreak + 1,
        totalAttempted: prev.totalAttempted + 1,
        difficulty: adjustDifficulty(prev.difficulty, 0, prev.wrongStreak + 1),
        usedIds: cur ? [...prev.usedIds, cur.id] : prev.usedIds,
      };
      saveState(childName, next);
      return next;
    });
    setResults(prev => {
      const next = [...prev];
      next[idx] = isCorrect;
      return next;
    });
  }, [submitted, cur, idx, childName]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!selected || !cur || submitted) return;
    setTimerRunning(false);
    stop();
    const isCorrect = selected === cur.correctAnswer;
    setSubmitted(true);

    if (isCorrect) {
      setCorrectKey(k => k + 1);
      void speak("Correct! Well done!");
    } else {
      void speak(`The correct answer is ${cur.correctAnswer}`);
    }

    setResults(prev => {
      const next = [...prev];
      next[idx] = isCorrect;
      return next;
    });

    setState(prev => {
      const cs = isCorrect ? prev.correctStreak + 1 : 0;
      const ws = isCorrect ? 0 : prev.wrongStreak + 1;
      const newDiff = adjustDifficulty(prev.difficulty, cs, ws);
      if (newDiff !== prev.difficulty) {
        setLevelMsg(
          newDiff === "medium" ? "🎉 Level Up! Medium unlocked!" :
          newDiff === "hard"   ? "🚀 Hard difficulty unlocked!" :
                                 "👍 Dropping to easier — you've got this!"
        );
      }
      const next: PuzzleState = {
        ...prev,
        difficulty: newDiff,
        correctStreak: cs,
        wrongStreak: ws,
        totalCorrect: isCorrect ? prev.totalCorrect + 1 : prev.totalCorrect,
        totalAttempted: prev.totalAttempted + 1,
        usedIds: [...prev.usedIds, cur.id],
      };
      saveState(childName, next);
      return next;
    });
  }, [selected, cur, submitted, idx, childName, speak, stop]);

  // ── Next puzzle ──────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    stop();
    setLevelMsg(null);
    if (idx + 1 >= puzzles.length) {
      setDone(true);
    } else {
      setIdx(i => i + 1);
      setSelected(null);
      setSubmitted(false);
      setTimerRunning(false);
      setQuestionKey(k => k + 1);
    }
  }, [idx, puzzles.length, stop]);

  const handleRestart = useCallback(() => {
    stop();
    const fresh: PuzzleState = {
      date: todayStr(),
      difficulty: state.difficulty,
      correctStreak: 0, wrongStreak: 0,
      totalCorrect: state.totalCorrect, totalAttempted: state.totalAttempted,
      usedIds: state.usedIds,
    };
    setState(fresh);
    saveState(childName, fresh);
    init(fresh);
  }, [state, childName, init, stop]);

  const handleRepeat = useCallback(() => {
    stop();
    if (cur) void speak(cur.audioQ ?? cur.question);
  }, [cur, speak, stop]);

  if (puzzles.length === 0) return null;

  // ── Session done ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(160deg,#1e1b4b,#0f0f18)" }}
      >
        <style>{PUZZLE_STYLES}</style>
        <SessionDone
          results={results}
          childName={childName}
          difficulty={state.difficulty}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  if (!cur) return null;

  const isCorrectAnswer = submitted && selected === cur.correctAnswer;
  const isWrong = submitted && selected !== cur.correctAnswer;

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: "linear-gradient(160deg,#1e1b4b 0%,#0f0f1a 100%)" }}
    >
      <style>{PUZZLE_STYLES}</style>

      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div
          className="text-[11px] font-black px-2.5 py-1 rounded-full"
          style={{ background: diff.bg, color: diff.color }}
        >
          {diff.stars} {diff.label}
        </div>

        <ProgressDots
          total={PER_SESSION}
          current={idx}
          results={results}
        />

        <button
          onClick={handleRepeat}
          className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all active:scale-95 border"
          style={{
            borderColor: "rgba(255,255,255,0.2)",
            color: speaking ? "#fbbf24" : "rgba(255,255,255,0.5)",
            background: speaking ? "rgba(251,191,36,0.15)" : "transparent",
          }}
          title="Repeat question"
        >
          {speaking ? "🔊" : "🔁"} Repeat
        </button>
      </div>

      {/* ── Timer (hard difficulty only) ──────────────────────────────── */}
      {state.difficulty === "hard" && !submitted && (
        <div className="px-4 pb-2">
          <TimerBar seconds={30} onExpire={handleTimerExpire} running={timerRunning} />
        </div>
      )}

      {/* ── Question area ─────────────────────────────────────────────── */}
      <div
        key={questionKey}
        className="px-4 pt-2 pb-4 relative"
        style={{ animation: "pz-appear 300ms ease both" }}
      >
        {/* Visual emoji hint (easy puzzles) */}
        {cur.visual && !submitted && (
          <div className="flex items-center justify-center mb-3">
            <div
              className="px-5 py-3 rounded-2xl border text-3xl tracking-widest"
              style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }}
            >
              {cur.visual}
            </div>
          </div>
        )}

        {/* Question text */}
        <p
          className="text-white font-black text-lg leading-snug text-center mb-4"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
        >
          {cur.question}
        </p>

        {/* Floating celebration stars */}
        {isCorrectAnswer && <FloatingStars trigger={correctKey} />}

        {/* Options grid */}
        <div className="grid grid-cols-1 gap-2.5">
          {cur.options.map(opt => (
            <OptionBtn
              key={opt}
              label={opt}
              selected={selected === opt}
              submitted={submitted}
              isCorrect={opt === cur.correctAnswer}
              isWrongSelected={isWrong && selected === opt}
              onClick={() => { if (!submitted) setSelected(opt); }}
              animKey={questionKey}
            />
          ))}
        </div>

        {/* Feedback label */}
        {submitted && (
          <div
            className="mt-3 rounded-2xl px-4 py-2.5 text-center font-black text-sm"
            style={{
              animation: "pz-appear 250ms ease both",
              background: isCorrectAnswer ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
              color: isCorrectAnswer ? "#4ade80" : "#f87171",
              border: `1px solid ${isCorrectAnswer ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}
          >
            {isCorrectAnswer
              ? `✅ Correct! ${state.correctStreak >= 2 ? `🔥 ${state.correctStreak} in a row!` : "Well done!"}`
              : `❌ Oops! Correct answer: ${cur.correctAnswer}`
            }
          </div>
        )}

        {/* Level-up banner */}
        {levelMsg && (
          <div
            className="mt-2 rounded-2xl px-4 py-2.5 text-center font-bold text-sm"
            style={{
              animation: "pz-appear 300ms ease both",
              background: "rgba(139,92,246,0.2)",
              color: "#c4b5fd",
              border: "1px solid rgba(139,92,246,0.3)",
            }}
          >
            {levelMsg}
          </div>
        )}
      </div>

      {/* ── Action button ─────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="w-full py-3.5 rounded-2xl font-black text-base text-white transition-all active:scale-95 disabled:opacity-30"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            Check Answer ✓
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-2xl font-black text-base text-white transition-all active:scale-95"
            style={{
              background: idx + 1 >= puzzles.length
                ? "linear-gradient(135deg,#f59e0b,#fbbf24)"
                : "linear-gradient(135deg,#6366f1,#8b5cf6)",
            }}
          >
            {idx + 1 >= puzzles.length ? "🏆 See Results!" : "Next Puzzle →"}
          </button>
        )}
      </div>

      {/* ── Stats footer ──────────────────────────────────────────────── */}
      <div
        className="px-4 pb-3 flex items-center justify-between text-[11px]"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        <span>🧠 All time: <strong className="text-white/60">{state.totalCorrect}</strong> solved</span>
        <span>Accuracy: <strong className="text-white/60">{state.totalAttempted > 0 ? Math.round((state.totalCorrect / state.totalAttempted) * 100) : 0}%</strong></span>
      </div>
    </div>
  );
}

// ─── Public entry ─────────────────────────────────────────────────────────────

interface DailyPuzzleProps {
  childName: string;
  ageGroup: AgeGroup;
  ageYears: number;
}

export function DailyPuzzle({ childName, ageGroup, ageYears }: DailyPuzzleProps) {
  if (ageGroup === "infant" || ageGroup === "toddler") return null;
  if (ageYears < 3) return null;
  return <PuzzleEngine childName={childName} ageGroup={ageGroup} />;
}
