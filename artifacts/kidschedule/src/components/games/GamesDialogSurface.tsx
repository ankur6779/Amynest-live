import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { gameTheme } from "@/lib/game-theme";
import { GAME_LAYOUT } from "@/lib/game-layout-tokens";
import { GAME_MOTION } from "@/lib/game-motion";
import { useA11yPrefs } from "@/hooks/use-a11y-prefs";
import { useLowPowerClient } from "@/hooks/use-low-power-client";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface GamesDialogSurfaceProps {
  title?: string;
  subtitle?: string;
  leading?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  /** When true, backdrop click does not close (e.g. confirm dialogs). */
  preventBackdropClose?: boolean;
  className?: string;
  panelStyle?: CSSProperties;
  ariaLabel: string;
}

/**
 * Accessible dialog family — focus trap, Escape, labelled title, solid surface under reduced transparency.
 */
export function GamesDialogSurface({
  title,
  subtitle,
  leading,
  children,
  onClose,
  preventBackdropClose = false,
  className,
  panelStyle,
  ariaLabel,
}: GamesDialogSurfaceProps) {
  const { t } = useTranslation();
  const { reducedMotion, reducedTransparency } = useA11yPrefs();
  const lowPower = useLowPowerClient();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const useBlur = !reducedTransparency && !lowPower;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusClose = () => closeRef.current?.focus();
    // Prefer close control for predictable VoiceOver entry; fallback to panel.
    requestAnimationFrame(() => {
      if (closeRef.current) focusClose();
      else panel.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      className={cn("game-motion-fade", className)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: useBlur ? gameTheme.overlay : "rgba(7,17,38,0.97)",
        // 6px blur (was 10) — major GPU win on mid-range Android; skipped on low-power.
        backdropFilter: useBlur ? "blur(6px)" : "none",
        WebkitBackdropFilter: useBlur ? "blur(6px)" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `max(${GAME_LAYOUT.overlayPadding}px, env(safe-area-inset-top)) max(${GAME_LAYOUT.overlayPadding}px, env(safe-area-inset-right)) max(${GAME_LAYOUT.overlayPadding}px, env(safe-area-inset-bottom)) max(${GAME_LAYOUT.overlayPadding}px, env(safe-area-inset-left))`,
        animationDuration: reducedMotion ? undefined : `${GAME_MOTION.overlayMs}ms`,
      }}
      onClick={preventBackdropClose ? undefined : onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "game-motion-dialog game-motion-focus game-a11y-solid-surface",
        )}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: GAME_LAYOUT.modalMaxWidth,
          background: gameTheme.modalBg,
          borderRadius: gameTheme.radiusDialog,
          padding: `${GAME_LAYOUT.modalPaddingY}px ${GAME_LAYOUT.modalPaddingX}px 22px`,
          color: gameTheme.text,
          boxShadow: gameTheme.dialogShadow,
          border: `1px solid ${gameTheme.glassBorder}`,
          maxHeight: "min(92vh, 100dvh)",
          overflowY: "auto",
          ...panelStyle,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: title || leading ? 12 : 4,
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {leading}
            {(title || subtitle) && (
              <div style={{ minWidth: 0 }}>
                {title && (
                  <h2
                    id={titleId}
                    style={{
                      margin: 0,
                      fontSize: "clamp(1rem, 4vw, 1.125rem)",
                      fontWeight: 800,
                      fontFamily: gameTheme.fontDisplay,
                      lineHeight: 1.3,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: "clamp(0.75rem, 2.8vw, 0.8125rem)",
                      lineHeight: 1.45,
                      color: gameTheme.textSoft,
                    }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("screens.games.close")}
            className="game-motion-press game-motion-focus"
            style={{
              color: gameTheme.textSoft,
              background: "rgba(122,92,255,0.15)",
              borderRadius: 999,
              width: GAME_LAYOUT.closeButton,
              height: GAME_LAYOUT.closeButton,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(122,92,255,0.25)",
              cursor: "pointer",
              flexShrink: 0,
              marginLeft: "auto",
            }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
