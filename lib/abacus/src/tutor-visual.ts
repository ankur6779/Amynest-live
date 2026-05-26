import { abacusFromValue, emptyAbacus, getLevel, type AbacusState, type LevelId } from "./index.js";

export interface TutorVisualHint {
  state: AbacusState;
  highlightRod?: number;
  caption: string;
}

/** Infer a mini abacus diagram from Amy's tutor reply text. */
export function inferTutorAbacusVisual(
  text: string,
  level: LevelId,
): TutorVisualHint | null {
  const def = getLevel(level);
  const rods = Math.min(5, Math.max(1, def.rods));

  const lowerMatch = text.match(/push\s+(\d)\s+lower\s+bead/i);
  if (lowerMatch) {
    const n = Math.min(4, Math.max(0, Number(lowerMatch[1])));
    const state = emptyAbacus(1);
    state[0].lower = n as 0 | 1 | 2 | 3 | 4;
    return {
      state,
      highlightRod: 0,
      caption: `Show ${n} lower bead${n === 1 ? "" : "s"}`,
    };
  }

  const upperMatch = text.match(/push\s+(?:the\s+)?(?:1\s+)?upper\s+bead\s+down|top\s+bead\s+down/i);
  if (upperMatch) {
    const state = abacusFromValue(5, 1);
    return { state, highlightRod: 0, caption: "Upper bead = 5" };
  }

  const equalsMatch = text.match(/(?:=|is|makes)\s+(\d{1,3})\b/i);
  if (equalsMatch) {
    const value = Number(equalsMatch[1]);
    if (Number.isFinite(value) && value >= 0 && value <= Math.pow(10, rods) - 1) {
      try {
        return {
          state: abacusFromValue(value, rods),
          highlightRod: rods - 1,
          caption: `Answer: ${value}`,
        };
      } catch {
        /* fall through */
      }
    }
  }

  const numbers = [...text.matchAll(/\b(\d{1,3})\b/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 0 && n <= Math.pow(10, rods) - 1);

  if (numbers.length > 0) {
    const value = numbers[numbers.length - 1];
    try {
      return {
        state: abacusFromValue(value, rods),
        highlightRod: rods - 1,
        caption: `Picture ${value}`,
      };
    } catch {
      return null;
    }
  }

  return null;
}
