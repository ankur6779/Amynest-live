/**
 * Phase 5 — Gaming Hub accessibility helpers (WCAG 2.2 / inclusive play).
 * Accommodations only — no scoring or mechanic changes.
 */

/** Extra time for timed play when the user prefers reduced motion (motor / vestibular). */
export const INCLUSIVE_TIME_SCALE_REDUCED = 1.5;

/** Comfortable choice target for limited motor control (px). */
export const TOUCH_COMFORT = 48;

/** Minimum readable body size (px) under Dynamic Type clamps. */
export const MIN_BODY_PX = 14;

export function getInclusiveTimeScale(reducedMotion: boolean): number {
  return reducedMotion ? INCLUSIVE_TIME_SCALE_REDUCED : 1;
}

export function scaleDurationMs(ms: number, scale: number): number {
  return Math.round(ms * scale);
}

export function scaleSeconds(seconds: number, scale: number): number {
  return Math.max(4, Math.round(seconds * scale));
}

/** Card / tile label for screen readers. */
export function gameTileA11yLabel(opts: {
  title: string;
  skillLine: string;
  blurb: string;
  playable: boolean;
  locked: boolean;
  premiumOnly: boolean;
  limitHit: boolean;
  soon: boolean;
  ageHint?: string;
}): string {
  const parts = [opts.title];
  if (opts.soon) parts.push("Coming soon");
  else if (opts.premiumOnly) parts.push("Premium — upgrade to play");
  else if (opts.locked) parts.push("Locked — unlock to play");
  else if (opts.limitHit) parts.push("Daily play limit reached");
  else if (opts.playable) parts.push("Play");
  parts.push(opts.skillLine);
  if (opts.ageHint) parts.push(opts.ageHint);
  parts.push(opts.blurb);
  return parts.filter(Boolean).join(". ");
}

/** Visible + SR marker so success/fail is never color-only. */
export function feedbackStateMark(feedback: "correct" | "wrong"): {
  symbol: string;
  sr: string;
} {
  if (feedback === "correct") return { symbol: "✓", sr: "Correct" };
  return { symbol: "!", sr: "Not quite — try again" };
}

/** Shared CSS for contrast, transparency, Dynamic Type, focus, SR-only. */
export const GAME_A11Y_STYLES = `
  .game-a11y-root {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  .game-a11y-root,
  .game-a11y-root button,
  .game-a11y-root [role="button"] {
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .game-sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }
  .game-a11y-skip {
    position: absolute;
    left: 8px;
    top: 8px;
    z-index: 80;
    transform: translateY(-160%);
    padding: 10px 14px;
    border-radius: 999px;
    background: hsl(var(--brand-amber-400));
    color: #1a1028;
    font-weight: 800;
    font-size: 14px;
    text-decoration: none;
  }
  .game-a11y-skip:focus {
    transform: translateY(0);
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .game-a11y-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25em;
    font-weight: 900;
    margin-inline-end: 0.35em;
  }
  .game-choice-a11y {
    min-height: ${TOUCH_COMFORT}px;
    min-width: ${TOUCH_COMFORT}px;
  }
  .game-choice-a11y:focus-visible {
    outline: 3px solid rgba(251,191,36,0.95);
    outline-offset: 3px;
  }

  @media (prefers-reduced-transparency: reduce) {
    .game-a11y-solid-surface {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      background: rgba(12, 20, 42, 0.98) !important;
    }
  }

  @media (prefers-contrast: more) {
    .game-a11y-root {
      --game-contrast-border: rgba(255,255,255,0.55);
    }
    .game-a11y-root [class*="border-white"],
    .game-motion-focus:focus-visible,
    .game-choice-a11y:focus-visible {
      outline-width: 3px;
      border-color: rgba(255,255,255,0.7) !important;
    }
    .game-a11y-root .text-muted-foreground {
      color: rgba(235, 230, 255, 0.92) !important;
    }
  }

  @media (orientation: landscape) and (min-width: 768px) {
    .game-a11y-tablet-pad {
      padding-inline: max(24px, env(safe-area-inset-left)) max(24px, env(safe-area-inset-right));
    }
  }
`;
