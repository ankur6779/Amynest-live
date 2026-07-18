/**
 * Phase 4 — unified Gaming Hub motion language.
 * Apple-light durations + Material ease curves. No random timings.
 */

export const GAME_MOTION = {
  /** Instant press feedback */
  pressMs: 100,
  /** Micro fades / chip pops */
  microMs: 180,
  /** Cards, sections, dialogs enter */
  enterMs: 280,
  /** Overlay fade */
  overlayMs: 200,
  /** Result / celebration pop */
  celebrateMs: 360,
  /** Gentle float (emoji shells) */
  floatMs: 1600,
  /** Shimmer cycle */
  shimmerMs: 1400,
  /** Shared easing — ease-out for enter, soft for loops */
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeInOut: "cubic-bezier(0.45, 0, 0.55, 1)",
  /** Press scale */
  pressScale: 0.97,
  /** Enter translate */
  enterY: 8,
  /** Dialog enter scale */
  dialogFromScale: 0.98,
} as const;

/** CSS custom properties for hub-wide motion (injected once). */
export function gameMotionCssVars(): string {
  const m = GAME_MOTION;
  return `
    --game-motion-press: ${m.pressMs}ms;
    --game-motion-micro: ${m.microMs}ms;
    --game-motion-enter: ${m.enterMs}ms;
    --game-motion-overlay: ${m.overlayMs}ms;
    --game-motion-celebrate: ${m.celebrateMs}ms;
    --game-motion-float: ${m.floatMs}ms;
    --game-motion-shimmer: ${m.shimmerMs}ms;
    --game-ease-out: ${m.easeOut};
    --game-ease-in-out: ${m.easeInOut};
    --game-press-scale: ${m.pressScale};
  `;
}

/** Shared keyframes + utility classes for the Gaming Hub. */
export const GAME_MOTION_STYLES = `
  :root {
    ${gameMotionCssVars()}
  }

  @keyframes gameMotionFadeUp {
    from { opacity: 0; transform: translateY(${GAME_MOTION.enterY}px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes gameMotionFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes gameMotionPop {
    0% { opacity: 0.5; transform: scale(0.94); }
    70% { transform: scale(1.03); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes gameMotionDialogIn {
    from { opacity: 0; transform: translateY(12px) scale(${GAME_MOTION.dialogFromScale}); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes gameMotionFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  @keyframes gameMotionShimmer {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }
  @keyframes gameMotionPulseSoft {
    0%, 100% { opacity: 0.55; }
    50% { opacity: 1; }
  }

  .game-motion-enter {
    animation: gameMotionFadeUp var(--game-motion-enter) var(--game-ease-out) both;
  }
  .game-motion-fade {
    animation: gameMotionFadeIn var(--game-motion-overlay) var(--game-ease-out) both;
  }
  .game-motion-pop {
    animation: gameMotionPop var(--game-motion-celebrate) var(--game-ease-out) both;
  }
  .game-motion-dialog {
    animation: gameMotionDialogIn var(--game-motion-enter) var(--game-ease-out) both;
  }
  .game-motion-float {
    animation: gameMotionFloat var(--game-motion-float) var(--game-ease-in-out) infinite;
  }
  .game-motion-press {
    transition: transform var(--game-motion-press) var(--game-ease-out);
    touch-action: manipulation;
  }
  .game-motion-press:active:not(:disabled) {
    transform: scale(var(--game-press-scale));
  }
  .game-motion-focus:focus-visible {
    outline: 2px solid rgba(251,191,36,0.85);
    outline-offset: 3px;
  }
  .game-shimmer {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.04) 0%,
      rgba(255,255,255,0.12) 45%,
      rgba(255,255,255,0.04) 100%
    );
    background-size: 200% 100%;
    animation: gameMotionShimmer var(--game-motion-shimmer) linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .game-motion-enter,
    .game-motion-fade,
    .game-motion-pop,
    .game-motion-dialog,
    .game-motion-float,
    .game-shimmer {
      animation: none !important;
    }
    .game-motion-press,
    .game-motion-press:active:not(:disabled) {
      transition: none !important;
      transform: none !important;
    }
  }
`;
