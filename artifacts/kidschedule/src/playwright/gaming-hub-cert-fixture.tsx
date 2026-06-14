/**
 * Production certification fixture — Maze Escape + Color Fill (no auth shell).
 */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../i18n";
import { MazeEscapeGame } from "@/components/games/MazeEscape";
import { ColorFillGame } from "@/components/games/ColorFill";
import { setGameDifficulty, type GameDifficulty } from "@/lib/game-difficulty";
import { Toaster } from "@/components/ui/toaster";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") ?? "maze-hard";

type CertMode = "maze-easy" | "maze-normal" | "maze-hard" | "color-fill" | "color-fill-wrong";

function resolveMode(): CertMode {
  if (mode.startsWith("maze-")) return mode as CertMode;
  if (mode === "color-fill-wrong") return "color-fill-wrong";
  return "color-fill";
}

if (resolveMode().startsWith("maze-")) {
  const level = resolveMode().replace("maze-", "") as GameDifficulty;
  setGameDifficulty(level);
}

function CertApp() {
  const [activeMode] = useState<CertMode>(resolveMode());
  const [finishLog, setFinishLog] = useState<{ score: number; total: number } | null>(null);
  const mazeLevel = activeMode.startsWith("maze-")
    ? (activeMode.replace("maze-", "") as GameDifficulty)
    : null;

  if (activeMode.startsWith("maze-")) {
    return (
      <div data-testid="gh-cert-maze" data-difficulty={mazeLevel}>
        <MazeEscapeGame key={mazeLevel ?? "maze"} onFinish={(score, total) => setFinishLog({ score, total })} />
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
    <CertApp />
    <Toaster />
  </StrictMode>,
);
