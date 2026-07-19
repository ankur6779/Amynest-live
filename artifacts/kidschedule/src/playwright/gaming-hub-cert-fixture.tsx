/**
 * Production certification fixture — all Gaming Hub playables (no auth shell).
 */
import { StrictMode, Suspense, useMemo, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../i18n";
import { MazeEscapeGame } from "@/components/games/MazeEscape";
import { ColorFillGame } from "@/components/games/ColorFill";
import { TargetTapGame } from "@/components/games/TargetTap";
import { GAME_LOADERS, type GamePlayProps } from "@/components/games/game-loaders";
import { setGameDifficulty, type GameDifficulty } from "@/lib/game-difficulty";
import { GAME_PERF_STYLES } from "@/lib/game-perf";
import { Toaster } from "@/components/ui/toaster";
import { lazy } from "react";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") ?? "maze-hard";

type CertMode =
  | "maze-easy"
  | "maze-normal"
  | "maze-hard"
  | "color-fill"
  | "color-fill-wrong"
  | "target-tap"
  | `game:${string}`;

function resolveMode(): CertMode {
  if (mode.startsWith("game:")) return mode as CertMode;
  if (mode === "target-tap") return "target-tap";
  if (mode.startsWith("maze-")) return mode as CertMode;
  if (mode === "color-fill" || mode === "color-fill-wrong") return mode as CertMode;
  if (GAME_LOADERS[mode]) return `game:${mode}`;
  return "color-fill";
}

const resolved = resolveMode();
if (resolved.startsWith("maze-")) {
  setGameDifficulty(resolved.replace("maze-", "") as GameDifficulty);
}

function LazyGameHost({ gameId }: { gameId: string }) {
  const Comp = useMemo(() => {
    const loader = GAME_LOADERS[gameId];
    if (!loader) return null;
    return lazy(loader);
  }, [gameId]);
  const [finishLog, setFinishLog] = useState<{ score: number; total: number } | null>(null);
  if (!Comp) return <div data-testid="gh-cert-missing">Missing {gameId}</div>;
  const Game = Comp as ComponentType<GamePlayProps>;
  return (
    <div data-testid={`gh-cert-game-${gameId}`} data-game-id={gameId}>
      <Suspense fallback={<div data-testid="gh-cert-loading">Loading…</div>}>
        <Game onFinish={(score, total) => setFinishLog({ score, total })} />
      </Suspense>
      {finishLog && (
        <div data-testid="gh-cert-finished">
          {finishLog.score}/{finishLog.total}
        </div>
      )}
    </div>
  );
}

function CertApp() {
  const [activeMode] = useState<CertMode>(resolved);
  const [finishLog, setFinishLog] = useState<{ score: number; total: number } | null>(null);
  const mazeLevel = activeMode.startsWith("maze-")
    ? (activeMode.replace("maze-", "") as GameDifficulty)
    : null;

  if (activeMode.startsWith("game:")) {
    return <LazyGameHost gameId={activeMode.slice(5)} />;
  }

  if (activeMode === "target-tap") {
    return (
      <div data-testid="gh-cert-target-tap-root">
        <TargetTapGame onFinish={(score, total) => setFinishLog({ score, total })} />
        {finishLog && (
          <div data-testid="gh-cert-finished">
            {finishLog.score}/{finishLog.total}
          </div>
        )}
      </div>
    );
  }

  if (activeMode.startsWith("maze-")) {
    return (
      <div data-testid="gh-cert-maze" data-difficulty={mazeLevel}>
        <MazeEscapeGame
          key={mazeLevel ?? "maze"}
          onFinish={(score, total) => setFinishLog({ score, total })}
        />
      </div>
    );
  }

  return (
    <div data-testid="gh-cert-color-fill" data-mode={activeMode}>
      <ColorFillGame onFinish={(score, total) => setFinishLog({ score, total })} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <style>{GAME_PERF_STYLES}</style>
    <CertApp />
    <Toaster />
  </StrictMode>,
);
