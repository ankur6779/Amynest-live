import { useTranslation } from "react-i18next";
import { getAmyExitPrompt } from "@/lib/game-amy-voice";
import { gameTheme } from "@/lib/game-theme";
import { GAME_LAYOUT } from "@/lib/game-layout-tokens";
import { GamesDialogSurface } from "@/components/games/GamesDialogSurface";

interface GamesExitConfirmProps {
  gameTitle: string;
  onKeepPlaying: () => void;
  onLeave: () => void;
}

/** Warm exit confirm — never punitive. */
export function GamesExitConfirm({ gameTitle, onKeepPlaying, onLeave }: GamesExitConfirmProps) {
  const { t } = useTranslation();
  const prompt = getAmyExitPrompt();

  return (
    <GamesDialogSurface
      ariaLabel={t("screens.games.exit_confirm_aria", { defaultValue: "Leave game?" })}
      title={t("screens.games.exit_confirm_title", { defaultValue: "Pause adventure?" })}
      subtitle={gameTitle}
      onClose={onKeepPlaying}
      preventBackdropClose
      solidBackdrop
    >
      <p
        style={{
          margin: "0 0 18px",
          fontSize: 14,
          lineHeight: 1.45,
          color: gameTheme.textMuted,
          textAlign: "center",
        }}
      >
        {prompt}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 280, margin: "0 auto" }}>
        <button
          type="button"
          onClick={onKeepPlaying}
          className="game-motion-press game-motion-focus"
          style={{
            minHeight: GAME_LAYOUT.touchMin,
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
          {t("screens.games.keep_playing", { defaultValue: "Keep playing" })}
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="game-motion-press game-motion-focus"
          style={{
            minHeight: GAME_LAYOUT.touchMin,
            borderRadius: gameTheme.radiusPill,
            border: `1px solid ${gameTheme.glassBorder}`,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13,
            color: gameTheme.textMuted,
            background: "transparent",
          }}
        >
          {t("screens.games.leave_for_now", { defaultValue: "Leave for now" })}
        </button>
      </div>
    </GamesDialogSurface>
  );
}
