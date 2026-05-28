/** Self-contained keyframes for the math-animation module (no external CSS dep). */
export const MATH_ANIM_KEYFRAMES = `
  @keyframes mt-pop     { 0% { opacity:0; transform:scale(0.3) } 60% { transform:scale(1.15) } 100% { opacity:1; transform:scale(1) } }
  @keyframes mt-correct { 0% { transform:scale(1) } 25% { transform:scale(1.08) } 70% { transform:scale(1.02) } 100% { transform:scale(1) } }
  /* Phase 7 — delayed, organic count pulse: number lands, then breathes once. */
  @keyframes mt-count-pulse { 0%,55% { transform:scale(1) } 70% { transform:scale(1.1) } 100% { transform:scale(1) } }
`;
