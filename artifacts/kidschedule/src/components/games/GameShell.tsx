import type { ReactNode } from "react";
import { gameTheme } from "@/lib/game-theme";
import {
  DIFFICULTY_LABEL,
  type GameDifficulty,
} from "@/lib/game-difficulty";

export type GameFeedback = "correct" | "wrong" | null;

export interface GameShellProps {
  title?: string;
  subtitle?: string;
  round?: number;
  totalRounds?: number;
  score?: number;
  /** 0–100; auto-derived from round/totalRounds when omitted */
  progress?: number;
  progressLabel?: string;
  feedback?: GameFeedback;
  feedbackText?: string;
  difficulty?: GameDifficulty;
  onDifficultyChange?: (level: GameDifficulty) => void;
  showDifficulty?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

const DIFFICULTIES: GameDifficulty[] = ["easy", "normal", "hard"];

export function GameShell({
  title,
  subtitle,
  round,
  totalRounds,
  score,
  progress,
  progressLabel,
  feedback,
  feedbackText,
  difficulty = "normal",
  onDifficultyChange,
  showDifficulty = false,
  footer,
  children,
}: GameShellProps) {
  const derivedProgress =
    progress ??
    (round != null && totalRounds != null && totalRounds > 0
      ? Math.min(100, ((round - 1) / totalRounds) * 100)
      : undefined);

  return (
    <div style={{ textAlign: "center", color: gameTheme.text }}>
      {(subtitle || (round != null && totalRounds != null) || score != null) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            color: gameTheme.textMuted,
            fontSize: 12,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <span>{subtitle ?? (round != null && totalRounds != null ? `Round ${round} of ${totalRounds}` : "")}</span>
          {score != null && (
            <span style={{ fontWeight: 800, color: gameTheme.accentSoft }}>
              Score: {score}
            </span>
          )}
        </div>
      )}

      {derivedProgress != null && (
        <div style={{ marginBottom: 12 }}>
          {progressLabel && (
            <div style={{ fontSize: 11, color: gameTheme.textMuted, marginBottom: 4, textAlign: "left" }}>
              {progressLabel}
            </div>
          )}
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: gameTheme.progressTrack,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${derivedProgress}%`,
                height: "100%",
                background: feedback === "wrong"
                  ? `linear-gradient(90deg, hsl(var(--brand-red-500)), hsl(var(--brand-red-300)))`
                  : `linear-gradient(90deg, hsl(var(--brand-violet-500)), hsl(var(--brand-green-400)))`,
                transition: "width 0.25s ease",
              }}
            />
          </div>
        </div>
      )}

      {title && (
        <h3
          style={{
            margin: "0 0 14px",
            color: gameTheme.text,
            fontSize: 15,
            fontFamily: gameTheme.fontDisplay,
            fontWeight: 800,
          }}
        >
          {title}
        </h3>
      )}

      {showDifficulty && onDifficultyChange && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          {DIFFICULTIES.map((level) => {
            const active = difficulty === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => onDifficultyChange(level)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  border: active
                    ? "1px solid hsl(var(--brand-violet-400))"
                    : `1px solid ${gameTheme.glassBorder}`,
                  background: active
                    ? "rgba(139,92,246,0.28)"
                    : "hsl(var(--muted) / 0.25)",
                  color: active ? gameTheme.text : gameTheme.textMuted,
                }}
              >
                {DIFFICULTY_LABEL[level]}
              </button>
            );
          })}
        </div>
      )}

      {feedback && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 800,
            background: feedback === "correct" ? gameTheme.successBg : gameTheme.errorBg,
            color: feedback === "correct" ? gameTheme.success : gameTheme.error,
            animation: "gameShellPop 0.25s ease",
          }}
        >
          {feedbackText ?? (feedback === "correct" ? "Correct!" : "Try again!")}
        </div>
      )}

      {children}

      {footer && (
        <div style={{ marginTop: 12, color: gameTheme.textMuted, fontSize: 11 }}>
          {footer}
        </div>
      )}

      <style>{`
        @keyframes gameShellPop {
          0% { transform: scale(0.96); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
