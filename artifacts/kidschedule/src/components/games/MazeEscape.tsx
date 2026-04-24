import { useCallback, useEffect, useRef, useState } from "react";

// ── Maze definitions ──────────────────────────────────────────────────────────
// Each maze is a 5×5 grid. For cell (r,c), `right[r][c]` = wall on the right,
// `down[r][c]` = wall below. The player starts at (0,0) and must reach (4,4).
// Outer boundary walls are implicit.

interface MazeDef {
  right: boolean[][];  // [row][col], col 0..3
  down: boolean[][];   // [row][col], row 0..3
}

const MAZES: MazeDef[] = [
  {
    // Path: (0,0)→R→R→R→R(0,4)→D→D→D→D(4,4)  (right-edge corridor then down)
    right: [
      [false, false, false, false],
      [true,  true,  true,  true],
      [true,  true,  true,  true],
      [true,  true,  true,  true],
      [true,  true,  true,  false],
    ],
    down: [
      [true,  true,  true,  true,  false],
      [true,  true,  true,  true,  false],
      [true,  true,  true,  true,  false],
      [true,  true,  true,  true,  false],
    ],
  },
  {
    // S-shaped path: right along row 0, down col 4 to row 2, left to col 0, down to row 4, right to (4,4)
    right: [
      [false, false, false, false],
      [false, true,  true,  true],
      [false, false, false, false],
      [true,  true,  true,  false],
      [false, false, false, false],
    ],
    down: [
      [true, true, true, true, false],
      [true, true, true, true, true],
      [true, true, true, true, false],
      [false, true, true, true, true],
    ],
  },
  {
    // Spiral-ish: row 0 right, col 4 down, row 4 left, col 0 up-middle, then snake
    right: [
      [false, false, false, false],
      [true,  true,  true,  true],
      [false, false, false, false],
      [false, true,  true,  true],
      [false, false, false, false],
    ],
    down: [
      [true,  true,  true,  true,  false],
      [false, true,  true,  true,  true],
      [true,  true,  true,  true,  false],
      [false, true,  true,  true,  true],
    ],
  },
];

type Dir = "up" | "down" | "left" | "right";
const CELL = 54;
const WALL = 3;
const MAX_MOVES = 40;

function canMove(maze: MazeDef, r: number, c: number, dir: Dir): boolean {
  if (dir === "up")    return r > 0 && !maze.down[r - 1]?.[c];
  if (dir === "down")  return r < 4 && !maze.down[r]?.[c];
  if (dir === "left")  return c > 0 && !maze.right[r]?.[c - 1];
  if (dir === "right") return c < 4 && !maze.right[r]?.[c];
  return false;
}

export function MazeEscapeGame({ onFinish }: { onFinish: (score: number, total: number) => void }) {
  const [mazeIdx] = useState(() => Math.floor(Math.random() * MAZES.length));
  const maze = MAZES[mazeIdx];
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  const move = useCallback((dir: Dir) => {
    if (doneRef.current) return;
    setPos(([r, c]) => {
      if (!canMove(maze, r, c, dir)) return [r, c];
      const nr = dir === "up" ? r - 1 : dir === "down" ? r + 1 : r;
      const nc = dir === "left" ? c - 1 : dir === "right" ? c + 1 : c;
      setMoves((m) => {
        const nm = m + 1;
        if (nr === 4 && nc === 4) {
          doneRef.current = true;
          setDone(true);
          const score = nm <= MAX_MOVES ? Math.max(1, MAX_MOVES - nm + 1) : 1;
          setTimeout(() => onFinish(score, MAX_MOVES), 700);
        } else if (nm >= MAX_MOVES) {
          doneRef.current = true;
          setDone(true);
          setTimeout(() => onFinish(0, MAX_MOVES), 700);
        }
        return nm;
      });
      return [nr, nc];
    });
  }, [maze, onFinish]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp")    { e.preventDefault(); move("up"); }
      if (e.key === "ArrowDown")  { e.preventDefault(); move("down"); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); move("left"); }
      if (e.key === "ArrowRight") { e.preventDefault(); move("right"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  const [pr, pc] = pos;
  const won = pr === 4 && pc === 4;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#a99fd9", fontSize: 12, marginBottom: 8 }}>
        Guide the 🟣 dot to 🏁 — Moves: <strong style={{ color: moves > MAX_MOVES * 0.75 ? "#fca5a5" : "#fff" }}>{moves}</strong> / {MAX_MOVES}
      </div>

      {/* Maze grid */}
      <div style={{
        display: "inline-grid",
        gridTemplateColumns: `repeat(5, ${CELL}px)`,
        gap: 0,
        border: `${WALL}px solid #7c3aed`,
        borderRadius: 8,
        overflow: "hidden",
        margin: "0 auto 16px",
      }}>
        {Array.from({ length: 5 }, (_, r) =>
          Array.from({ length: 5 }, (_, c) => {
            const isPlayer = r === pr && c === pc;
            const isExit = r === 4 && c === 4;
            const wallRight = c < 4 && maze.right[r]?.[c];
            const wallBottom = r < 4 && maze.down[r]?.[c];
            return (
              <div key={`${r}-${c}`} style={{
                width: CELL, height: CELL,
                background: isPlayer
                  ? "rgba(139,92,246,0.3)"
                  : isExit
                  ? "rgba(34,197,94,0.2)"
                  : "rgba(255,255,255,0.03)",
                borderRight: wallRight ? `${WALL}px solid #7c3aed` : `${WALL}px solid transparent`,
                borderBottom: wallBottom ? `${WALL}px solid #7c3aed` : `${WALL}px solid transparent`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
                transition: "background 0.15s",
              }}>
                {isPlayer ? (won ? "🎉" : "🟣") : isExit ? "🏁" : null}
              </div>
            );
          })
        )}
      </div>

      {/* On-screen d-pad */}
      <div style={{ display: "grid", gridTemplateColumns: "40px 40px 40px", gap: 6, margin: "0 auto", width: "fit-content" }}>
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
        <div style={{ marginTop: 14, fontSize: 14, fontWeight: 700, color: won ? "#86efac" : "#fca5a5" }}>
          {won ? "You escaped! 🎉" : "Out of moves! Try again next time."}
        </div>
      )}
      <div style={{ marginTop: 8, color: "#7c6fb8", fontSize: 11 }}>
        Use arrow keys or the pad below to move.
      </div>
    </div>
  );
}

function DPadBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 40, height: 40, borderRadius: 10,
        background: "rgba(139,92,246,0.2)",
        border: "1px solid rgba(139,92,246,0.4)",
        color: "#e9d5ff", fontSize: 16, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >{label}</button>
  );
}
