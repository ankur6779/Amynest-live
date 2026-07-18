import { getAmyLoadingLine } from "@/lib/game-amy-voice";
import { gameTheme } from "@/lib/game-theme";

interface GameChunkLoaderProps {
  /** Salt for rotating Amy loading copy */
  salt?: number;
}

/** Shimmer + Amy line — no blank Suspense screens. */
export function GameChunkLoader({ salt = 0 }: GameChunkLoaderProps) {
  const line = getAmyLoadingLine(salt);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="game-motion-enter px-2 py-7 text-center"
    >
      <div className="mx-auto mb-4 flex w-full max-w-[240px] flex-col gap-2.5">
        <div className="game-shimmer h-3 self-center rounded-full" style={{ width: "60%" }} />
        <div className="game-shimmer mx-auto h-[120px] w-full rounded-2xl" />
        <div className="game-shimmer h-3 self-center rounded-full" style={{ width: "80%" }} />
        <div className="game-shimmer h-10 w-full rounded-full" />
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 700,
          color: gameTheme.textMuted,
          fontFamily: gameTheme.fontDisplay,
        }}
      >
        {line}
      </p>
    </div>
  );
}
