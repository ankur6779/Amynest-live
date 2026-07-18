import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import {
  getGameDifficulty,
  setGameDifficulty,
  SEQUENCE_FLASH_MS,
  type GameDifficulty,
} from "@/lib/game-difficulty";
import { feedbackCorrect, feedbackWrong, feedbackTap } from "@/lib/game-feedback";
import {
  GAME_SESSION_ROUNDS,
  sessionSequenceLengths,
} from "@/lib/game-session-progression";
import { scaleDurationMs } from "@/lib/game-a11y";
import { useA11yPrefs } from "@/hooks/use-a11y-prefs";
import { usePageVisible } from "@/hooks/use-page-visible";
import { GAME_LAYOUT } from "@/lib/game-layout-tokens";

const COLORS = [
  { id: "red", name: "Red", symbol: "1", bg: "hsl(var(--brand-red-500))", glow: "hsl(var(--brand-red-300))" },
  { id: "blue", name: "Blue", symbol: "2", bg: "hsl(var(--brand-blue-500))", glow: "hsl(var(--brand-blue-300))" },
  { id: "green", name: "Green", symbol: "3", bg: "hsl(var(--brand-green-500))", glow: "hsl(var(--brand-green-300))" },
  { id: "yellow", name: "Yellow", symbol: "4", bg: "hsl(var(--brand-yellow-500))", glow: "hsl(var(--brand-amber-200))" },
];

function buildSequence(len: number): string[] {
  return Array.from({ length: len }, () => COLORS[Math.floor(Math.random() * COLORS.length)].id);
}

export function SequenceMemoryGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const { timeScale, reducedMotion } = useA11yPrefs();
  const pageVisible = usePageVisible();
  const [difficulty, setDifficulty] = useState<GameDifficulty>(() => getGameDifficulty());
  const lengths = useMemo(() => sessionSequenceLengths(GAME_SESSION_ROUNDS), []);
  const sequences = useMemo(() => lengths.map(buildSequence), [lengths]);
  const flashMs = scaleDurationMs(SEQUENCE_FLASH_MS[difficulty], timeScale);

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [showingIdx, setShowingIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<"showing" | "input" | "feedback">("showing");
  const [inputIdx, setInputIdx] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timerRef = useRef<number | null>(null);

  const resetDifficulty = (level: GameDifficulty) => {
    setGameDifficulty(level);
    setDifficulty(level);
    setRound(0);
    setScore(0);
    setPhase("showing");
    setShowingIdx(null);
    setInputIdx(0);
    setFeedback(null);
  };

  const sequence = sequences[round] ?? [];

  useEffect(() => {
    if (phase !== "showing" || sequence.length === 0 || !pageVisible) return;
    let i = 0;
    setShowingIdx(0);
    timerRef.current = window.setInterval(() => {
      i += 1;
      if (i >= sequence.length) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setShowingIdx(null);
        setTimeout(() => {
          setPhase("input");
          setInputIdx(0);
        }, 250);
      } else {
        setShowingIdx(i);
      }
    }, flashMs);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [round, phase, sequence.length, flashMs, pageVisible]);

  if (round >= GAME_SESSION_ROUNDS) return null;

  const tap = (id: string) => {
    if (phase !== "input") return;
    void feedbackTap();
    if (id === sequence[inputIdx]) {
      const next = inputIdx + 1;
      if (next >= sequence.length) {
        setPhase("feedback");
        setFeedback("correct");
        void feedbackCorrect();
        const newScore = score + 1;
        setScore(newScore);
        setTimeout(() => {
          if (round + 1 >= GAME_SESSION_ROUNDS) onFinish(newScore, GAME_SESSION_ROUNDS);
          else {
            setRound((r) => r + 1);
            setPhase("showing");
            setFeedback(null);
            setInputIdx(0);
          }
        }, 700);
      } else {
        setInputIdx(next);
      }
    } else {
      setPhase("feedback");
      setFeedback("wrong");
      void feedbackWrong();
      setTimeout(() => {
        if (round + 1 >= GAME_SESSION_ROUNDS) onFinish(score, GAME_SESSION_ROUNDS);
        else {
          setRound((r) => r + 1);
          setPhase("showing");
          setFeedback(null);
          setInputIdx(0);
        }
      }, 700);
    }
  };

  const phaseLabel =
    phase === "showing"
      ? "Watch carefully…"
      : phase === "input"
        ? `Repeat: ${inputIdx} / ${sequence.length}`
        : feedback === "correct"
          ? "Great memory!"
          : "Almost — next round!";

  return (
    <GameShell
      round={round + 1}
      totalRounds={GAME_SESSION_ROUNDS}
      score={score}
      subtitle={phaseLabel}
      feedback={feedback}
      idleHint="Watch the pattern carefully — then tap it back in order."
      showDifficulty
      difficulty={difficulty}
      onDifficultyChange={resetDifficulty}
      title="Watch, then tap the colours in order"
    >
      <div
        role="group"
        aria-label="Colour pads"
        style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 240, margin: "0 auto" }}
      >
        {COLORS.map((c) => {
          const lit = showingIdx !== null && sequence[showingIdx] === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className="game-choice-a11y"
              onClick={() => tap(c.id)}
              disabled={phase !== "input"}
              aria-label={`${c.name} pad${lit ? ", lit" : ""}${phase === "input" ? "" : ", wait"}`}
              style={{
                aspectRatio: "1 / 1",
                minHeight: GAME_LAYOUT.touchComfort,
                borderRadius: 16,
                background: c.bg,
                border: lit ? "4px solid #fff" : "2px solid rgba(255,255,255,0.35)",
                cursor: phase === "input" ? "pointer" : "default",
                opacity: lit ? 1 : phase === "input" ? 0.95 : 0.55,
                boxShadow: lit
                  ? `0 0 32px ${c.glow}, 0 0 0 4px ${c.glow}`
                  : "0 4px 12px rgba(0,0,0,0.3)",
                transition: reducedMotion ? "none" : "all 0.15s",
                color: "#fff",
                fontWeight: 900,
                fontSize: 18,
              }}
            >
              <span aria-hidden>{c.symbol}</span>
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
