import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type TouchEvent,
} from "react";
import { ConfettiBurst } from "@/components/study-engagement";
import { GameShell } from "@/components/games/GameShell";
import { useElementSize } from "@/hooks/use-element-size";
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
import { fitCellFontSize, fitGridCellSize, GAME_LAYOUT } from "@/lib/game-layout-tokens";
import {
  GAME_SESSION_ROUNDS,
  sessionMazeMaxMoves,
} from "@/lib/game-session-progression";
import { useTimeoutRegistry } from "@/hooks/use-timeout-registry";
import { useReducedMotion } from "@/lib/reduced-motion";
import { shouldReduceGameEffects } from "@/lib/game-perf";
import {
  isMazeRuntimeDebugEnabled,
  mazeDebugNoteFinishRound,
  mazeDebugNoteFinishTimerScheduled,
  mazeDebugNoteLoadRound,
  mazeDebugNoteMazeGen,
  mazeDebugNoteOnFinish,
  mazeDebugNoteRender,
  mazeLayoutNote,
  mazeLayoutProfileReset,
} from "@/lib/maze-runtime-debug";
import {
  isMazeDebugKillSwitchEnabled,
  syncMazeDebugKillSwitchesFromUrl,
} from "@/lib/maze-debug-flags";
import { certStartupMark, isCertStartupTraceEnabled } from "@/lib/cert-startup-forensics";
import {
  mazeLifecycleCaptureRoundSnapshot,
  mazeLifecycleCelebration,
  mazeLifecycleEnd,
  mazeLifecycleGoalReached,
  mazeLifecycleMoveCheckpoint,
  mazeLifecycleNewMazeReady,
  mazeLifecycleRenderComplete,
  mazeLifecycleReward,
  mazeLifecycleSetRound,
  mazeLifecycleStart,
} from "@/lib/maze-lifecycle-forensics";
import {
  isMazeMoveTraceEnabled,
  mazeMoveTraceApplied,
  mazeMoveTraceBlocked,
  mazeMoveTraceEnter,
  mazeMoveTraceFinishEffect,
  mazeMoveTraceGoal,
  mazeMoveTraceInput,
  mazeMoveTracePendingFinish,
  mazeMoveTraceRender,
  type MoveSource,
} from "@/lib/maze-move-forensics";

const WALL = 3;
const SWIPE_THRESHOLD = 28;
const MAZE_STYLE_ID = "amynest-maze-escape-styles";

/**
 * Compositor-safe motion only (opacity / transform).
 * Never animate box-shadow or filter — those repaint every frame and freeze Android WebViews
 * as visited path cells accumulate infinite animations.
 */
const MAZE_STYLES = `
@keyframes mazeCellReveal {
  from { opacity: 0; transform: scale(0.82); }
  to { opacity: 1; transform: scale(1); }
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
@keyframes mazeGoalPulse {
  0%, 100% { opacity: 0.75; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}
@keyframes mazeVictoryPath {
  from { opacity: 0.45; }
  to { opacity: 1; }
}
@keyframes mazeShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}
@keyframes mazeWallHit {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(239,68,68,0.35); }
}
@keyframes mazeStatusIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.maze-cell { contain: layout style paint; }
.maze-cell[data-tone="empty"] { background: hsl(var(--muted) / 0.12); }
.maze-cell[data-tone="path"] { background: rgba(139,92,246,0.16); }
.maze-cell[data-tone="start"] { background: rgba(59,130,246,0.22); }
.maze-cell[data-tone="exit"] { background: rgba(34,197,94,0.32); }
.maze-cell[data-tone="player"] { background: rgba(139,92,246,0.5); }
.maze-cell[data-tone="victory"] { background: rgba(250,204,21,0.5); }
.maze-cell[data-outline="1"] { outline: 1px solid rgba(167,139,250,0.35); outline-offset: -1px; }
.maze-player-token {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
  will-change: transform;
}
`;

function ensureMazeStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(MAZE_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = MAZE_STYLE_ID;
  el.textContent = MAZE_STYLES;
  document.head.appendChild(el);
}

interface RoundState {
  size: number;
  maxMoves: number;
  maze: MazeDef;
  analysis: MazeAnalysis;
}

function buildRound(roundIdx: number, difficulty: GameDifficulty): RoundState {
  const size = adaptiveMazeSize(roundIdx, difficulty, GAME_SESSION_ROUNDS);
  const genStart = isMazeRuntimeDebugEnabled() ? performance.now() : 0;
  const { maze, analysis } = generateValidatedMaze(size, difficulty);
  if (genStart > 0) mazeDebugNoteMazeGen(performance.now() - genStart);
  return {
    size,
    maxMoves: sessionMazeMaxMoves(size, roundIdx, analysis.pathLength),
    maze,
    analysis,
  };
}

export function MazeEscapeGame({
  onFinish: onFinishProp,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const onFinish = useCallback(
    (score: number, total: number) => {
      mazeDebugNoteOnFinish(score, total);
      onFinishProp(score, total);
    },
    [onFinishProp],
  );
  mazeDebugNoteRender();
  if (isCertStartupTraceEnabled()) certStartupMark("mazeGameMounted");
  if (isMazeMoveTraceEnabled()) mazeMoveTraceRender();
  const reducedMotion = useReducedMotion();
  const reduceEffects = useMemo(() => shouldReduceGameEffects(), []);
  const skipAnimations = isMazeDebugKillSwitchEnabled("mazeSkipAnimations");
  const skipCelebration = isMazeDebugKillSwitchEnabled("mazeSkipCelebration");
  const skipAudio = isMazeDebugKillSwitchEnabled("mazeSkipAudio");
  const allowDecorativeMotion = !reducedMotion && !reduceEffects && !skipAnimations;
  const [layoutRef, { width: layoutWidth }] = useElementSize();
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
  const { setTimeoutSafe, clearTimeoutSafe } = useTimeoutRegistry();
  const doneRef = useRef(false);
  const sessionFinishedRef = useRef(false);
  const sessionScoreRef = useRef(0);
  const roundIdxRef = useRef(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const roundStartRef = useRef(Date.now());
  const wrongTurnsRef = useRef(0);
  const backtracksRef = useRef(0);
  const lastPosRef = useRef<[number, number]>([0, 0]);
  const movesRef = useRef(0);
  const visitedRef = useRef<Set<string>>(new Set(["0,0"]));
  const finishTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const bounceTimerRef = useRef<number | null>(null);
  const pendingFinishRef = useRef<{ escaped: boolean; movesUsed: number } | null>(null);
  const last = mazeSize - 1;
  const cellSize = fitGridCellSize({
    containerWidth: layoutWidth || GAME_LAYOUT.breakpoints.md,
    columns: mazeSize,
    gap: 0,
    padding: 0,
    chrome: WALL * 2,
    minCell: mazeSize >= 10 ? 18 : mazeSize >= 8 ? 22 : 28,
    maxCell: mazeSize <= 6 ? 54 : mazeSize <= 8 ? 42 : 36,
  });
  const glyphSize = fitCellFontSize(cellSize, mazeSize <= 6 ? 0.5 : 0.42);

  useEffect(() => {
    ensureMazeStyles();
    syncMazeDebugKillSwitchesFromUrl();
    if (isMazeRuntimeDebugEnabled()) {
      mazeLayoutProfileReset();
      (window as Window & { __mazeLifecycleCapture?: (n: number) => void }).__mazeLifecycleCapture =
        mazeLifecycleCaptureRoundSnapshot;
    }
    if (isCertStartupTraceEnabled()) {
      certStartupMark("roundInitialized", `initial size=${mazeSize}`);
    }
  }, []);

  roundIdxRef.current = roundIdx;
  sessionScoreRef.current = sessionScore;
  movesRef.current = moves;
  visitedRef.current = visited;

  const loadRound = useCallback((idx: number, level: GameDifficulty) => {
    mazeLifecycleStart("loadRound");
    mazeLifecycleSetRound(idx);
    clearTimeoutSafe(finishTimerRef.current);
    finishTimerRef.current = null;
    mazeDebugNoteLoadRound(idx);
    const next = buildRound(idx, level);
    setMazeSize(next.size);
    setMaxMoves(next.maxMoves);
    setMaze(next.maze);
    setAnalysis(next.analysis);
    setPos([0, 0]);
    const startVisited = new Set(["0,0"]);
    visitedRef.current = startVisited;
    setVisited(startVisited);
    setMoves(0);
    setDone(false);
    setWon(false);
    setVictoryPath(new Set());
    setRevealKey((k) => k + 1);
    doneRef.current = false;
    pendingFinishRef.current = null;
    roundStartRef.current = Date.now();
    wrongTurnsRef.current = 0;
    backtracksRef.current = 0;
    lastPosRef.current = [0, 0];
    mazeLifecycleNewMazeReady(next.size);
    mazeLifecycleEnd("loadRound", true, `idx=${idx}`);
    mazeLifecycleCaptureRoundSnapshot(idx + 1);
    if (isCertStartupTraceEnabled() && idx === 0) {
      certStartupMark("roundInitialized", `idx=${idx} size=${next.size}`);
    }
  }, [clearTimeoutSafe]);

  const finishRound = useCallback((escaped: boolean, movesUsed: number) => {
    if (doneRef.current) return;
    mazeLifecycleStart("finishRound");
    mazeDebugNoteFinishRound(escaped, false);
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
      if (!skipAudio) void feedbackCorrect();
      mazeLifecycleReward();
      if (!skipCelebration) {
        setVictoryPath(new Set(analysis.solutionPath.map(([r, c]) => `${r},${c}`)));
        if (!reduceEffects) setConfettiTrigger((t) => t + 1);
        mazeLifecycleCelebration();
      }
    }
    mazeLifecycleEnd("finishRound", true, escaped ? "escaped" : "lost");

    const newScore = sessionScoreRef.current + (escaped ? 1 : 0);
    sessionScoreRef.current = newScore;
    setSessionScore(newScore);

    clearTimeoutSafe(finishTimerRef.current);
    const delayMs = escaped ? 1400 : 900;
    mazeDebugNoteFinishTimerScheduled(false);
    finishTimerRef.current = setTimeoutSafe(() => {
      finishTimerRef.current = null;
      if (sessionFinishedRef.current) return;
      const currentRound = roundIdxRef.current;
      if (currentRound + 1 >= GAME_SESSION_ROUNDS) {
        sessionFinishedRef.current = true;
        onFinish(newScore, GAME_SESSION_ROUNDS);
      } else {
        const nextRound = currentRound + 1;
        roundIdxRef.current = nextRound;
        setRoundIdx(nextRound);
        loadRound(nextRound, difficulty);
      }
    }, delayMs);
  }, [
    analysis.pathLength,
    analysis.solutionPath,
    clearTimeoutSafe,
    difficulty,
    loadRound,
    mazeSize,
    onFinish,
    reduceEffects,
    setTimeoutSafe,
  ]);

  const resetForDifficulty = useCallback((level: GameDifficulty) => {
    clearTimeoutSafe(finishTimerRef.current);
    finishTimerRef.current = null;
    sessionFinishedRef.current = false;
    sessionScoreRef.current = 0;
    pendingFinishRef.current = null;
    setGameDifficulty(level);
    setDifficulty(level);
    setRoundIdx(0);
    roundIdxRef.current = 0;
    setSessionScore(0);
    loadRound(0, level);
  }, [clearTimeoutSafe, loadRound]);

  const move = useCallback((dir: MazeDir, source: MoveSource = "unknown") => {
    mazeMoveTraceEnter(source, doneRef.current);
    if (doneRef.current) return;
    const [r, c] = lastPosRef.current;
    if (!canMoveMaze(maze, r, c, dir)) {
      mazeMoveTraceBlocked(source, `${r},${c}`);
      wrongTurnsRef.current += 1;
      if (!skipAudio) void feedbackWrong();
      setShakeGrid(true);
      setWallHitCell(`${r},${c}`);
      clearTimeoutSafe(shakeTimerRef.current);
      shakeTimerRef.current = setTimeoutSafe(() => {
        shakeTimerRef.current = null;
        setShakeGrid(false);
        setWallHitCell(null);
      }, 320);
      return;
    }
    if (!skipAudio) void feedbackMove();
    const nr = dir === "up" ? r - 1 : dir === "down" ? r + 1 : r;
    const nc = dir === "left" ? c - 1 : dir === "right" ? c + 1 : c;
    const key = `${nr},${nc}`;
    const nm = movesRef.current + 1;
    if (visitedRef.current.has(key)) backtracksRef.current += 1;
    const nextVisited = new Set(visitedRef.current).add(key);
    visitedRef.current = nextVisited;
    setVisited(nextVisited);
    if (allowDecorativeMotion) {
      setPlayerBounce(true);
      clearTimeoutSafe(bounceTimerRef.current);
      bounceTimerRef.current = setTimeoutSafe(() => {
        bounceTimerRef.current = null;
        setPlayerBounce(false);
      }, 280);
    }
    lastPosRef.current = [nr, nc];
    setPos([nr, nc]);
    setMoves(nm);
    mazeMoveTraceApplied(source, `${nr},${nc}`, nm);
    mazeLifecycleMoveCheckpoint(`${nr},${nc} m=${nm}`);
    if (nr === last && nc === last) {
      mazeMoveTraceGoal(source);
      mazeLifecycleGoalReached(nm);
      pendingFinishRef.current = { escaped: true, movesUsed: nm };
      mazeMoveTracePendingFinish();
    } else if (nm >= maxMoves) {
      pendingFinishRef.current = { escaped: false, movesUsed: nm };
      mazeMoveTracePendingFinish();
    }
  }, [allowDecorativeMotion, clearTimeoutSafe, last, maxMoves, maze, setTimeoutSafe]);

  useEffect(() => {
    const pending = pendingFinishRef.current;
    if (!pending || doneRef.current) return;
    pendingFinishRef.current = null;
    mazeMoveTraceFinishEffect();
    finishRound(pending.escaped, pending.movesUsed);
  }, [moves, pos, finishRound]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { e.preventDefault(); mazeMoveTraceInput("keyboard"); move("up", "keyboard"); }
      if (e.key === "ArrowDown") { e.preventDefault(); mazeMoveTraceInput("keyboard"); move("down", "keyboard"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); mazeMoveTraceInput("keyboard"); move("left", "keyboard"); }
      if (e.key === "ArrowRight") { e.preventDefault(); mazeMoveTraceInput("keyboard"); move("right", "keyboard"); }
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
    if (Math.abs(dx) > Math.abs(dy)) { mazeMoveTraceInput("touch"); move(dx > 0 ? "right" : "left", "touch"); }
    else { mazeMoveTraceInput("touch"); move(dy > 0 ? "down" : "up", "touch"); }
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
          ? "You made it — great planning!"
          : "Moves used up — nice try! Next maze."
        : "Swipe, arrows, or D-pad to move.",
    [done, won],
  );

  const useReveal = allowDecorativeMotion && mazeSize <= 7;
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Static wall shell — rebuilt only when maze geometry changes (not every move).
  const staticCells = useMemo(() => {
    const rows: ReactElement[] = [];
    for (let r = 0; r < mazeSize; r++) {
      for (let c = 0; c < mazeSize; c++) {
        const key = `${r},${c}`;
        const isStart = r === 0 && c === 0;
        const isExit = r === last && c === last;
        const revealDelay = useReveal ? (r + c) * 0.018 : 0;
        rows.push(
          <div
            key={`${revealKey}-${key}`}
            data-cell={key}
            data-tone={isExit ? "exit" : isStart ? "start" : "empty"}
            className="maze-cell"
            style={{
              width: cellSize,
              height: cellSize,
              borderRight: c < last && maze.right[r]?.[c]
                ? `${WALL}px solid hsl(var(--brand-violet-600))`
                : `${WALL}px solid transparent`,
              borderBottom: r < last && maze.down[r]?.[c]
                ? `${WALL}px solid hsl(var(--brand-violet-600))`
                : `${WALL}px solid transparent`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: glyphSize,
              animation: useReveal ? `mazeCellReveal 0.35s ease ${revealDelay}s both` : undefined,
            }}
          >
            {isExit ? (
              <span
                style={{
                  display: "inline-block",
                  animation: allowDecorativeMotion
                    ? "mazeGoalPulse 1.8s ease-in-out infinite"
                    : undefined,
                }}
              >
                🏁
              </span>
            ) : isStart ? (
              "🚀"
            ) : null}
          </div>,
        );
      }
    }
    return rows;
  }, [
    allowDecorativeMotion,
    cellSize,
    glyphSize,
    last,
    maze.down,
    maze.right,
    mazeSize,
    revealKey,
    useReveal,
  ]);

  // Imperative tone updates — avoid React reconciling N×N cells on every move.
  useLayoutEffect(() => {
    if (isMazeDebugKillSwitchEnabled("mazeSkipLayoutEffect")) return;
    const skipToneSweep = isMazeDebugKillSwitchEnabled("mazeSkipToneSweep");
    const t0 = isMazeRuntimeDebugEnabled() ? performance.now() : 0;
    let domReads = 0;
    let domWrites = 0;
    const grid = gridRef.current;
    if (!grid) return;
    const nodes = grid.querySelectorAll<HTMLElement>("[data-cell]");
    domReads += 1;
    for (const el of nodes) {
      const key = el.dataset.cell!;
      domReads += 1;
      const [r, c] = key.split(",").map(Number);
      const isStart = r === 0 && c === 0;
      const isExit = r === last && c === last;
      const showVictory = victoryPath.has(key);
      const onPath = visited.has(key);
      let tone = "empty";
      if (showVictory) tone = "victory";
      else if (isExit) tone = "exit";
      else if (isStart) tone = "start";
      else if (onPath) tone = "path";
      if (!skipToneSweep && el.dataset.tone !== tone) {
        el.dataset.tone = tone;
        domWrites += 1;
      }
      const outline = onPath && solutionSet.has(key) && !showVictory ? "1" : "";
      if (el.dataset.outline !== outline) {
        el.dataset.outline = outline;
        domWrites += 1;
      }
      if (wallHitCell === key) {
        el.style.animation = "mazeWallHit 0.32s ease";
        domWrites += 1;
      } else if (el.style.animation?.includes("mazeWallHit")) {
        el.style.animation = useReveal ? el.style.animation : "";
        domWrites += 1;
      }
      // Clear start rocket once path begins.
      if (isStart && onPath && el.textContent === "🚀") {
        el.textContent = "";
        domWrites += 1;
      }
    }
    const layoutMs = t0 > 0 ? performance.now() - t0 : 0;
    if (t0 > 0) mazeLayoutNote(layoutMs, nodes.length, domReads, domWrites);
    if (isMazeRuntimeDebugEnabled()) {
      mazeLifecycleRenderComplete(layoutMs, nodes.length);
    }
    if (isCertStartupTraceEnabled() && nodes.length > 0) {
      certStartupMark("mazeGridFirstRender", `nodes=${nodes.length} ms=${Math.round(layoutMs)}`);
    }
  }, [last, solutionSet, useReveal, victoryPath, visited, wallHitCell]);

  return (
    <GameShell
      round={roundIdx + 1}
      totalRounds={GAME_SESSION_ROUNDS}
      score={sessionScore}
      subtitle={`Path planning · ${mazeSize}×${mazeSize} · Moves ${moves}/${maxMoves}`}
      progress={movePct}
      progressLabel="Moves left"
      idleHint="Plan your path — take your time."
      showDifficulty
      difficulty={difficulty}
      onDifficultyChange={resetForDifficulty}
      footer={footer}
    >
      <div ref={layoutRef} style={{ position: "relative", width: "100%", maxWidth: "100%" }}>
        {!reduceEffects && !skipCelebration && <ConfettiBurst trigger={confettiTrigger} />}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            touchAction: "none",
            userSelect: "none",
            animation: allowDecorativeMotion && shakeGrid ? "mazeShake 0.32s ease" : undefined,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            overflow: "visible",
          }}
        >
          <div
            key={revealKey}
            ref={gridRef}
            data-testid="maze-grid"
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: `repeat(${mazeSize}, ${cellSize}px)`,
              gap: 0,
              border: `${WALL}px solid hsl(var(--brand-violet-600))`,
              borderRadius: 14,
              overflow: "hidden",
              margin: "0 auto 16px",
              maxWidth: "100%",
              boxSizing: "border-box",
              boxShadow: allowDecorativeMotion
                ? "0 10px 32px rgba(139,92,246,0.32), inset 0 1px 0 rgba(255,255,255,0.08)"
                : "none",
              background: "hsl(var(--muted) / 0.08)",
            }}
          >
            {staticCells}
            <div
              className="maze-player-token"
              aria-hidden
              style={{
                width: cellSize,
                height: cellSize,
                fontSize: glyphSize,
                left: pc * cellSize,
                top: pr * cellSize,
                transform: playerBounce && allowDecorativeMotion ? "scale(1.12)" : "scale(1)",
                transition: allowDecorativeMotion ? "left 80ms linear, top 80ms linear" : "none",
                animation:
                  allowDecorativeMotion && !escaped && !playerBounce
                    ? "mazePlayerPulse 1.6s ease-in-out infinite"
                    : playerBounce && allowDecorativeMotion
                      ? "mazePlayerBounce 0.28s ease"
                      : undefined,
              }}
            >
              {escaped ? "🎉" : "🟣"}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(3, ${GAME_LAYOUT.touchMin}px)`,
          gap: GAME_LAYOUT.gridGap,
          margin: "0 auto",
          width: "fit-content",
          maxWidth: "100%",
        }}
      >
        <div />
        <DPadBtn onClick={() => { mazeMoveTraceInput("dpad"); move("up", "dpad"); }} label="▲" ariaLabel="Move up" />
        <div />
        <DPadBtn onClick={() => { mazeMoveTraceInput("dpad"); move("left", "dpad"); }} label="◀" ariaLabel="Move left" />
        <div />
        <DPadBtn onClick={() => { mazeMoveTraceInput("dpad"); move("right", "dpad"); }} label="▶" ariaLabel="Move right" />
        <div />
        <DPadBtn onClick={() => { mazeMoveTraceInput("dpad"); move("down", "dpad"); }} label="▼" ariaLabel="Move down" />
        <div />
      </div>

      {done && (
        <div
          role="status"
          style={{
            marginTop: 14,
            fontSize: 14,
            fontWeight: 700,
            color: won ? gameTheme.success : gameTheme.error,
            animation: allowDecorativeMotion ? "mazeStatusIn 0.28s ease" : undefined,
          }}
        >
          {won ? "You escaped! 🎉" : "Out of moves! Next maze is coming…"}
        </div>
      )}
    </GameShell>
  );
}

function DPadBtn({
  onClick,
  label,
  ariaLabel,
}: {
  onClick: () => void;
  label: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: GAME_LAYOUT.touchMin,
        height: GAME_LAYOUT.touchMin,
        minWidth: GAME_LAYOUT.touchMin,
        minHeight: GAME_LAYOUT.touchMin,
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
        padding: 0,
      }}
    >
      {label}
    </button>
  );
}
