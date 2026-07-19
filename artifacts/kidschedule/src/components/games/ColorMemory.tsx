import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/games/GameShell";
import {
  getGameDifficulty,
  setGameDifficulty,
  COLOR_MEMORY_FLASH_MS,
  type GameDifficulty,
} from "@/lib/game-difficulty";
import { feedbackCorrect, feedbackWrong, feedbackTap } from "@/lib/game-feedback";
import {
  GAME_SESSION_ROUNDS,
  sessionSequenceLengths,
} from "@/lib/game-session-progression";
import { getActiveSessionPlan, microFlashScale } from "@/lib/game-adaptive-progression";
import { scaleDurationMs } from "@/lib/game-a11y";
import { useA11yPrefs } from "@/hooks/use-a11y-prefs";
import { usePageVisible } from "@/hooks/use-page-visible";
import { useTimeoutRegistry } from "@/hooks/use-timeout-registry";

const COLORS = [
  { id: "r", name: "Red", bg: "hsl(var(--brand-red-500))" },
  { id: "b", name: "Blue", bg: "hsl(var(--brand-blue-500))" },
  { id: "g", name: "Green", bg: "hsl(var(--brand-green-500))" },
  { id: "y", name: "Yellow", bg: "hsl(var(--brand-amber-400))" },
  { id: "p", name: "Purple", bg: "hsl(var(--brand-purple-500))" },
  { id: "o", name: "Orange", bg: "hsl(var(--brand-orange-400))" },
];

function buildSequence(len: number): string[] {
  return Array.from({ length: len }, () => COLORS[Math.floor(Math.random() * COLORS.length)].id);
}

export function ColorMemoryGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const [difficulty, setDifficulty] = useState<GameDifficulty>(() => getGameDifficulty());
  const roundLens = useMemo(() => sessionSequenceLengths(GAME_SESSION_ROUNDS), []);
  const sequences = useMemo(() => roundLens.map(buildSequence), [roundLens]);
  const { timeScale } = useA11yPrefs();
  const pageVisible = usePageVisible();
  const { setTimeoutSafe, setIntervalSafe, clearIntervalSafe } = useTimeoutRegistry();
  const micro = getActiveSessionPlan()?.micro ?? "normal";
  const flashMs = scaleDurationMs(
    Math.round(COLOR_MEMORY_FLASH_MS[difficulty] * microFlashScale(micro)),
    timeScale,
  );

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"show" | "input" | "feedback">("show");
  const [showIdx, setShowIdx] = useState(0);
  const [input, setInput] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [correctRound, setCorrectRound] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timerRef = useRef<number | null>(null);

  const resetDifficulty = (level: GameDifficulty) => {
    setGameDifficulty(level);
    setDifficulty(level);
    setRound(0);
    setPhase("show");
    setShowIdx(0);
    setInput([]);
    setScore(0);
    setCorrectRound(false);
    setFeedback(null);
  };

  const seq = sequences[round] ?? [];

  useEffect(() => {
    if (phase !== "show" || seq.length === 0 || !pageVisible) return;
    setShowIdx(0);
    let i = 0;
    timerRef.current = setIntervalSafe(() => {
      i += 1;
      if (i >= seq.length) {
        clearIntervalSafe(timerRef.current);
        timerRef.current = null;
        setTimeoutSafe(() => { setPhase("input"); setInput([]); }, 350);
      } else {
        setShowIdx(i);
      }
    }, flashMs);
    return () => {
      clearIntervalSafe(timerRef.current);
      timerRef.current = null;
    };
  }, [round, phase, seq.length, flashMs, pageVisible, setIntervalSafe, setTimeoutSafe, clearIntervalSafe]);

  if (round >= sequences.length) return null;

  const onPick = (id: string) => {
    if (phase !== "input") return;
    void feedbackTap();
    const next = [...input, id];
    setInput(next);
    if (next.length === seq.length) {
      const ok = next.every((c, i) => c === seq[i]);
      setCorrectRound(ok);
      setPhase("feedback");
      setFeedback(ok ? "correct" : "wrong");
      void (ok ? feedbackCorrect() : feedbackWrong());
      const newScore = ok ? score + 1 : score;
      if (ok) setScore(newScore);
      setTimeoutSafe(() => {
        if (round + 1 >= sequences.length) onFinish(newScore, sequences.length);
        else { setRound((r) => r + 1); setPhase("show"); setFeedback(null); }
      }, 1100);
    }
  };

  return (
    <GameShell
      round={round + 1}
      totalRounds={sequences.length}
      score={score}
      subtitle={`${seq.length} colours to remember`}
      feedback={feedback}
      idleHint="Watch carefully — then tap the colours in order."
      title="Watch the colours. Tap them back."
      showDifficulty
      difficulty={difficulty}
      onDifficultyChange={resetDifficulty}
    >
      <div style={{ height: 86, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        {phase === "show" && (
          <div
            role="img"
            aria-label={`${COLORS.find((c) => c.id === seq[showIdx])?.name ?? "Colour"} light`}
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: COLORS.find((c) => c.id === seq[showIdx])?.bg ?? "#fff",
              border: "3px solid #fff",
              boxShadow: `0 0 30px ${COLORS.find((c) => c.id === seq[showIdx])?.bg ?? "#fff"}55`,
              transition: "background 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            <span aria-hidden>{COLORS.find((c) => c.id === seq[showIdx])?.name?.[0] ?? "?"}</span>
          </div>
        )}
        {phase === "input" && (
          <div
            role="status"
            aria-live="polite"
            style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}
          >
            Tap the colours in order ({input.length}/{seq.length})
          </div>
        )}
        {phase === "feedback" && (
          <div
            role="status"
            aria-live="assertive"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: correctRound ? "hsl(var(--brand-green-500))" : "hsl(var(--brand-amber-200))",
              border: correctRound
                ? "2px solid rgba(34,197,94,0.7)"
                : "2px dashed rgba(251,191,36,0.8)",
              borderRadius: 12,
              padding: "6px 14px",
            }}
          >
            {correctRound ? "✓ Nice!" : "! Almost"}
          </div>
        )}
      </div>
      <div
        role="group"
        aria-label="Colour buttons"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 260, margin: "0 auto" }}
      >
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="game-choice-a11y"
            disabled={phase !== "input"}
            onClick={() => onPick(c.id)}
            aria-label={`${c.name} colour`}
            style={{
              background: c.bg,
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.45)",
              borderRadius: 12,
              padding: "20px 0",
              minHeight: 48,
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "Quicksand, sans-serif",
              cursor: phase === "input" ? "pointer" : "default",
              opacity: phase === "input" ? 1 : 0.5,
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
    </GameShell>
  );
}
