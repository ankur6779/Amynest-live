import { useEffect, useRef, useState, type ReactNode } from "react";
import { gameTheme } from "@/lib/game-theme";
import { GAME_LAYOUT } from "@/lib/game-layout-tokens";
import {
  DIFFICULTY_LABEL,
  type GameDifficulty,
} from "@/lib/game-difficulty";
import {
  GAME_IDLE_HINT_MS,
  getCorrectEncouragement,
  getIdleHint,
  getWrongEncouragement,
} from "@/lib/game-experience";
import { feedbackStateMark } from "@/lib/game-a11y";
import { useReducedMotion } from "@/lib/reduced-motion";
import { getActiveTheme, getThemeTint } from "@/lib/game-mastery";

const SHELL_STYLE_ID = "amynest-game-shell-styles";
const SHELL_CSS = `
  .game-shell-root button:not(:disabled) {
    touch-action: manipulation;
    transition: transform var(--game-motion-press, 100ms) var(--game-ease-out, ease-out);
  }
  .game-shell-root button:not(:disabled):active {
    transform: scale(var(--game-press-scale, 0.97));
  }
  .game-shell-root.game-shell-reduced button:not(:disabled) {
    transition: none;
  }
  .game-shell-root.game-shell-reduced button:not(:disabled):active {
    transform: none;
  }
`;

function ensureShellStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHELL_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = SHELL_STYLE_ID;
  el.textContent = SHELL_CSS;
  document.head.appendChild(el);
}

export type GameFeedback = "correct" | "wrong" | null;

export interface GameShellProps {
  title?: string;
  subtitle?: string;
  round?: number;
  totalRounds?: number;
  score?: number;
  progress?: number;
  progressLabel?: string;
  feedback?: GameFeedback;
  feedbackText?: string;
  difficulty?: GameDifficulty;
  onDifficultyChange?: (level: GameDifficulty) => void;
  showDifficulty?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  /** Contextual idle tip — does not reveal answers. */
  idleHint?: string;
}

const DIFFICULTIES: GameDifficulty[] = ["easy", "normal", "hard"];

/**
 * Shared play chrome — encouraging feedback, idle tips, press polish.
 * Entry intro lives in GamePlayIntro (modal). Benchmark: Duolingo soft fail + Apple motion.
 */
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
  idleHint,
}: GameShellProps) {
  const reducedMotion = useReducedMotion();
  const [idleTip, setIdleTip] = useState<string | null>(null);
  const idleTimer = useRef<number | null>(null);
  const lastInteract = useRef(Date.now());
  const themeTint = getThemeTint(getActiveTheme());

  const derivedProgress =
    progress ??
    (round != null && totalRounds != null && totalRounds > 0
      ? Math.min(100, ((round - 1) / totalRounds) * 100)
      : undefined);

  const resolvedFeedbackText =
    feedbackText ??
    (feedback === "correct"
      ? getCorrectEncouragement(round ?? 0)
      : feedback === "wrong"
        ? getWrongEncouragement(round ?? 0)
        : undefined);

  useEffect(() => {
    ensureShellStyles();
  }, []);

  useEffect(() => {
    if (feedback) {
      setIdleTip(null);
      return;
    }
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (Date.now() - lastInteract.current >= GAME_IDLE_HINT_MS) {
        setIdleTip(idleHint ?? getIdleHint(round ?? 0));
      }
    };
    // 2s cadence (was 1s) — enough for hints, half the wakeups.
    idleTimer.current = window.setInterval(tick, 2000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && idleTimer.current) {
        window.clearInterval(idleTimer.current);
        idleTimer.current = null;
      } else if (document.visibilityState === "visible" && !idleTimer.current) {
        idleTimer.current = window.setInterval(tick, 2000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (idleTimer.current) window.clearInterval(idleTimer.current);
    };
  }, [feedback, idleHint, round]);

  return (
    <div
      className={
        reducedMotion
          ? "game-shell-root game-shell-reduced"
          : "game-shell-root game-motion-enter"
      }
      onPointerDown={() => {
        lastInteract.current = Date.now();
        setIdleTip(null);
      }}
      style={{
        textAlign: "center",
        color: gameTheme.text,
        width: "100%",
        maxWidth: "100%",
        borderRadius: 16,
        // Visual theme only — no gameplay advantage.
        background: themeTint ?? undefined,
        boxShadow: themeTint ? `inset 0 0 0 1px ${gameTheme.glassBorder}` : undefined,
        padding: themeTint ? "4px 2px" : undefined,
      }}
    >
      {(subtitle || (round != null && totalRounds != null) || score != null) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            color: gameTheme.textMuted,
            fontSize: "clamp(0.75rem, 3vw, 0.8125rem)",
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <span>
            {subtitle ??
              (round != null && totalRounds != null ? `Round ${round} of ${totalRounds}` : "")}
          </span>
          {score != null && (
            <span
              style={{ fontWeight: 800, color: gameTheme.accentSoft }}
              aria-live="polite"
              aria-atomic="true"
            >
              Score: {score}
            </span>
          )}
        </div>
      )}

      {derivedProgress != null && (
        <div style={{ marginBottom: 12 }}>
          {progressLabel && (
            <div
              id="game-shell-progress-label"
              style={{
                fontSize: "clamp(0.6875rem, 2.8vw, 0.75rem)",
                color: gameTheme.textMuted,
                marginBottom: 4,
                textAlign: "left",
              }}
            >
              {progressLabel}
            </div>
          )}
          <div
            role="progressbar"
            aria-valuenow={Math.round(derivedProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby={progressLabel ? "game-shell-progress-label" : undefined}
            aria-label={
              progressLabel
                ? undefined
                : `Progress ${Math.round(derivedProgress)} percent`
            }
            style={{
              height: Math.max(GAME_LAYOUT.progressHeight, 8),
              borderRadius: 999,
              background: gameTheme.progressTrack,
              overflow: "hidden",
              border: `1px solid ${gameTheme.glassBorder}`,
            }}
          >
            <div
              style={{
                width: `${derivedProgress}%`,
                height: "100%",
                background:
                  feedback === "wrong"
                    ? `repeating-linear-gradient(90deg, hsl(var(--brand-amber-400)), hsl(var(--brand-amber-400)) 8px, hsl(var(--brand-orange-400)) 8px, hsl(var(--brand-orange-400)) 16px)`
                    : `linear-gradient(90deg, hsl(var(--brand-violet-500)), hsl(var(--brand-green-400)))`,
                transition: reducedMotion ? "none" : "width 0.25s ease",
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
            fontSize: "clamp(0.9375rem, 3.8vw, 1.05rem)",
            fontFamily: gameTheme.fontDisplay,
            fontWeight: 800,
            lineHeight: 1.35,
          }}
        >
          {title}
        </h3>
      )}

      {showDifficulty && onDifficultyChange && (
        <div
          role="group"
          aria-label="Difficulty"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
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
                className="game-choice-a11y game-motion-focus"
                onClick={() => onDifficultyChange(level)}
                aria-pressed={active}
                aria-label={`Difficulty ${DIFFICULTY_LABEL[level]}${active ? ", selected" : ""}`}
                style={{
                  padding: "8px 14px",
                  minHeight: GAME_LAYOUT.touchMin,
                  borderRadius: 999,
                  fontSize: "clamp(0.6875rem, 2.8vw, 0.75rem)",
                  fontWeight: 800,
                  cursor: "pointer",
                  border: active
                    ? "2px solid hsl(var(--brand-violet-400))"
                    : `1px solid ${gameTheme.glassBorder}`,
                  background: active ? "rgba(139,92,246,0.28)" : "hsl(var(--muted) / 0.25)",
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
          role="status"
          aria-live="assertive"
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 12,
            fontSize: "clamp(0.8125rem, 3.4vw, 0.9375rem)",
            fontWeight: 800,
            lineHeight: 1.4,
            background: feedback === "correct" ? gameTheme.successBg : gameTheme.warnBg,
            color: feedback === "correct" ? gameTheme.success : gameTheme.warn,
            border:
              feedback === "correct"
                ? "2px solid rgba(34,197,94,0.65)"
                : "2px dashed rgba(251,191,36,0.75)",
          }}
          className={reducedMotion ? undefined : "game-motion-pop"}
        >
          <span className="game-a11y-mark" aria-hidden>
            {feedbackStateMark(feedback).symbol}
          </span>
          <span className="game-sr-only">{feedbackStateMark(feedback).sr}. </span>
          {resolvedFeedbackText}
        </div>
      )}

      {!feedback && idleTip && (
        <div
          role="status"
          aria-live="polite"
          className={reducedMotion ? undefined : "game-motion-pop"}
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 12,
            fontSize: "clamp(0.75rem, 3vw, 0.8125rem)",
            fontWeight: 700,
            lineHeight: 1.4,
            background: "rgba(167,139,250,0.12)",
            color: gameTheme.accentSoft,
            border: `1px solid ${gameTheme.glassBorder}`,
          }}
        >
          <span className="game-sr-only">Hint. </span>
          {idleTip}
        </div>
      )}

      <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>{children}</div>

      {footer && (
        <div
          style={{
            marginTop: 12,
            color: gameTheme.textMuted,
            fontSize: "clamp(10px, 2.8vw, 11px)",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
