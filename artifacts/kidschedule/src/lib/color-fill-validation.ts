export const COLOR_FILL_GRID_SIZE = 4;

export const COLOR_FILL_PALETTE = [
  { id: 0, color: "hsl(var(--brand-red-500))", label: "Red", shape: "●", hc: "#ef4444" },
  { id: 1, color: "hsl(var(--brand-blue-500))", label: "Blue", shape: "■", hc: "#3b82f6" },
  { id: 2, color: "hsl(var(--brand-green-500))", label: "Green", shape: "▲", hc: "#22c55e" },
  { id: 3, color: "hsl(var(--brand-amber-500))", label: "Yellow", shape: "◆", hc: "#eab308" },
  { id: 4, color: "hsl(var(--brand-purple-500))", label: "Purple", shape: "★", hc: "#a855f7" },
  { id: 5, color: "hsl(var(--brand-orange-500))", label: "Orange", shape: "⬡", hc: "#f97316" },
] as const;

export const COLOR_FILL_PICTURES = [
  {
    label: "Rainbow Stripe",
    grid: [
      [0, 0, 0, 0],
      [3, 3, 3, 3],
      [1, 1, 1, 1],
      [2, 2, 2, 2],
    ],
    usedColors: [0, 3, 1, 2],
  },
  {
    label: "Checkerboard",
    grid: [
      [0, 2, 0, 2],
      [2, 0, 2, 0],
      [0, 2, 0, 2],
      [2, 0, 2, 0],
    ],
    usedColors: [0, 2],
  },
  {
    label: "Sunset",
    grid: [
      [5, 5, 5, 5],
      [0, 0, 0, 0],
      [3, 3, 3, 3],
      [1, 1, 1, 1],
    ],
    usedColors: [5, 0, 3, 1],
  },
  {
    label: "Diamond",
    grid: [
      [1, 4, 4, 1],
      [4, 0, 0, 4],
      [4, 0, 0, 4],
      [1, 4, 4, 1],
    ],
    usedColors: [1, 4, 0],
  },
  {
    label: "Cross",
    grid: [
      [2, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 2],
    ],
    usedColors: [2, 0],
  },
] as const;

export type ColorFillPicture = (typeof COLOR_FILL_PICTURES)[number];

export interface ColorFillEvaluation {
  allCorrect: boolean;
  wrongCells: Set<string>;
  wrongCount: number;
  correctCount: number;
  percent: number;
  allFilled: boolean;
}

export function isColorFillBoardFull(filled: Map<string, number>): boolean {
  for (let r = 0; r < COLOR_FILL_GRID_SIZE; r++) {
    for (let c = 0; c < COLOR_FILL_GRID_SIZE; c++) {
      if (!filled.has(`${r}-${c}`)) return false;
    }
  }
  return true;
}

export function evaluateColorFillGrid(
  grid: ReadonlyArray<ReadonlyArray<number>>,
  filled: Map<string, number>,
): ColorFillEvaluation {
  const wrongCells = new Set<string>();
  let wrongCount = 0;
  let correctCount = 0;
  const total = COLOR_FILL_GRID_SIZE * COLOR_FILL_GRID_SIZE;
  for (let r = 0; r < COLOR_FILL_GRID_SIZE; r++) {
    for (let c = 0; c < COLOR_FILL_GRID_SIZE; c++) {
      const target = grid[r][c];
      const actual = filled.get(`${r}-${c}`);
      if (actual === target) correctCount++;
      else {
        wrongCount++;
        wrongCells.add(`${r}-${c}`);
      }
    }
  }
  return {
    allCorrect: wrongCount === 0,
    wrongCells,
    wrongCount,
    correctCount,
    percent: Math.round((correctCount / total) * 100),
    allFilled: isColorFillBoardFull(filled),
  };
}

export function buildCorrectFill(grid: ReadonlyArray<ReadonlyArray<number>>): Map<string, number> {
  const filled = new Map<string, number>();
  for (let r = 0; r < COLOR_FILL_GRID_SIZE; r++) {
    for (let c = 0; c < COLOR_FILL_GRID_SIZE; c++) {
      filled.set(`${r}-${c}`, grid[r][c]);
    }
  }
  return filled;
}

export function buildWrongFill(grid: ReadonlyArray<ReadonlyArray<number>>): Map<string, number> {
  const filled = buildCorrectFill(grid);
  filled.set("0-0", (grid[0][0] + 1) % 6);
  return filled;
}

export function pickRandomPicture(seed: number): ColorFillPicture {
  return COLOR_FILL_PICTURES[seed % COLOR_FILL_PICTURES.length];
}
