import { useEffect, useState } from "react";
import { gameTheme } from "@/lib/game-theme";

const PREVIEW_FRAMES: Record<string, string[]> = {
  "pattern-match": ["🟥", "🟦", "🟩", "❓"],
  "odd-one-out": ["🍎", "🍌", "🍇", "🚗"],
  "card-flip": ["✦", "🐶", "✦", "🐱"],
  "sequence": ["🔴", "🔵", "🟢", "🟡"],
  "color-memory": ["🎨", "🔴", "🔵", "🟢"],
  "speed-math": ["2+3", "5×4", "9−2", "✓"],
  "number-match": ["●●●", "3", "●●●●", "4"],
  "find-mistake": ["🐶", "🐶", "🐱", "🐶"],
  "target-tap": ["🎯", "💫", "🎯", "⭐"],
  "what-should-you-do": ["💛", "🤝", "💭", "✨"],
  "spot-difference": ["🌳", "🌲", "🌳", "👀"],
  "hidden-objects": ["🔭", "🌸", "🐛", "🦋"],
  "color-fill": ["🖍️", "🟥", "🟦", "🖼️"],
  "shape-match": ["🔷", "⭕", "🔺", "⭐"],
  "maze-escape": ["🚀", "🟣", "➡️", "🏁"],
};

interface GamePreviewTileProps {
  gameId: string;
  emoji: string;
  active?: boolean;
}

export function GamePreviewTile({ gameId, emoji, active = true }: GamePreviewTileProps) {
  const frames = PREVIEW_FRAMES[gameId] ?? [emoji, "✨", emoji, "🎮"];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 850);
    return () => window.clearInterval(id);
  }, [active, frames.length]);

  return (
    <div
      style={{
        fontSize: 36,
        lineHeight: 1,
        width: 56,
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(145deg, hsl(var(--brand-violet-500) / 0.18), hsl(var(--card)))`,
        borderRadius: 14,
        border: `1px solid ${gameTheme.glassBorder}`,
        transition: "transform 0.25s ease",
        transform: active ? "scale(1.02)" : "none",
      }}
      aria-hidden
    >
      {active ? frames[frame] : emoji}
    </div>
  );
}
