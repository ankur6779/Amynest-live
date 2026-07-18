import { Play } from "lucide-react";
import { useEffect } from "react";
import type { GameDef } from "@/lib/games";
import { formatSkillTimeLine } from "@/lib/game-hub-meta";
import { getGameLearning } from "@/lib/game-learning";
import { GAME_INTRO_AUTO_MS, getGameIntro } from "@/lib/game-experience";
import { feedbackTap } from "@/lib/game-feedback";
import { gameTheme } from "@/lib/game-theme";
import { GAME_LAYOUT } from "@/lib/game-layout-tokens";
import { useReducedMotion } from "@/lib/reduced-motion";
import { GameEmojiBadge } from "@/components/games/GameEmojiBadge";

interface GamePlayIntroProps {
  game: GameDef;
  onStart: () => void;
}

/** Excited entry before first interaction — educational clarity + warm start. */
export function GamePlayIntro({ game, onStart }: GamePlayIntroProps) {
  const reduced = useReducedMotion();
  const intro = getGameIntro(game);
  const learning = getGameLearning(game);

  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(onStart, GAME_INTRO_AUTO_MS);
    return () => window.clearTimeout(t);
  }, [onStart, reduced]);

  return (
    <div
      role="region"
      aria-label={`${game.title} ready to play`}
      className="game-motion-enter px-1 pb-1 pt-2 text-center"
    >
      <div className="mb-3 flex justify-center">
        <GameEmojiBadge
          emoji={game.emoji}
          category={game.category}
          size="xl"
          float={!reduced}
          label={`${game.title} icon`}
        />
      </div>
      <h3
        style={{
          margin: "0 0 6px",
          fontSize: gameTheme.type.hero,
          fontFamily: gameTheme.fontDisplay,
          fontWeight: 800,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          color: gameTheme.text,
        }}
      >
        {intro.title}
      </h3>
      <p
        style={{
          margin: "0 0 6px",
          fontSize: gameTheme.type.label,
          fontWeight: 700,
          color: gameTheme.accentSoft,
        }}
      >
        {formatSkillTimeLine(game)}
      </p>
      <p
        style={{
          margin: "0 auto 10px",
          maxWidth: 300,
          fontSize: gameTheme.type.body,
          lineHeight: 1.45,
          color: gameTheme.textMuted,
        }}
      >
        {intro.body}
      </p>
      <p
        style={{
          margin: "0 auto 18px",
          maxWidth: 320,
          fontSize: 11,
          lineHeight: 1.4,
          color: "rgba(199,192,232,0.85)",
        }}
      >
        <span style={{ fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 9 }}>
          Why it helps
        </span>
        <br />
        {intro.parentWhy}
        <br />
        <span style={{ opacity: 0.9 }}>Tip: {learning.parentTip}</span>
      </p>
      <button
        type="button"
        className="game-motion-press game-motion-focus"
        onClick={() => {
          void feedbackTap();
          onStart();
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: GAME_LAYOUT.touchMin,
          minWidth: 180,
          padding: "12px 22px",
          borderRadius: gameTheme.radiusPill,
          border: "none",
          cursor: "pointer",
          fontWeight: 800,
          fontSize: 14,
          color: "#fff",
          background: gameTheme.playGradient,
          boxShadow: gameTheme.playShadow,
        }}
      >
        <Play className="h-4 w-4 fill-current" aria-hidden />
        {intro.cta}
      </button>
    </div>
  );
}
