import type { CSSProperties } from "react";
import { Play, RotateCcw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GameDef } from "@/lib/games";
import {
  getChildPracticeFamily,
  getChildResultHeadline,
  getChildResultSubline,
} from "@/lib/game-experience";
import { getLearningPracticeSummary } from "@/lib/game-learning";
import { getAmyCelebrationLine } from "@/lib/game-amy-voice";
import { formatSkillTimeLine, getNextBestSkillCue } from "@/lib/game-hub-meta";
import { formatParentMastery, getPracticeSkillFamily } from "@/lib/game-mastery";
import { gameTheme } from "@/lib/game-theme";
import { GAME_LAYOUT } from "@/lib/game-layout-tokens";
import { ConfettiBurst } from "@/components/study-engagement";
import { GameEmojiBadge } from "@/components/games/GameEmojiBadge";
import { prefetchGame } from "@/components/games/game-loaders";

interface GameResultPanelProps {
  game: GameDef;
  score: number;
  total: number;
  pointsEarned: number;
  perfect: boolean;
  nextGame?: GameDef;
  canPlayAgain: boolean;
  canPlayNext: boolean;
  onPlayAgain: () => void;
  onPlayNext: () => void;
  onDone: () => void;
}

/**
 * Satisfying finish — shared motion, emoji badge language, Amy celebration.
 * No new reward systems.
 */
export function GameResultPanel({
  game,
  score,
  total,
  pointsEarned,
  perfect,
  nextGame,
  canPlayAgain,
  canPlayNext,
  onPlayAgain,
  onPlayNext,
  onDone,
}: GameResultPanelProps) {
  const { t } = useTranslation();
  const confettiTrigger = perfect ? 2 : 1;
  const headline = getChildResultHeadline(perfect, score, total);
  const subline = getChildResultSubline(game);
  const practice = getLearningPracticeSummary(game, score, total);
  const amyLine = getAmyCelebrationLine(perfect, score + total);
  const practiceFamily = getChildPracticeFamily(game);
  const parentMastery = formatParentMastery(game.id, true);
  const nextCue = getNextBestSkillCue(nextGame);

  return (
    <div className="game-motion-enter relative px-1 pt-1 text-center" role="status" aria-live="polite">
      <ConfettiBurst trigger={confettiTrigger} />
      <div className="game-motion-pop mb-2 flex justify-center">
        <GameEmojiBadge
          emoji={perfect ? "🌟" : game.emoji}
          category={game.category}
          size="xl"
          label={perfect ? "Perfect score" : `${game.title} complete`}
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
        {headline}
      </h3>
      <p
        style={{
          color: gameTheme.accentSoft,
          fontSize: 13,
          fontWeight: 700,
          margin: "0 0 6px",
          lineHeight: 1.4,
        }}
      >
        {amyLine}
      </p>
      <p style={{ color: "#c7c0e8", fontSize: 14, margin: "0 0 6px" }}>
        {t("screens.games.you_scored")}{" "}
        <strong>
          {score} / {total}
        </strong>
      </p>
      <p
        style={{
          color: gameTheme.accentSoft,
          fontSize: 14,
          fontWeight: 800,
          margin: "0 0 6px",
        }}
      >
        <Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden />
        {subline}
      </p>
      <p
        style={{
          color: gameTheme.textMuted,
          fontSize: 12,
          fontWeight: 700,
          margin: "0 0 14px",
        }}
      >
        {practiceFamily}
      </p>

      {/* Mastery-first — Nest points demoted (legacy unlock currency). */}
      {pointsEarned > 0 && (
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(199,192,232,0.75)",
          }}
        >
          {t("screens.games.points_demoted_note", {
            defaultValue: "Nest points saved for unlocks: +{{count}}",
            count: pointsEarned,
          })}
        </p>
      )}

      <div
        style={{
          textAlign: "left",
          margin: "0 auto 16px",
          maxWidth: 340,
          padding: "10px 12px",
          borderRadius: gameTheme.radiusCard - 2,
          border: `1px solid ${gameTheme.glassBorder}`,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "hsl(var(--brand-amber-200))",
          }}
        >
          {t("screens.games.parent_practice_label", { defaultValue: "What we practised" })}
        </p>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1.35,
            color: gameTheme.text,
          }}
        >
          {practice.headline} · {parentMastery}
        </p>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 12,
            lineHeight: 1.45,
            color: gameTheme.textMuted,
          }}
        >
          {practice.body}
        </p>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 11,
            lineHeight: 1.4,
            color: "rgba(199,192,232,0.9)",
          }}
        >
          {practice.tip}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "stretch",
          maxWidth: 280,
          margin: "0 auto",
        }}
      >
        {nextGame && canPlayNext && (
          <button
            type="button"
            className="game-motion-press game-motion-focus"
            onClick={onPlayNext}
            onMouseEnter={() => prefetchGame(nextGame.id)}
            style={primaryBtn}
          >
            <Play className="h-4 w-4 fill-current" aria-hidden />
            {nextCue}
          </button>
        )}
        {nextGame && (
          <p style={{ margin: 0, fontSize: 11, color: gameTheme.textMuted }}>
            {nextGame.title} · {getPracticeSkillFamily(nextGame.id)} · {formatSkillTimeLine(nextGame)}
          </p>
        )}
        {canPlayAgain && (
          <button
            type="button"
            className="game-motion-press game-motion-focus"
            onClick={onPlayAgain}
            onMouseEnter={() => prefetchGame(game.id)}
            style={secondaryBtn}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t("screens.games.play_again", { defaultValue: "Practice this skill again" })}
          </button>
        )}
        <button
          type="button"
          className="game-motion-press game-motion-focus"
          onClick={onDone}
          style={ghostBtn}
        >
          {t("screens.games.done")}
        </button>
      </div>
    </div>
  );
}

const primaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: GAME_LAYOUT.touchMin,
  borderRadius: gameTheme.radiusPill,
  border: "none",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 14,
  color: "#fff",
  background: gameTheme.playGradient,
  boxShadow: gameTheme.playShadow,
};

const secondaryBtn: CSSProperties = {
  ...primaryBtn,
  background: gameTheme.violetGradient,
  boxShadow: gameTheme.violetShadow,
};

const ghostBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: GAME_LAYOUT.touchMin,
  borderRadius: gameTheme.radiusPill,
  border: `1px solid ${gameTheme.glassBorder}`,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
  color: gameTheme.textMuted,
  background: "transparent",
};
