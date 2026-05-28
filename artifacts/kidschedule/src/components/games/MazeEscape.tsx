import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { GameShell } from "@/components/games/GameShell";
import {
  getGameDifficulty,
  setGameDifficulty,
  MAZE_CONFIG,
  type GameDifficulty,
} from "@/lib/game-difficulty";
import { feedbackMove, feedbackWrong } from "@/lib/game-feedback";
import {
  canMoveMaze,
  getSolvableMazes,
  type MazeDef,
  type MazeDir,
} from "@/lib/maze-generator";
import { gameTheme } from "@/lib/game-theme";

const WALL = 3;
const SWIPE_THRESHOLD = 28;

function pickMaze(size: number): MazeDef {
  const pool = getSolvableMazes(size);
  return pool[Math.floor(Math.random() * pool.length)] ?? getSolvableMazes(size)[0];
}

export function MazeEscapeGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const [difficulty, setDifficulty] = useState<GameDifficulty>(() => getGameDifficulty());
  const config = MAZE_CONFIG[difficulty];
  const [maze, setMaze] = useState<MazeDef>(() => pickMaze(config.size));
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [visited, setVisited] = useState<Set<string>>(() => new Set(["0,0"]));
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const last = config.size - 1;
  const cellSize = config.size <= 5 ? 54 : 42;

  const resetForDifficulty = useCallback((level: GameDifficulty) => {
    const next = MAZE_CONFIG[level];
    setGameDifficulty(level);
    setDifficulty(level);
    setMaze(pickMaze(next.size));
    setPos([0, 0]);
    setVisited(new Set(["0,0"]));
    setMoves(0);
    setDone(false);
    doneRef.current = false;
  }, []);

  const move = useCallback((dir: MazeDir) => {
    if (doneRef.current) return;
    setPos(([r, c]) => {
      if (!canMoveMaze(maze, r, c, dir)) {
        void feedbackWrong();
        return [r, c];
      }
      void feedbackMove();
      const nr = dir === "up" ? r - 1 : dir === "down" ? r + 1 : r;
      const nc = dir === "left" ? c - 1 : dir === "right" ? c + 1 : c;
      setVisited((v) => new Set(v).add(`${nr},${nc}`));
      setMoves((m) => {
        const nm = m + 1;
        if (nr === last && nc === last) {
          doneRef.current = true;
          setDone(true);
          const score = nm <= config.maxMoves ? Math.max(1, config.maxMoves - nm + 1) : 1;
          setTimeout(() => onFinish(score, config.maxMoves), 700);
        } else if (nm >= config.maxMoves) {
          doneRef.current = true;
          setDone(true);
          setTimeout(() => onFinish(0, config.maxMoves), 700);
        }
        return nm;
      });
      return [nr, nc];
    });
  }, [config.maxMoves, last, maze, onFinish]);

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
  const won = pr === last && pc === last;
  const movePct = Math.min(100, (moves / config.maxMoves) * 100);

  const footer = useMemo(
    () => (done ? (won ? "You escaped! 🎉" : "Out of moves! Try again.") : "Arrow keys, swipe, or D-pad to move."),
    [done, won],
  );

  return (
    <GameShell
      subtitle={`Guide 🟣 from 🚀 to 🏁 · ${config.size}×${config.size} · Moves ${moves}/${config.maxMoves}`}
      progress={movePct}
      progressLabel="Move budget"
      showDifficulty
      difficulty={difficulty}
      onDifficultyChange={resetForDifficulty}
      footer={footer}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <div
          style={{
            display: "inline-grid",
            gridTemplateColumns: `repeat(${config.size}, ${cellSize}px)`,
            gap: 0,
            border: `${WALL}px solid hsl(var(--brand-violet-600))`,
            borderRadius: 12,
            overflow: "hidden",
            margin: "0 auto 16px",
            boxShadow: "0 8px 24px rgba(139,92,246,0.25)",
          }}
        >
          {Array.from({ length: config.size }, (_, r) =>
            Array.from({ length: config.size }, (_, c) => {
              const isPlayer = r === pr && c === pc;
              const isStart = r === 0 && c === 0;
              const isExit = r === last && c === last;
              const onPath = visited.has(`${r},${c}`);
              const wallRight = c < last && maze.right[r]?.[c];
              const wallBottom = r < last && maze.down[r]?.[c];
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: isPlayer
                      ? "rgba(139,92,246,0.45)"
                      : isExit
                      ? "rgba(34,197,94,0.28)"
                      : isStart
                      ? "rgba(59,130,246,0.18)"
                      : onPath
                      ? "rgba(139,92,246,0.12)"
                      : "hsl(var(--muted) / 0.15)",
                    borderRight: wallRight ? `${WALL}px solid hsl(var(--brand-violet-600))` : `${WALL}px solid transparent`,
                    borderBottom: wallBottom ? `${WALL}px solid hsl(var(--brand-violet-600))` : `${WALL}px solid transparent`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: config.size <= 5 ? 22 : 18,
                    transition: "background 0.15s",
                  }}
                >
                  {isPlayer ? (won ? "🎉" : "🟣") : isExit ? "🏁" : isStart && !onPath ? "🚀" : null}
                </div>
              );
            }),
          )}
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

      {done && (
        <div
          style={{
            marginTop: 14,
            fontSize: 14,
            fontWeight: 700,
            color: won ? gameTheme.success : gameTheme.error,
          }}
        >
          {won ? "You escaped! 🎉" : "Out of moves! Try again next time."}
        </div>
      )}
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
