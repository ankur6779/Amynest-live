import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfettiBurst } from "@/components/study-engagement";
import { GameShell } from "@/components/games/GameShell";
import {
  getGameDifficulty,
  setGameDifficulty,
  type GameDifficulty,
} from "@/lib/game-difficulty";
import { adaptiveMazeSize, recordMazeRoundStats } from "@/lib/game-maze-analytics";
import { feedbackCorrect, feedbackMove, feedbackWrong } from "@/lib/game-feedback";
import {
  canMoveMaze,
  generateValidatedMaze,
  type MazeAnalysis,
  type MazeDef,
  type MazeDir,
} from "@/lib/maze-generator";
import { gameTheme } from "@/lib/game-theme";
import {
  GAME_SESSION_ROUNDS,
  sessionMazeMaxMoves,
} from "@/lib/game-session-progression";

const WALL = 3;
const SWIPE_THRESHOLD = 28;

const MAZE_STYLES = `
@keyframes mazeCellReveal {
  from { opacity: 0; transform: scale(0.82); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes mazePathGlow {
  0%, 100% { box-shadow: inset 0 0 0 0 rgba(167,139,250,0.15); }
  50% { box-shadow: inset 0 0 14px 2px rgba(167,139,250,0.35); }
}
@keyframes mazePlayerPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
@keyframes mazePlayerBounce {
  0% { transform: scale(0.85); }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes mazeGoalSparkle {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(74,222,128,0.5)); }
  50% { filter: drop-shadow(0 0 10px rgba(74,222,128,0.95)); }
}
@keyframes mazeVictoryPath {
  from { background: rgba(250,204,21,0.15); }
  to { background: rgba(250,204,21,0.55); }
}
@keyframes mazeShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}
@keyframes mazeWallHit {
  0% { box-shadow: inset 0 0 0 0 rgba(239,68,68,0); }
  50% { box-shadow: inset 0 0 12px 2px rgba(239,68,68,0.55); }
  100% { box-shadow: inset 0 0 0 0 rgba(239,68,68,0); }
}
`;

interface RoundState {
  size: number;
  maxMoves: number;
  maze: MazeDef;
  analysis: MazeAnalysis;
}

function buildRound(roundIdx: number, difficulty: GameDifficulty): RoundState {
  const size = adaptiveMazeSize(roundIdx, difficulty, GAME_SESSION_ROUNDS);
  const { maze, analysis } = generateValidatedMaze(size, difficulty);
  return {
    size,
    maxMoves: sessionMazeMaxMoves(size, roundIdx, analysis.pathLength),
    maze,
    analysis,
  };
}

function cellSizeForGrid(size: number): number {
  if (size <= 6) return 54;
  if (size <= 8) return 42;
  if (size <= 10) return 36;
  return 30;
}

export function MazeEscapeGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const [difficulty, setDifficulty] = useState<GameDifficulty>(() => getGameDifficulty());
  const [roundIdx, setRoundIdx] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const initial = useMemo(() => buildRound(0, getGameDifficulty()), []);
  const [mazeSize, setMazeSize] = useState(initial.size);
  const [maxMoves, setMaxMoves] = useState(initial.maxMoves);
  const [maze, setMaze] = useState<MazeDef>(() => initial.maze);
  const [analysis, setAnalysis] = useState<MazeAnalysis>(() => initial.analysis);
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [visited, setVisited] = useState<Set<string>>(() => new Set(["0,0"]));
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [won, setWon] = useState(false);
  const [shakeGrid, setShakeGrid] = useState(false);
  const [wallHitCell, setWallHitCell] = useState<string | null>(null);
  const [playerBounce, setPlayerBounce] = useState(false);
  const [victoryPath, setVictoryPath] = useState<Set<string>>(new Set());
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [revealKey, setRevealKey] = useState(0);
  const doneRef = useRef(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const roundStartRef = useRef(Date.now());
  const wrongTurnsRef = useRef(0);
  const backtracksRef = useRef(0);
  const lastPosRef = useRef<[number, number]>([0, 0]);
  const last = mazeSize - 1;
  const cellSize = cellSizeForGrid(mazeSize);

  const loadRound = useCallback((idx: number, level: GameDifficulty) => {
    const next = buildRound(idx, level);
    setMazeSize(next.size);
    setMaxMoves(next.maxMoves);
    setMaze(next.maze);
    setAnalysis(next.analysis);
    setPos([0, 0]);
    setVisited(new Set(["0,0"]));
    setMoves(0);
    setDone(false);
    setWon(false);
    setVictoryPath(new Set());
    setRevealKey((k) => k + 1);
    doneRef.current = false;
    roundStartRef.current = Date.now();
    wrongTurnsRef.current = 0;
    backtracksRef.current = 0;
    lastPosRef.current = [0, 0];
  }, []);

  const finishRound = useCallback((escaped: boolean, movesUsed: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    setWon(escaped);

    recordMazeRoundStats({
      completionTimeMs: Date.now() - roundStartRef.current,
      wrongTurns: wrongTurnsRef.current,
      backtracks: backtracksRef.current,
      difficulty,
      size: mazeSize,
      won: escaped,
      movesUsed,
      pathLength: analysis.pathLength,
    });

    if (escaped) {
      void feedbackCorrect();
      setVictoryPath(new Set(analysis.solutionPath.map(([r, c]) => `${r},${c}`)));
      setConfettiTrigger((t) => t + 1);
    }

    setSessionScore((s) => {
      const newScore = escaped ? s + 1 : s;
      setTimeout(() => {
        if (roundIdx + 1 >= GAME_SESSION_ROUNDS) {
          onFinish(newScore, GAME_SESSION_ROUNDS);
        } else {
          setRoundIdx((r) => r + 1);
          loadRound(roundIdx + 1, difficulty);
        }
      }, escaped ? 1400 : 900);
      return newScore;
    });
  }, [analysis.pathLength, analysis.solutionPath, difficulty, loadRound, mazeSize, onFinish, roundIdx]);

  const resetForDifficulty = useCallback((level: GameDifficulty) => {
    setGameDifficulty(level);
    setDifficulty(level);
    setRoundIdx(0);
    setSessionScore(0);
    loadRound(0, level);
  }, [loadRound]);

  const move = useCallback((dir: MazeDir) => {
    if (doneRef.current) return;
    setPos(([r, c]) => {
      if (!canMoveMaze(maze, r, c, dir)) {
        wrongTurnsRef.current += 1;
        void feedbackWrong();
        setShakeGrid(true);
        setWallHitCell(`${r},${c}`);
        setTimeout(() => {
          setShakeGrid(false);
          setWallHitCell(null);
        }, 320);
        return [r, c];
      }
      void feedbackMove();
      const nr = dir === "up" ? r - 1 : dir === "down" ? r + 1 : r;
      const nc = dir === "left" ? c - 1 : dir === "right" ? c + 1 : c;
      const key = `${nr},${nc}`;
      setVisited((v) => {
        if (v.has(key)) backtracksRef.current += 1;
        return new Set(v).add(key);
      });
      setPlayerBounce(true);
      setTimeout(() => setPlayerBounce(false), 280);
      lastPosRef.current = [nr, nc];
      setMoves((m) => {
        const nm = m + 1;
        if (nr === last && nc === last) finishRound(true, nm);
        else if (nm >= maxMoves) finishRound(false, nm);
        return nm;
      });
      return [nr, nc];
    });
  }, [finishRound, last, maxMoves, maze]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { e.preventDefault(); move("up"); }
      if (e.key === "ArrowDown") { e.preventDefault(); move("down"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); move("left"); }
      if (e.key === "ArrowRight") { e.preventDefault(); move("right"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  };

  const [pr, pc] = pos;
  const escaped = pr === last && pc === last;
  const movePct = Math.min(100, (moves / maxMoves) * 100);
  const solutionSet = useMemo(
    () => new Set(analysis.solutionPath.map(([r, c]) => `${r},${c}`)),
    [analysis.solutionPath],
  );

  const footer = useMemo(
    () =>
      done
        ? won
          ? "You escaped! 🎉"
          : "Out of moves — next maze!"
        : "Arrow keys, swipe, or D-pad to move.",
    [done, won],
  );

  return (
    <GameShell
      round={roundIdx + 1}
      totalRounds={GAME_SESSION_ROUNDS}
      score={sessionScore}
      subtitle={`Guide 🟣 from 🚀 to 🏁 · ${mazeSize}×${mazeSize} · Moves ${moves}/${maxMoves}`}
      progress={movePct}
      progressLabel="Move budget"
      showDifficulty
      difficulty={difficulty}
      onDifficultyChange={resetForDifficulty}
      footer={footer}
    >
      <style>{MAZE_STYLES}</style>
      <div style={{ position: "relative" }}>
        <ConfettiBurst trigger={confettiTrigger} />
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            touchAction: "none",
            userSelect: "none",
            animation: shakeGrid ? "mazeShake 0.32s ease" : undefined,
          }}
        >
        <div
          key={revealKey}
          data-testid="maze-grid"
          style={{
              display: "inline-grid",
              gridTemplateColumns: `repeat(${mazeSize}, ${cellSize}px)`,
              gap: 0,
              border: `${WALL}px solid hsl(var(--brand-violet-600))`,
              borderRadius: 14,
              overflow: "hidden",
              margin: "0 auto 16px",
              boxShadow:
                "0 10px 32px rgba(139,92,246,0.32), inset 0 1px 0 rgba(255,255,255,0.08)",
              background: "hsl(var(--muted) / 0.08)",
            }}
          >
            {Array.from({ length: mazeSize }, (_, r) =>
              Array.from({ length: mazeSize }, (_, c) => {
                const key = `${r},${c}`;
                const isPlayer = r === pr && c === pc;
                const isStart = r === 0 && c === 0;
                const isExit = r === last && c === last;
                const onPath = visited.has(key);
                const onSolution = solutionSet.has(key);
                const showVictory = victoryPath.has(key);
                const wallRight = c < last && maze.right[r]?.[c];
                const wallBottom = r < last && maze.down[r]?.[c];
                const revealDelay = (r + c) * 0.018;
                return (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: showVictory
                        ? "rgba(250,204,21,0.5)"
                        : isPlayer
                          ? "rgba(139,92,246,0.5)"
                          : isExit
                            ? "rgba(34,197,94,0.32)"
                            : isStart
                              ? "rgba(59,130,246,0.22)"
                              : onPath
                                ? "rgba(139,92,246,0.16)"
                                : "hsl(var(--muted) / 0.12)",
                      borderRight: wallRight
                        ? `${WALL}px solid hsl(var(--brand-violet-600))`
                        : `${WALL}px solid transparent`,
                      borderBottom: wallBottom
                        ? `${WALL}px solid hsl(var(--brand-violet-600))`
                        : `${WALL}px solid transparent`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: mazeSize <= 6 ? 22 : mazeSize <= 8 ? 18 : 15,
                      transition: "background 0.2s ease",
                      animation: [
                        `mazeCellReveal 0.35s ease ${revealDelay}s both`,
                        onPath && !isPlayer && !showVictory ? "mazePathGlow 2.4s ease-in-out infinite" : "",
                        wallHitCell === key ? "mazeWallHit 0.32s ease" : "",
                        showVictory ? "mazeVictoryPath 0.6s ease forwards" : "",
                      ]
                        .filter(Boolean)
                        .join(", "),
                      boxShadow:
                        onPath && onSolution && !showVictory
                          ? "inset 0 0 8px rgba(167,139,250,0.2)"
                          : undefined,
                    }}
                  >
                    {isPlayer ? (
                      <span
                        style={{
                          display: "inline-block",
                          animation: playerBounce
                            ? "mazePlayerBounce 0.28s ease"
                            : escaped
                              ? undefined
                              : "mazePlayerPulse 1.6s ease-in-out infinite",
                        }}
                      >
                        {escaped ? "🎉" : "🟣"}
                      </span>
                    ) : isExit ? (
                      <span style={{ animation: "mazeGoalSparkle 1.8s ease-in-out infinite" }}>🏁</span>
                    ) : isStart && !onPath ? (
                      "🚀"
                    ) : null}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "44px 44px 44px", gap: 6, margin: "0 auto", width: "fit-content" }}>
        <div />
        <DPadBtn onClick={() => move("up")} label="▲" />
        <div />
        <DPadBtn onClick={() => move("left")} label="◀" />
        <div />
        <DPadBtn onClick={() => move("right")} label="▶" />
        <div />
        <DPadBtn onClick={() => move("down")} label="▼" />
        <div />
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 14,
              fontSize: 14,
              fontWeight: 700,
              color: won ? gameTheme.success : gameTheme.error,
            }}
          >
            {won ? "You escaped! 🎉" : "Out of moves! Next maze is coming…"}
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}

function DPadBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "linear-gradient(145deg, rgba(139,92,246,0.35), rgba(139,92,246,0.15))",
        border: "1px solid rgba(167,139,250,0.45)",
        color: "hsl(var(--brand-purple-300))",
        fontSize: 16,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(139,92,246,0.2)",
      }}
    >
      {label}
    </button>
  );
}
