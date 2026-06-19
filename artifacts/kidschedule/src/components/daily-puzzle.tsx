import { useState, useEffect, useCallback, useRef, type CSSProperties, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import {
  createParentHubAudioIdentity,
  PARENT_HUB_SECTIONS,
} from "@/lib/parent-hub-audio-identity";
import type { AgeGroup } from "@/lib/age-groups";
import {
  ALL_HUB_PUZZLES,
  buildPuzzleAnswerSpeakText,
  buildPuzzleQuestionSpeakText,
  type HubPuzzle,
} from "@workspace/parent-hub-speak";

const PUZZLES = ALL_HUB_PUZZLES;
type Puzzle = HubPuzzle;
type Difficulty = "easy" | "medium" | "hard";
type MiniInteractionItem = {
  label: string;
  value: string;
  emoji?: string;
  hint?: string;
};

type PuzzleState = {
  date: string;
  difficulty: Difficulty;
  correctStreak: number;
  wrongStreak: number;
  totalCorrect: number;
  totalAttempted: number;
  usedIds: string[];
  totalXp?: number;
  bestStreak?: number;
  dayStreak?: number;
  lastCompletedDate?: string;
};

const LS_KEY = "amynest_puzzle_v2";
const PER_SESSION = 5;
const XP_PER_CORRECT = 20;
const DAILY_REWARD_XP = 50;

const todayStr = () => new Date().toISOString().slice(0, 10);

function dateSeed(dateStr: string, childName: string): number {
  const str = dateStr + childName;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeState(state: PuzzleState, ageGroup: AgeGroup): PuzzleState {
  return {
    ...state,
    difficulty: state.difficulty ?? getDefaultDifficulty(ageGroup),
    correctStreak: state.correctStreak ?? 0,
    wrongStreak: state.wrongStreak ?? 0,
    totalCorrect: state.totalCorrect ?? 0,
    totalAttempted: state.totalAttempted ?? 0,
    usedIds: state.usedIds ?? [],
    totalXp: state.totalXp ?? (state.totalCorrect ?? 0) * XP_PER_CORRECT,
    bestStreak: state.bestStreak ?? state.correctStreak ?? 0,
    dayStreak: state.dayStreak ?? 0,
  };
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

function shufflePuzzles(pool: Puzzle[], seed: number): Puzzle[] {
  const src = [...pool];
  let s = seed;
  for (let i = src.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [src[i], src[j]] = [src[j]!, src[i]!];
  }
  return src;
}

function pickPuzzles(diff: Difficulty, seed: number, used: string[], n: number, ageMonths: number): Puzzle[] {
  const ageSafe = PUZZLES.filter((p) => ageMonths >= p.ageMinMonths && ageMonths <= p.ageMaxMonths);
  let pool = ageSafe.filter((p) => p.difficulty === diff && !used.includes(p.id));
  if (pool.length < n) pool = ageSafe.filter((p) => p.difficulty === diff);
  if (pool.length < n) pool = ageSafe.filter((p) => !used.includes(p.id));
  if (pool.length < n) pool = ageSafe;
  if (pool.length < n) pool = PUZZLES.filter((p) => p.difficulty === diff && !used.includes(p.id));
  if (pool.length < n) pool = PUZZLES.filter((p) => p.difficulty === diff);
  return shufflePuzzles(pool.length ? pool : PUZZLES, seed).slice(0, n);
}

function loadState(childName: string, ageGroup: AgeGroup): PuzzleState {
  try {
    const raw = localStorage.getItem(`${LS_KEY}_${childName}`);
    if (raw) {
      const parsed = normalizeState(JSON.parse(raw), ageGroup);
      if (parsed.date === todayStr()) return parsed;
      return {
        ...parsed,
        date: todayStr(),
        correctStreak: 0,
        wrongStreak: 0,
        usedIds: [],
      };
    }
  } catch (e) {
    console.error("REAL ERROR:", e);
  }
  return normalizeState({
    date: todayStr(),
    difficulty: getDefaultDifficulty(ageGroup),
    correctStreak: 0,
    wrongStreak: 0,
    totalCorrect: 0,
    totalAttempted: 0,
    usedIds: [],
  }, ageGroup);
}

function saveState(name: string, st: PuzzleState) {
  try {
    localStorage.setItem(`${LS_KEY}_${name}`, JSON.stringify(st));
  } catch (e) {
    console.error("REAL ERROR:", e);
  }
}

const DIFF_CFG: Record<Difficulty, {
  label: string;
  icon: string;
  color: string;
  bg: string;
  timer: number | null;
}> = {
  easy: {
    label: "Explorer",
    icon: "🟢",
    color: "#86efac",
    bg: "rgba(34,197,94,0.16)",
    timer: null,
  },
  medium: {
    label: "Thinker",
    icon: "🔵",
    color: "#93c5fd",
    bg: "rgba(59,130,246,0.18)",
    timer: null,
  },
  hard: {
    label: "Genius",
    icon: "🟣",
    color: "#d8b4fe",
    bg: "rgba(168,85,247,0.18)",
    timer: 30,
  },
};

const AMY_CORRECT = [
  "Wow! You're getting really fast at this! 🌟",
  "Fantastic thinking! 🧠",
  "Brilliant! Your brain is glowing! ✨",
  "Amazing focus. Amy is impressed! 💜",
];

const AMY_WRONG = [
  "Nice try! Let's solve the next one together 💙",
  "You're learning every time you play 🌈",
  "Good effort. The next one is yours! ⭐",
  "Mistakes help your brain grow stronger 🧠",
];

const PUZZLE_STYLES = `
  @keyframes pz-appear { from { opacity:0; transform:translateY(18px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
  @keyframes pz-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
  @keyframes pz-brain { 0%,100% { transform:rotate(-4deg) scale(1) } 50% { transform:rotate(5deg) scale(1.08) } }
  @keyframes pz-glow { 0%,100% { box-shadow:0 0 24px rgba(99,102,241,0.22) } 50% { box-shadow:0 0 42px rgba(168,85,247,0.42) } }
  @keyframes pz-correct { 0% { transform:scale(1) } 35% { transform:scale(1.04); box-shadow:0 0 0 0 rgba(34,197,94,.55) } 100% { transform:scale(1); box-shadow:0 0 0 14px rgba(34,197,94,0) } }
  @keyframes pz-wrong { 0%,100% { transform:translateX(0) } 18% { transform:translateX(-9px) } 36% { transform:translateX(9px) } 54% { transform:translateX(-6px) } 72% { transform:translateX(6px) } }
  @keyframes pz-fly { 0% { opacity:1; transform:translateY(0) scale(.8) rotate(0deg) } 100% { opacity:0; transform:translateY(-120px) scale(1.6) rotate(22deg) } }
  @keyframes pz-confetti { 0% { opacity:1; transform:translate3d(0,0,0) rotate(0deg) } 100% { opacity:0; transform:translate3d(var(--x),95px,0) rotate(240deg) } }
  @keyframes pz-chest { 0%,100% { transform:translateY(0) rotate(0deg) } 45% { transform:translateY(-5px) rotate(-3deg) } 70% { transform:translateY(0) rotate(3deg) } }
  @media (prefers-reduced-motion: reduce) {
    .daily-puzzle-game * { animation-duration: 1ms !important; transition-duration: 1ms !important; }
  }
`;

function TimerBar({ seconds, onExpire, running }: { seconds: number; onExpire(): void; running: boolean }) {
  const { t } = useTranslation();
  const [left, setLeft] = useState(seconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLeft(seconds);
    if (!running) return;
    ref.current = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          if (ref.current) clearInterval(ref.current);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, running]);

  const pct = (left / seconds) * 100;
  const color = pct > 50 ? "#86efac" : pct > 25 ? "#fcd34d" : "#fca5a5";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
      <div className="mb-1 flex justify-between text-[11px] font-black" style={{ color }}>
        <span>{t("components.daily_puzzle.timer")}</span>
        <span>{left}s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}

function ChallengeHeader({ state, sessionXp, rewardClaimed }: {
  state: PuzzleState;
  sessionXp: number;
  rewardClaimed: boolean;
}) {
  const availableXp = rewardClaimed ? 0 : DAILY_REWARD_XP;
  const displayXp = state.totalXp ?? sessionXp;
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/15 p-4 text-white" style={{
      background: "linear-gradient(135deg,rgba(59,130,246,.42),rgba(124,58,237,.32) 48%,rgba(15,23,42,.82))",
      boxShadow: "0 22px 70px rgba(15,23,42,.34)",
      animation: "pz-appear 360ms ease both, pz-glow 4s ease-in-out infinite",
    }}>
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
      <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-fuchsia-300/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="grid h-16 w-16 place-items-center rounded-3xl border border-white/20 bg-white/15 text-4xl shadow-2xl" style={{ animation: "pz-brain 2.4s ease-in-out infinite" }}>
          🧠
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/80">Daily Puzzle</div>
          <div className="mt-1 text-xl font-black leading-tight">Brain Challenge Center</div>
          <div className="mt-1 text-xs font-semibold text-white/65">Earn XP, unlock rewards, come back stronger tomorrow.</div>
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <HeaderMetric label="Current Streak" value={`${state.dayStreak ?? 0} Day`} icon="🔥" />
        <HeaderMetric label="Total XP Earned" value={`${displayXp} XP`} icon="⭐" />
        <HeaderMetric label="Today's Reward" value={availableXp ? `+${availableXp} XP` : "Unlocked"} icon="🏆" />
      </div>
    </div>
  );
}

function HeaderMetric({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/12 px-2.5 py-2 text-center backdrop-blur-md">
      <div className="text-lg">{icon}</div>
      <div className="text-[10px] font-bold text-white/55">{label}</div>
      <div className="mt-0.5 text-xs font-black text-white">{value}</div>
    </div>
  );
}

function ChallengeProgress({ current, total, results, sessionXp }: {
  current: number;
  total: number;
  results: (boolean | null)[];
  sessionXp: number;
}) {
  const completed = results.filter((r) => r !== null).length;
  const pct = Math.round((completed / total) * 100);
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-4 text-white shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/70">Daily Challenge</div>
          <div className="mt-1 text-base font-black">🎯 Puzzle {Math.min(current + 1, total)} of {total}</div>
        </div>
        <div className="rounded-2xl border border-amber-200/20 bg-amber-300/15 px-3 py-2 text-right">
          <div className="text-[10px] font-bold text-amber-100/70">XP this run</div>
          <div className="text-sm font-black text-amber-100">+{sessionXp}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {results.map((result, i) => (
          <span key={i} className="h-3 flex-1 rounded-full border border-white/12 transition-all duration-300" style={{
            background: result === true ? "linear-gradient(90deg,#facc15,#fb923c)" : result === false ? "rgba(248,113,113,.55)" : i === current ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.1)",
            boxShadow: result === true ? "0 0 18px rgba(250,204,21,.45)" : "none",
          }} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-white/55">
        <span>{pct}% Complete</span>
        <span>{completed === total ? "Reward ready 🎁" : `+${XP_PER_CORRECT} XP per correct answer`}</span>
      </div>
    </div>
  );
}

function RewardChest({ unlocked }: { unlocked: boolean }) {
  return (
    <div className="rounded-3xl border border-amber-200/20 bg-gradient-to-br from-amber-300/20 to-orange-500/10 p-3 text-white shadow-xl">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300/20 text-3xl" style={{ animation: "pz-chest 2.4s ease-in-out infinite" }}>
          🎁
        </div>
        <div className="flex-1">
          <div className="text-sm font-black">Daily Reward</div>
          <div className="text-xs font-semibold text-white/55">{unlocked ? "Unlocked: ⭐ +50 XP • 🏆 Achievement • Mystery Reward" : "Complete all 5 puzzles to open the chest."}</div>
        </div>
        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black">
          {unlocked ? "OPEN" : "+50 XP"}
        </div>
      </div>
    </div>
  );
}

function OptionBtn({ label, optionIndex, selected, submitted, isCorrect, isWrongSelected, onClick, animKey }: {
  label: string;
  optionIndex: number;
  selected: boolean;
  submitted: boolean;
  isCorrect: boolean;
  isWrongSelected: boolean;
  onClick(): void;
  animKey: number;
}) {
  const letter = String.fromCharCode(65 + optionIndex);
  let bg = "linear-gradient(135deg,rgba(255,255,255,.11),rgba(255,255,255,.06))";
  let border = "rgba(255,255,255,.14)";
  let color = "white";
  let anim = `pz-appear 260ms ${optionIndex * 45}ms ease both`;
  let icon = "";

  if (!submitted && selected) {
    bg = "linear-gradient(135deg,rgba(99,102,241,.36),rgba(168,85,247,.22))";
    border = "rgba(165,180,252,.82)";
  } else if (submitted && isCorrect) {
    bg = "linear-gradient(135deg,rgba(34,197,94,.34),rgba(20,184,166,.20))";
    border = "rgba(134,239,172,.85)";
    anim = "pz-correct 720ms ease both";
    icon = "✔";
  } else if (submitted && isWrongSelected) {
    bg = "linear-gradient(135deg,rgba(239,68,68,.35),rgba(244,63,94,.18))";
    border = "rgba(252,165,165,.85)";
    anim = "pz-wrong 520ms ease both";
    icon = "✖";
  } else if (submitted) {
    color = "rgba(255,255,255,.38)";
    border = "rgba(255,255,255,.08)";
  }

  return (
    <button
      key={`${animKey}-${label}`}
      type="button"
      onClick={onClick}
      disabled={submitted}
      aria-pressed={selected}
      className="group flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left font-black shadow-lg outline-none transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-cyan-200 active:scale-[0.98] disabled:cursor-default"
      style={{ background: bg, border: `2px solid ${border}`, color, animation: anim }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/12 text-sm">{letter}</span>
      <span className="min-w-0 flex-1 text-base">{label}</span>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-lg">{icon}</span>
    </button>
  );
}

function MiniInteractionPanel({ puzzle, selected, submitted, onSelect, animKey }: {
  puzzle: Puzzle;
  selected: string | null;
  submitted: boolean;
  onSelect(answer: string): void;
  animKey: number;
}) {
  const interaction = puzzle.interaction;
  const [dragHover, setDragHover] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  if (!interaction) return null;

  const items: MiniInteractionItem[] = interaction.items ?? puzzle.options.map((option) => ({ label: option, value: option }));
  const isCorrectValue = (value: string) => submitted && value === puzzle.correctAnswer;
  const isWrongValue = (value: string) => submitted && selected === value && value !== puzzle.correctAnswer;

  const tileStyle = (value: string): CSSProperties => ({
    background: isCorrectValue(value)
      ? "linear-gradient(135deg,rgba(34,197,94,.36),rgba(20,184,166,.22))"
      : isWrongValue(value)
        ? "linear-gradient(135deg,rgba(239,68,68,.34),rgba(244,63,94,.18))"
        : selected === value
          ? "linear-gradient(135deg,rgba(99,102,241,.38),rgba(168,85,247,.24))"
          : "linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.06))",
    borderColor: isCorrectValue(value)
      ? "rgba(134,239,172,.86)"
      : isWrongValue(value)
        ? "rgba(252,165,165,.86)"
        : selected === value
          ? "rgba(165,180,252,.86)"
          : "rgba(255,255,255,.14)",
    animation: isCorrectValue(value)
      ? "pz-correct 720ms ease both"
      : isWrongValue(value)
        ? "pz-wrong 520ms ease both"
        : `pz-appear 260ms ease both`,
  });

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragHover(false);
    const answer = event.dataTransfer.getData("text/plain");
    if (answer && !submitted) onSelect(answer);
  };

  if (interaction.kind === "drag-answer") {
    return (
      <div key={animKey} className="space-y-3 rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-xl" style={{ animation: "pz-appear 300ms ease both" }}>
        <div className="text-center text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">🎮 Drag Mission</div>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragHover(true);
          }}
          onDragLeave={() => setDragHover(false)}
          onDrop={handleDrop}
          className="grid min-h-20 place-items-center rounded-3xl border-2 border-dashed px-4 py-5 text-center font-black transition"
          style={{
            borderColor: dragHover || selected ? "rgba(251,191,36,.8)" : "rgba(255,255,255,.18)",
            background: selected ? "rgba(251,191,36,.16)" : dragHover ? "rgba(251,191,36,.12)" : "rgba(255,255,255,.06)",
          }}
        >
          <div className="text-2xl">{selected ?? "⬇️"}</div>
          <div className="mt-1 text-xs text-white/55">{selected ? "Answer loaded. Tap Check Answer." : interaction.dropLabel ?? "Drop answer here"}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              draggable={!submitted}
              disabled={submitted}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", item.value)}
              onClick={() => {
                if (!submitted) onSelect(item.value);
              }}
              className="rounded-3xl border-2 px-3 py-3 text-center font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-default"
              style={tileStyle(item.value)}
            >
              {item.emoji ? <div className="text-2xl">{item.emoji}</div> : null}
              <div>{item.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (interaction.kind === "pattern-completion") {
    return (
      <div key={animKey} className="space-y-3 rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-xl" style={{ animation: "pz-appear 300ms ease both" }}>
        <div className="text-center text-xs font-black uppercase tracking-[0.18em] text-fuchsia-100/70">🧩 Pattern Builder</div>
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/[0.06] p-3">
          {(interaction.sequence ?? []).map((step, index) => (
            <span key={`${step}-${index}`} className="rounded-2xl border border-white/12 bg-white/10 px-3 py-2 text-sm font-black text-white">
              {step}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={submitted}
              onClick={() => {
                if (!submitted) onSelect(item.value);
              }}
              className="rounded-3xl border-2 px-3 py-4 text-center text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-default"
              style={tileStyle(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (interaction.kind === "memory-challenge") {
    return (
      <div key={animKey} className="space-y-3 rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-xl" style={{ animation: "pz-appear 300ms ease both" }}>
        <div className="text-center text-xs font-black uppercase tracking-[0.18em] text-amber-100/70">🧠 Memory Flash</div>
        <button
          type="button"
          onClick={() => setMemoryOpen((open) => !open)}
          className="w-full rounded-3xl border border-amber-200/20 bg-amber-300/15 px-4 py-3 text-sm font-black text-amber-50 transition active:scale-[0.98]"
        >
          {memoryOpen ? "Hide clue cards" : "Tap to reveal clue cards"}
        </button>
        {memoryOpen && (
          <div className="grid gap-2 sm:grid-cols-3">
            {(interaction.sequence ?? []).map((step, index) => (
              <div key={`${step}-${index}`} className="rounded-3xl border border-white/12 bg-white/10 px-3 py-3 text-center text-sm font-black text-white" style={{ animation: `pz-appear 240ms ${index * 70}ms ease both` }}>
                {step}
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={submitted}
              onClick={() => {
                if (!submitted) onSelect(item.value);
              }}
              className="rounded-3xl border-2 px-3 py-3 text-center font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-default"
              style={tileStyle(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (interaction.kind === "logic-grid" || interaction.kind === "visual-reasoning") {
    const isLogic = interaction.kind === "logic-grid";
    return (
      <div key={animKey} className="space-y-3 rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-xl" style={{ animation: "pz-appear 300ms ease both" }}>
        <div className="text-center text-xs font-black uppercase tracking-[0.18em] text-violet-100/70">
          {isLogic ? "🧮 Logic Grid" : "👁️ Visual Reasoning"}
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-white/[0.06] p-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="grid aspect-square place-items-center rounded-2xl border border-white/10 bg-white/10 text-lg font-black text-white/75">
              {isLogic ? ["✓", "?", "×", "?", "✓", "?", "×", "?", "✓"][i] : ["□", "+", "□", "=", "?", "•", "□", "+", "□"][i]}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={submitted}
              onClick={() => {
                if (!submitted) onSelect(item.value);
              }}
              className="rounded-3xl border-2 px-3 py-3 text-center font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-default"
              style={tileStyle(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div key={animKey} className="space-y-3 rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-xl" style={{ animation: "pz-appear 300ms ease both" }}>
      <div className="text-center text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">
        {interaction.kind === "counting" ? "🔢 Count & Tap" : interaction.kind === "bigger" ? "🐘 Bigger Picker" : "👆 Tap Challenge"}
      </div>
      {interaction.kind === "counting" && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center text-4xl tracking-widest">
          ✋
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={submitted}
            onClick={() => {
              if (!submitted) onSelect(item.value);
            }}
            className="rounded-3xl border-2 px-3 py-4 text-center font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-default"
            style={tileStyle(item.value)}
          >
            {item.emoji ? <div className="text-4xl">{item.emoji}</div> : null}
            <div className="mt-1">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CelebrationOverlay({ trigger, show }: { trigger: number; show: boolean }) {
  if (!show) return null;
  const confetti = Array.from({ length: 14 }, (_, i) => ({
    x: `${(i % 2 ? 1 : -1) * (24 + i * 4)}px`,
    left: `${12 + i * 6}%`,
    delay: `${i * 26}ms`,
  }));

  return (
    <div key={trigger} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {confetti.map((piece, i) => (
        <span key={i} className="absolute top-8 h-2.5 w-2.5 rounded-sm" style={{
          "--x": piece.x,
          left: piece.left,
          background: ["#facc15", "#38bdf8", "#a78bfa", "#fb7185"][i % 4],
          animation: `pz-confetti 900ms ${piece.delay} ease-out forwards`,
        } as CSSProperties} />
      ))}
      {["⭐ +20 XP", "✨", "🌟", "🎉"].map((text, i) => (
        <span key={text} className="absolute bottom-24 font-black text-amber-100 drop-shadow-xl" style={{
          left: `${18 + i * 18}%`,
          animation: `pz-fly ${850 + i * 80}ms ${i * 55}ms ease-out forwards`,
        }}>
          {text}
        </span>
      ))}
    </div>
  );
}

function QuestionCard({ puzzle, questionKey }: { puzzle: Puzzle; questionKey: number }) {
  return (
    <div key={questionKey} className="relative rounded-[2rem] border border-cyan-200/20 p-4 text-center text-white shadow-2xl" style={{
      background: "linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.06))",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 24px 60px rgba(15,23,42,.30)",
      animation: "pz-appear 320ms ease both",
    }}>
      <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
        {puzzle.interaction ? "🎮 Mini Game Challenge" : "🧠 Brain Challenge"}
      </div>
      {puzzle.visual && (
        <div className="mx-auto mt-3 inline-flex rounded-3xl border border-white/15 bg-white/10 px-5 py-3 text-3xl tracking-widest shadow-inner">
          {puzzle.visual}
        </div>
      )}
      <p className="mx-auto mt-4 max-w-xl text-2xl font-black leading-snug md:text-3xl" style={{ textShadow: "0 2px 18px rgba(0,0,0,.35)" }}>
        {puzzle.question}
      </p>
      {puzzle.interaction?.prompt && (
        <div className="mx-auto mt-3 max-w-sm rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-cyan-50/85">
          {puzzle.interaction.prompt}
        </div>
      )}
      <div className="mt-3 text-[11px] font-bold text-white/45">{puzzle.category}</div>
    </div>
  );
}

function FeedbackPanel({ isCorrect, amyMessage, levelMsg, streak }: {
  isCorrect: boolean;
  amyMessage: string;
  levelMsg: string | null;
  streak: number;
}) {
  return (
    <div className="space-y-2" style={{ animation: "pz-appear 240ms ease both" }}>
      <div className="rounded-3xl border px-4 py-3 text-center font-black" style={{
        background: isCorrect ? "rgba(34,197,94,.18)" : "rgba(59,130,246,.14)",
        borderColor: isCorrect ? "rgba(134,239,172,.45)" : "rgba(147,197,253,.28)",
        color: isCorrect ? "#bbf7d0" : "#bfdbfe",
      }}>
        {isCorrect ? "🎉 Brilliant! ⭐ +20 XP" : "💙 Nice try. Amy has your back!"}
        {isCorrect && streak >= 2 ? <span className="ml-1">🔥 {streak} in a row!</span> : null}
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-bold text-white/75">
        Amy says: {amyMessage}
      </div>
      <div className="rounded-3xl border border-violet-200/20 bg-violet-400/10 px-4 py-2 text-center text-xs font-black text-violet-100/85">
        {levelMsg ?? "Difficulty adapting to your progress"}
      </div>
    </div>
  );
}

function StatCards({ state }: { state: PuzzleState }) {
  const accuracy = state.totalAttempted > 0 ? Math.round((state.totalCorrect / state.totalAttempted) * 100) : 0;
  const cards = [
    ["🧠", "Solved", state.totalCorrect],
    ["🎯", "Accuracy", `${accuracy}%`],
    ["🔥", "Best Streak", state.bestStreak ?? 0],
    ["⭐", "XP Earned", state.totalXp ?? 0],
  ];

  return (
    <div className="grid grid-cols-2 gap-2 px-1 pb-1 sm:grid-cols-4">
      {cards.map(([icon, label, value]) => (
        <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.08] px-3 py-3 text-center text-white shadow-lg">
          <div className="text-lg">{icon}</div>
          <div className="mt-0.5 text-[10px] font-bold text-white/45">{label}</div>
          <div className="text-base font-black">{value}</div>
        </div>
      ))}
    </div>
  );
}

function SessionDone({ results, childName, state, onRestart }: {
  results: (boolean | null)[];
  childName: string;
  state: PuzzleState;
  onRestart(): void;
}) {
  const correct = results.filter(Boolean).length;
  const total = results.filter((r) => r !== null).length;
  const earned = correct * XP_PER_CORRECT + DAILY_REWARD_XP;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const msg = pct === 100 ? `Perfect run, ${childName}!` : pct >= 80 ? `Amazing job, ${childName}!` : `Daily challenge complete, ${childName}!`;

  return (
    <div className="relative space-y-4 p-4 text-white" style={{ animation: "pz-appear 400ms ease both" }}>
      <div className="rounded-[2rem] border border-amber-200/25 bg-gradient-to-br from-amber-300/25 via-fuchsia-400/15 to-cyan-400/15 px-4 py-7 text-center shadow-2xl">
        <div className="text-7xl" style={{ animation: "pz-chest 1.8s ease-in-out infinite" }}>🎉</div>
        <h3 className="mt-3 text-2xl font-black">Daily Challenge Complete</h3>
        <p className="mt-1 text-sm font-semibold text-white/65">{msg}</p>
        <div className="mx-auto mt-4 inline-flex rounded-3xl border border-white/15 bg-white/12 px-5 py-3 text-xl font-black">
          ⭐ +{earned} XP Earned
        </div>
        <div className="mt-3 text-sm font-black text-amber-100">🏆 Reward Unlocked</div>
      </div>

      <RewardChest unlocked />
      <StatCards state={state} />

      <div className="grid gap-2 sm:grid-cols-2">
        <button onClick={onRestart} className="rounded-3xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3.5 font-black text-white shadow-xl transition active:scale-[0.98]">
          Play Bonus Puzzle
        </button>
        <button className="rounded-3xl border border-white/12 bg-white/[0.08] px-4 py-3.5 font-black text-white/80 shadow-xl transition active:scale-[0.98]" type="button">
          Come Back Tomorrow
        </button>
      </div>
    </div>
  );
}

function PuzzleEngine({ childName, ageGroup, ageMonths }: {
  childName: string;
  ageGroup: AgeGroup;
  ageMonths: number;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<PuzzleState>(() => loadState(childName, ageGroup));
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<(boolean | null)[]>(Array(PER_SESSION).fill(null));
  const [done, setDone] = useState(false);
  const [correctKey, setCorrectKey] = useState(0);
  const [questionKey, setQuestionKey] = useState(0);
  const [levelMsg, setLevelMsg] = useState<string | null>(null);
  const [amyMessage, setAmyMessage] = useState("Ready for today's brain adventure? 🚀");
  const [sessionXp, setSessionXp] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const { speak, pause, speaking, primeSpeakGesture } = useAmyVoice();

  const cur = puzzles[idx];
  const diff = DIFF_CFG[state.difficulty];
  const rewardClaimed = state.lastCompletedDate === todayStr();

  const init = useCallback((st: PuzzleState) => {
    const seed = dateSeed(st.date, childName);
    const ps = pickPuzzles(st.difficulty, seed, st.usedIds, PER_SESSION, ageMonths);
    setPuzzles(ps);
    setIdx(0);
    setSelected(null);
    setSubmitted(false);
    setResults(Array(PER_SESSION).fill(null));
    setDone(false);
    setLevelMsg(null);
    setAmyMessage("Ready for today's brain adventure? 🚀");
    setSessionXp(0);
    setQuestionKey((k) => k + 1);
    setTimerRunning(false);
  }, [ageMonths, childName]);

  useEffect(() => {
    init(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cur || done) return;
    if (state.difficulty === "hard" && !submitted) setTimerRunning(true);
    return () => {
      pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionKey]);

  const speakParentHub = useCallback(
    (text: string, itemId: string, playbackMode: "full-required" | "partial-ok" = "partial-ok") => {
      const identity = createParentHubAudioIdentity({
        sectionId: PARENT_HUB_SECTIONS.PUZZLE,
        itemId,
        text,
      });
      return speak(identity.text, {
        parentHub: true,
        audioIdentity: identity,
        playbackMode,
      });
    },
    [speak],
  );

  const markWrong = useCallback(() => {
    if (submitted) return;
    setSelected(null);
    setSubmitted(true);
    setTimerRunning(false);
    setAmyMessage(AMY_WRONG[idx % AMY_WRONG.length] ?? AMY_WRONG[0]);
    setState((prev) => {
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
    setResults((prev) => {
      const next = [...prev];
      next[idx] = false;
      return next;
    });
  }, [submitted, cur, idx, childName]);

  const handleSubmit = useCallback(() => {
    if (!selected || !cur || submitted) return;
    setTimerRunning(false);
    pause();
    const isCorrect = selected === cur.correctAnswer;
    setSubmitted(true);

    if (isCorrect) {
      setCorrectKey((k) => k + 1);
      setSessionXp((xp) => xp + XP_PER_CORRECT);
      setAmyMessage(AMY_CORRECT[(idx + correctKey) % AMY_CORRECT.length] ?? AMY_CORRECT[0]);
      window.dispatchEvent(new CustomEvent("amynest:puzzle-success-sound", { detail: { puzzleId: cur.id } }));
      void speakParentHub("Brilliant! You earned twenty XP!", `${cur.id}:correct`);
    } else {
      setAmyMessage(AMY_WRONG[idx % AMY_WRONG.length] ?? AMY_WRONG[0]);
      void speakParentHub(buildPuzzleAnswerSpeakText(cur.correctAnswer), `${cur.id}:answer`);
    }

    setResults((prev) => {
      const next = [...prev];
      next[idx] = isCorrect;
      return next;
    });

    setState((prev) => {
      const cs = isCorrect ? prev.correctStreak + 1 : 0;
      const ws = isCorrect ? 0 : prev.wrongStreak + 1;
      const newDiff = adjustDifficulty(prev.difficulty, cs, ws);
      if (newDiff !== prev.difficulty) {
        setLevelMsg(newDiff === "medium" ? "Next challenge will be harder 🚀" : newDiff === "hard" ? "You're ready for a tougher puzzle ⭐" : "Difficulty adapting to your progress");
      } else {
        setLevelMsg("Difficulty adapting to your progress");
      }
      const next: PuzzleState = {
        ...prev,
        difficulty: newDiff,
        correctStreak: cs,
        wrongStreak: ws,
        totalCorrect: isCorrect ? prev.totalCorrect + 1 : prev.totalCorrect,
        totalAttempted: prev.totalAttempted + 1,
        totalXp: (prev.totalXp ?? 0) + (isCorrect ? XP_PER_CORRECT : 0),
        bestStreak: Math.max(prev.bestStreak ?? 0, cs),
        usedIds: [...prev.usedIds, cur.id],
      };
      saveState(childName, next);
      return next;
    });
  }, [selected, cur, submitted, idx, correctKey, childName, speakParentHub, pause]);

  const completeSession = useCallback(() => {
    const today = todayStr();
    setState((prev) => {
      const alreadyClaimed = prev.lastCompletedDate === today;
      const yesterday = addDays(today, -1);
      const dayStreak = alreadyClaimed ? prev.dayStreak ?? 0 : prev.lastCompletedDate === yesterday ? (prev.dayStreak ?? 0) + 1 : 1;
      const next: PuzzleState = {
        ...prev,
        totalXp: (prev.totalXp ?? 0) + (alreadyClaimed ? 0 : DAILY_REWARD_XP),
        dayStreak,
        lastCompletedDate: alreadyClaimed ? prev.lastCompletedDate : today,
      };
      saveState(childName, next);
      return next;
    });
    if (!rewardClaimed) setSessionXp((xp) => xp + DAILY_REWARD_XP);
    setDone(true);
  }, [childName, rewardClaimed]);

  const handleNext = useCallback(() => {
    pause();
    setLevelMsg(null);
    if (idx + 1 >= puzzles.length) {
      completeSession();
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
      setSubmitted(false);
      setTimerRunning(false);
      setQuestionKey((k) => k + 1);
    }
  }, [idx, puzzles.length, pause, completeSession]);

  const handleRestart = useCallback(() => {
    pause();
    const fresh: PuzzleState = {
      ...state,
      date: todayStr(),
      correctStreak: 0,
      wrongStreak: 0,
    };
    setState(fresh);
    saveState(childName, fresh);
    init(fresh);
  }, [state, childName, init, pause]);

  const handleRepeat = useCallback(() => {
    pause();
    if (cur) {
      void speakParentHub(buildPuzzleQuestionSpeakText(cur), `${cur.id}:question`, "full-required");
    }
  }, [cur, speakParentHub, pause]);

  const primePuzzleQuestion = useCallback(() => {
    if (!cur) return;
    primeSpeakGesture(buildPuzzleQuestionSpeakText(cur), { parentHub: true });
  }, [cur, primeSpeakGesture]);

  if (puzzles.length === 0) return null;

  if (done) {
    return (
      <div className="daily-puzzle-game rounded-[2rem] border border-white/10 bg-slate-950 p-2 shadow-2xl">
        <style>{PUZZLE_STYLES}</style>
        <SessionDone results={results} childName={childName} state={state} onRestart={handleRestart} />
      </div>
    );
  }

  if (!cur) return null;
  const isCorrectAnswer = submitted && selected === cur.correctAnswer;
  const isWrong = submitted && selected !== cur.correctAnswer;
  const badgeLabel = state.difficulty === "hard" && (state.bestStreak ?? 0) >= 8 ? "Brain Master" : diff.label;

  return (
    <div className="daily-puzzle-game relative overflow-hidden rounded-[2rem] border border-white/10 p-3 text-white shadow-2xl" style={{
      background: "radial-gradient(circle at 15% 0%,rgba(56,189,248,.26),transparent 32%),radial-gradient(circle at 90% 20%,rgba(168,85,247,.26),transparent 34%),linear-gradient(160deg,#11104a 0%,#0b1028 58%,#070711 100%)",
    }}>
      <style>{PUZZLE_STYLES}</style>
      <CelebrationOverlay trigger={correctKey} show={isCorrectAnswer} />

      <div className="space-y-3">
        <ChallengeHeader state={state} sessionXp={sessionXp} rewardClaimed={rewardClaimed} />
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <ChallengeProgress current={idx} total={PER_SESSION} results={results} sessionXp={sessionXp} />
          <RewardChest unlocked={rewardClaimed} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-black" style={{ background: diff.bg, color: diff.color }}>
            {diff.icon} {badgeLabel}
          </div>
          <button
            onPointerDown={primePuzzleQuestion}
            onClick={handleRepeat}
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-white/70 transition hover:bg-white/15 active:scale-95"
            title={t("components.daily_puzzle.repeat_question")}
          >
            {speaking ? "🔊" : "🔁"} {t("components.daily_puzzle.repeat")}
          </button>
        </div>

        {state.difficulty === "hard" && !submitted && (
          <TimerBar seconds={30} onExpire={markWrong} running={timerRunning} />
        )}

        <QuestionCard puzzle={cur} questionKey={questionKey} />

        {cur.interaction ? (
          <MiniInteractionPanel
            puzzle={cur}
            selected={selected}
            submitted={submitted}
            onSelect={setSelected}
            animKey={questionKey}
          />
        ) : (
          <div className="grid gap-2.5">
            {cur.options.map((opt, optionIndex) => (
              <OptionBtn
                key={opt}
                label={opt}
                optionIndex={optionIndex}
                selected={selected === opt}
                submitted={submitted}
                isCorrect={opt === cur.correctAnswer}
                isWrongSelected={isWrong && selected === opt}
                onClick={() => {
                  if (!submitted) setSelected(opt);
                }}
                animKey={questionKey}
              />
            ))}
          </div>
        )}

        {submitted && (
          <FeedbackPanel
            isCorrect={isCorrectAnswer}
            amyMessage={amyMessage}
            levelMsg={levelMsg}
            streak={state.correctStreak}
          />
        )}

        <div>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!selected}
              className="w-full rounded-3xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 py-4 text-base font-black text-white shadow-2xl transition hover:-translate-y-0.5 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-35"
            >
              {t("components.daily_puzzle.check_answer")} ✓
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full rounded-3xl bg-gradient-to-r from-amber-400 to-orange-400 py-4 text-base font-black text-slate-950 shadow-2xl transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {idx + 1 >= puzzles.length ? "Open Reward Chest 🎁" : "Next Challenge →"}
            </button>
          )}
        </div>

        <StatCards state={state} />
      </div>
    </div>
  );
}

interface DailyPuzzleProps {
  childName: string;
  ageGroup: AgeGroup;
  ageYears: number;
  ageMonths?: number;
}

export function DailyPuzzle({ childName, ageGroup, ageYears, ageMonths = 0 }: DailyPuzzleProps) {
  const totalAgeMonths = ageYears * 12 + ageMonths;
  if (ageGroup === "infant" || ageGroup === "toddler") return null;
  if (totalAgeMonths < 36) return null;
  return <PuzzleEngine childName={childName} ageGroup={ageGroup} ageMonths={totalAgeMonths} />;
}
