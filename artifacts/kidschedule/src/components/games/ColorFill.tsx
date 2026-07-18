import { useMemo, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfettiBurst } from "@/components/study-engagement";
import { GameShell } from "@/components/games/GameShell";
import {
  COLOR_FILL_GRID_SIZE,
  COLOR_FILL_PALETTE,
  COLOR_FILL_PICTURES,
  evaluateColorFillGrid,
  isColorFillBoardFull,
} from "@/lib/color-fill-validation";
import { feedbackCorrect, feedbackTap, feedbackWrong } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import { GAME_SESSION_ROUNDS } from "@/lib/game-session-progression";

const PALETTE = COLOR_FILL_PALETTE;
const PICTURES = COLOR_FILL_PICTURES;
const GRID_SIZE = COLOR_FILL_GRID_SIZE;

const COLOR_FILL_STYLES = `
@keyframes cfCellShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
@keyframes cfErrorGlow {
  0%, 100% { box-shadow: inset 0 0 0 0 rgba(239,68,68,0); }
  50% { box-shadow: inset 0 0 14px 2px rgba(239,68,68,0.55); }
}
@keyframes cfCorrectPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@keyframes cfWave {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.92; }
  100% { transform: scale(1); opacity: 1; }
}
`;

type CheckResult =
  | { kind: "success" }
  | { kind: "error"; wrongCount: number; correctCount: number; percent: number; wrongCells: Set<string> };

export function ColorFillGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const picOrder = useMemo(() => {
    const shuffled = [...PICTURES].sort(() => Math.random() - 0.5);
    const out = [...shuffled];
    while (out.length < GAME_SESSION_ROUNDS) {
      out.push(shuffled[out.length % shuffled.length]);
    }
    return out.slice(0, GAME_SESSION_ROUNDS);
  }, []);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [activePalette, setActivePalette] = useState<number>(0);
  const [filled, setFilled] = useState<Map<string, number>>(new Map());
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const [showPattern, setShowPattern] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  const pic = picOrder[roundIdx];
  const usedPalette = PALETTE.filter((p) => (pic.usedColors as readonly number[]).includes(p.id));

  const fill = (r: number, c: number) => {
    if (checkResult?.kind === "success") return;
    void feedbackTap();
    const key = `${r}-${c}`;
    setFilled((prev) => {
      const next = new Map(prev);
      next.set(key, activePalette);
      return next;
    });
    setHighlightedCells((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    if (checkResult?.kind === "error") setCheckResult(null);
  };

  const allFilled = useMemo(() => isColorFillBoardFull(filled), [filled]);

  const checkAndAdvance = () => {
    const result = evaluateColorFillGrid(pic.grid, filled);
    if (!result.allCorrect) {
      setCheckResult({
        kind: "error",
        wrongCount: result.wrongCount,
        correctCount: result.correctCount,
        percent: result.percent,
        wrongCells: result.wrongCells,
      });
      setHighlightedCells(result.wrongCells);
      setFeedback("wrong");
      void feedbackWrong();
      return;
    }

    const newScore = score + 1;
    setScore(newScore);
    setFeedback("correct");
    setCheckResult({ kind: "success" });
    setCelebrate(true);
    setConfettiTrigger((t) => t + 1);
    void feedbackCorrect();
    setTimeout(() => {
      if (roundIdx + 1 >= GAME_SESSION_ROUNDS) {
        onFinish(newScore, GAME_SESSION_ROUNDS);
      } else {
        setRoundIdx((i) => i + 1);
        setFilled(new Map());
        setActivePalette(pic.usedColors[0] ?? 0);
        setFeedback(null);
        setCheckResult(null);
        setHighlightedCells(new Set());
        setCelebrate(false);
        setShowPattern(false);
      }
    }, 1600);
  };

  const useHint = () => {
    if (score <= 0) return;
    const evaluation = evaluateColorFillGrid(pic.grid, filled);
    let hintKey: string | null = null;
    for (const key of evaluation.wrongCells) {
      hintKey = key;
      break;
    }
    if (!hintKey) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const key = `${r}-${c}`;
          if (!filled.has(key)) {
            hintKey = key;
            break;
          }
        }
        if (hintKey) break;
      }
    }
    if (!hintKey) return;
    setScore((s) => Math.max(0, s - 1));
    setHighlightedCells(new Set([hintKey]));
  };

  const cellSize = highContrast ? 58 : 60;

  return (
    <GameShell
      round={roundIdx + 1}
      totalRounds={GAME_SESSION_ROUNDS}
      score={score}
      feedback={feedback}
      feedbackText={
        feedback === "correct"
          ? "Perfect colours! 🎨"
          : feedback === "wrong"
            ? "Some cells need fixing — see highlights below."
            : undefined
      }
      subtitle={`Picture: ${pic.label}`}
      title="Pick a colour. Fill to match the picture."
      idleHint="Check the preview picture — match each colour one cell at a time."
      footer="Use shape markers + target preview to match the pattern."
    >
      <style>{COLOR_FILL_STYLES}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setShowPattern((v) => !v)}
          style={toggleBtnStyle(showPattern)}
        >
          {showPattern ? "Hide Pattern" : "Show Pattern"}
        </button>
        <button
          type="button"
          onClick={() => setHighContrast((v) => !v)}
          style={toggleBtnStyle(highContrast)}
        >
          {highContrast ? "Normal Contrast" : "High Contrast"}
        </button>
        <button type="button" onClick={useHint} disabled={score <= 0} style={hintBtnStyle(score <= 0)}>
          Hint (−1 score)
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        {(showPattern || highContrast) && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: gameTheme.textMuted, marginBottom: 6 }}>Target preview</div>
            <MiniGrid
              grid={pic.grid}
              cellSize={14}
              highContrast={highContrast}
              showShapes
            />
          </div>
        )}

        <div style={{ position: "relative" }}>
          <ConfettiBurst trigger={confettiTrigger} />
          <div
            data-testid="color-fill-grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
              gap: 4,
              margin: "0 auto 14px",
              width: "fit-content",
              background: highContrast ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.05)",
              padding: 6,
              borderRadius: 14,
              border: highContrast ? "2px solid #fff" : `1px solid ${gameTheme.glassBorder}`,
            }}
          >
            {pic.grid.map((row, r) =>
              row.map((targetIdx, c) => {
                const key = `${r}-${c}`;
                const paintedIdx = filled.get(key);
                const painted = paintedIdx !== undefined;
                const isWrong = checkResult?.kind === "error" && checkResult.wrongCells.has(key);
                const isHinted = highlightedCells.has(key);
                const isCorrectOnCheck = checkResult?.kind === "success";
                const isCorrectOnError =
                  checkResult?.kind === "error" && painted && paintedIdx === targetIdx;
                const paletteEntry = painted ? PALETTE[paintedIdx!] : PALETTE[targetIdx];
                const waveDelay = (r + c) * 0.05;
                return (
                  <button
                    key={key}
                    type="button"
                    data-testid={`color-fill-cell-${r}-${c}`}
                    onClick={() => fill(r, c)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 10,
                      background: painted
                        ? highContrast
                          ? paletteEntry?.hc ?? "#fff"
                          : paletteEntry?.color ?? "#fff"
                        : showPattern
                          ? `${PALETTE[targetIdx]?.color ?? "#888"}33`
                          : "rgba(255,255,255,0.08)",
                      border: isWrong
                        ? "3px solid rgba(239,68,68,0.95)"
                        : isCorrectOnError
                          ? "2px solid rgba(34,197,94,0.85)"
                        : isHinted
                          ? "3px solid rgba(250,204,21,0.95)"
                          : isCorrectOnCheck
                            ? "2px solid rgba(34,197,94,0.85)"
                            : highContrast
                              ? "2px solid #fff"
                              : `1px solid ${gameTheme.glassBorder}`,
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.12s, border 0.12s",
                      animation: [
                        isWrong ? "cfCellShake 0.4s ease, cfErrorGlow 0.5s ease" : "",
                        isCorrectOnError ? "cfCorrectPulse 0.6s ease 2" : "",
                        isCorrectOnCheck ? `cfWave 0.5s ease ${waveDelay}s` : "",
                        isHinted && !isWrong ? "cfCorrectPulse 1s ease-in-out infinite" : "",
                      ]
                        .filter(Boolean)
                        .join(", "),
                    }}
                    title={`Target: ${PALETTE[targetIdx]?.label} ${PALETTE[targetIdx]?.shape}`}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        left: 4,
                        fontSize: highContrast ? 14 : 11,
                        color: highContrast ? "#000" : "rgba(255,255,255,0.85)",
                        fontWeight: 800,
                        textShadow: highContrast ? "none" : "0 1px 2px rgba(0,0,0,0.5)",
                      }}
                    >
                      {PALETTE[targetIdx]?.shape}
                    </span>
                    {!painted && !showPattern && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 4,
                          right: 4,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: PALETTE[targetIdx]?.color,
                          opacity: 0.55,
                          border: highContrast ? "1px solid #fff" : "none",
                        }}
                      />
                    )}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {usedPalette.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePalette(p.id)}
            title={`${p.label} ${p.shape}`}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: highContrast ? p.hc : p.color,
              border: activePalette === p.id ? "3px solid #fff" : "2px solid transparent",
              cursor: "pointer",
              boxShadow: activePalette === p.id ? `0 0 0 2px ${highContrast ? p.hc : p.color}` : "none",
              transition: "all 0.15s",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: highContrast ? "#000" : "rgba(255,255,255,0.9)",
                fontWeight: 800,
              }}
            >
              {p.shape}
            </span>
          </button>
        ))}
      </div>

      {allFilled && checkResult?.kind !== "success" && (
        <button type="button" id="gh-cert-check-btn" onClick={checkAndAdvance} style={checkBtnStyle}>
          Check! ✓
        </button>
      )}

      <AnimatePresence>
        {checkResult?.kind === "error" && (
          <ResultModal
            title="Almost there!"
            body={`${checkResult.wrongCount} cell${checkResult.wrongCount === 1 ? "" : "s"} still need a tweak · ${checkResult.percent}% matching. You can fix them!`}
            primaryLabel="Keep going"
            onPrimary={() => {
              setCheckResult(null);
              setFeedback(null);
            }}
          />
        )}
        {checkResult?.kind === "success" && celebrate && (
          <ResultModal
            title="Beautiful match!"
            body="You practised colour matching and careful checking."
            onPrimary={() => {}}
            hideButton
          />
        )}
      </AnimatePresence>
    </GameShell>
  );
}

function MiniGrid({
  grid,
  cellSize,
  highContrast,
  showShapes,
}: {
  grid: ReadonlyArray<ReadonlyArray<number>>;
  cellSize: number;
  highContrast: boolean;
  showShapes?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
        gap: 2,
        padding: 4,
        borderRadius: 8,
        border: `1px solid ${gameTheme.glassBorder}`,
        background: "rgba(0,0,0,0.2)",
      }}
    >
      {grid.map((row, r) =>
        row.map((idx, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: 3,
              background: highContrast ? PALETTE[idx]?.hc : PALETTE[idx]?.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: cellSize * 0.55,
              color: highContrast ? "#000" : "rgba(255,255,255,0.85)",
            }}
          >
            {showShapes ? PALETTE[idx]?.shape : null}
          </div>
        )),
      )}
    </div>
  );
}

function ResultModal({
  title,
  body,
  extra,
  primaryLabel = "OK",
  onPrimary,
  hideButton,
}: {
  title: string;
  body: string;
  extra?: string;
  primaryLabel?: string;
  onPrimary: () => void;
  hideButton?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
      }}
      onClick={onPrimary}
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, hsl(var(--card)), hsl(var(--muted) / 0.35))",
          border: `1px solid ${gameTheme.glassBorder}`,
          borderRadius: 16,
          padding: "20px 22px",
          maxWidth: 320,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: gameTheme.textMuted, marginBottom: extra ? 6 : 14 }}>{body}</div>
        {extra && (
          <div style={{ fontSize: 13, fontWeight: 700, color: gameTheme.accentSoft, marginBottom: 14 }}>{extra}</div>
        )}
        {!hideButton && (
          <button type="button" onClick={onPrimary} style={checkBtnStyle}>
            {primaryLabel}
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

const checkBtnStyle: CSSProperties = {
  background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
  color: gameTheme.text,
  border: "none",
  borderRadius: 999,
  padding: "10px 24px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  marginBottom: 8,
};

function toggleBtnStyle(active: boolean): CSSProperties {
  return {
    background: active ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.08)",
    color: gameTheme.text,
    border: active ? "1px solid rgba(167,139,250,0.6)" : `1px solid ${gameTheme.glassBorder}`,
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}

function hintBtnStyle(disabled: boolean): CSSProperties {
  return {
    background: disabled ? "rgba(255,255,255,0.05)" : "rgba(250,204,21,0.18)",
    color: disabled ? gameTheme.textMuted : gameTheme.text,
    border: `1px solid ${disabled ? gameTheme.glassBorder : "rgba(250,204,21,0.45)"}`,
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}
