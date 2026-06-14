import type { GameDifficulty } from "@/lib/game-difficulty";

export type MazeDir = "up" | "down" | "left" | "right";

export interface MazeDef {
  size: number;
  right: boolean[][];
  down: boolean[][];
}

export interface MazeAnalysis {
  pathLength: number;
  deadEnds: number;
  branches: number;
  complexityScore: number;
  solutionPath: [number, number][];
}

type MazeAlgorithm = "backtracking" | "prim" | "wilson";

const MAX_GENERATION_ATTEMPTS = 48;

function blankWalls(size: number): Pick<MazeDef, "right" | "down"> {
  return {
    right: Array.from({ length: size }, () => Array(size - 1).fill(true)),
    down: Array.from({ length: size - 1 }, () => Array(size).fill(true)),
  };
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function removeWallBetween(
  walls: Pick<MazeDef, "right" | "down">,
  r: number,
  c: number,
  dir: MazeDir,
): void {
  if (dir === "right") walls.right[r][c] = false;
  if (dir === "left") walls.right[r][c - 1] = false;
  if (dir === "down") walls.down[r][c] = false;
  if (dir === "up") walls.down[r - 1][c] = false;
}

function generateRecursiveBacktracking(size: number): MazeDef {
  const walls = blankWalls(size);
  const visited = Array.from({ length: size }, () => Array(size).fill(false));

  function carve(r: number, c: number): void {
    visited[r][c] = true;
    for (const dir of shuffle(["up", "down", "left", "right"] as MazeDir[])) {
      const nr = dir === "up" ? r - 1 : dir === "down" ? r + 1 : r;
      const nc = dir === "left" ? c - 1 : dir === "right" ? c + 1 : c;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size || visited[nr][nc]) continue;
      removeWallBetween(walls, r, c, dir);
      carve(nr, nc);
    }
  }

  carve(0, 0);
  return { size, ...walls };
}

function generatePrims(size: number): MazeDef {
  const walls = blankWalls(size);
  const inMaze = Array.from({ length: size }, () => Array(size).fill(false));
  type FrontierWall = { r: number; c: number; dir: MazeDir; nr: number; nc: number };
  const frontier: FrontierWall[] = [];

  function addFrontier(r: number, c: number): void {
    for (const dir of ["up", "down", "left", "right"] as MazeDir[]) {
      const nr = dir === "up" ? r - 1 : dir === "down" ? r + 1 : r;
      const nc = dir === "left" ? c - 1 : dir === "right" ? c + 1 : c;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size || inMaze[nr][nc]) continue;
      frontier.push({ r, c, dir, nr, nc });
    }
  }

  const startR = Math.floor(Math.random() * size);
  const startC = Math.floor(Math.random() * size);
  inMaze[startR][startC] = true;
  addFrontier(startR, startC);

  while (frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length);
    const wall = frontier.splice(idx, 1)[0];
    if (inMaze[wall.nr][wall.nc]) continue;
    removeWallBetween(walls, wall.r, wall.c, wall.dir);
    inMaze[wall.nr][wall.nc] = true;
    addFrontier(wall.nr, wall.nc);
  }

  return { size, ...walls };
}

function randomWalk(
  fromR: number,
  fromC: number,
  size: number,
  maxSteps: number,
): [number, number][] | null {
  const path: [number, number][] = [[fromR, fromC]];
  const seen = new Map<string, number>();
  seen.set(`${fromR},${fromC}`, 0);
  let r = fromR;
  let c = fromC;
  let steps = 0;
  while (!inMazeGlobal(r, c, size)) {
    if (++steps > maxSteps) return null;
    const dir = (["up", "down", "left", "right"] as MazeDir[])[Math.floor(Math.random() * 4)];
    const nr = dir === "up" ? r - 1 : dir === "down" ? r + 1 : r;
    const nc = dir === "left" ? c - 1 : dir === "right" ? c + 1 : c;
    if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
    r = nr;
    c = nc;
    const key = `${r},${c}`;
    if (seen.has(key)) {
      path.splice(seen.get(key)! + 1);
    } else {
      path.push([r, c]);
      seen.set(key, path.length - 1);
    }
  }
  return path;
}

let wilsonInMaze: boolean[][] = [];

function inMazeGlobal(r: number, c: number, size: number): boolean {
  return wilsonInMaze[r]?.[c] ?? false;
}

function generateWilson(size: number): MazeDef {
  const walls = blankWalls(size);
  wilsonInMaze = Array.from({ length: size }, () => Array(size).fill(false));
  wilsonInMaze[0][0] = true;

  let unvisited = size * size - 1;
  const maxWalkSteps = size * size * size * 4;

  while (unvisited > 0) {
    let sr = 0;
    let sc = 0;
    outer: for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!wilsonInMaze[r][c]) {
          sr = r;
          sc = c;
          break outer;
        }
      }
    }

    const walk = randomWalk(sr, sc, size, maxWalkSteps);
    if (!walk || walk.length < 2) {
      return generateRecursiveBacktracking(size);
    }

    for (let i = 0; i < walk.length - 1; i++) {
      const [r, c] = walk[i];
      const [nr, nc] = walk[i + 1];
      const dir: MazeDir =
        nr === r - 1 ? "up" : nr === r + 1 ? "down" : nc === c - 1 ? "left" : "right";
      removeWallBetween(walls, r, c, dir);
      if (!wilsonInMaze[nr][nc]) {
        wilsonInMaze[nr][nc] = true;
        unvisited--;
      }
    }
  }

  return { size, ...walls };
}

function pickAlgorithm(size: number): MazeAlgorithm {
  const roll = Math.random();
  if (size >= 9) {
    return roll < 0.6 ? "backtracking" : "prim";
  }
  if (roll < 0.5) return "backtracking";
  if (roll < 0.8) return "prim";
  return "wilson";
}

function generateWithAlgorithm(size: number, algorithm: MazeAlgorithm): MazeDef {
  if (algorithm === "prim") return generatePrims(size);
  if (algorithm === "wilson") return generateWilson(size);
  return generateRecursiveBacktracking(size);
}

export function canMoveMaze(maze: MazeDef, r: number, c: number, dir: MazeDir): boolean {
  const last = maze.size - 1;
  if (dir === "up") return r > 0 && !maze.down[r - 1]?.[c];
  if (dir === "down") return r < last && !maze.down[r]?.[c];
  if (dir === "left") return c > 0 && !maze.right[r]?.[c - 1];
  if (dir === "right") return c < last && !maze.right[r]?.[c];
  return false;
}

export function countOpenNeighbors(maze: MazeDef, r: number, c: number): number {
  let count = 0;
  for (const dir of ["up", "down", "left", "right"] as MazeDir[]) {
    if (canMoveMaze(maze, r, c, dir)) count++;
  }
  return count;
}

export function solveMaze(maze: MazeDef): MazeAnalysis {
  const last = maze.size - 1;
  const q: [number, number][] = [[0, 0]];
  const prev = new Map<string, string | null>([["0,0", null]]);
  while (q.length) {
    const [r, c] = q.shift()!;
    if (r === last && c === last) break;
    for (const dir of ["up", "down", "left", "right"] as MazeDir[]) {
      if (!canMoveMaze(maze, r, c, dir)) continue;
      const nr = dir === "up" ? r - 1 : dir === "down" ? r + 1 : r;
      const nc = dir === "left" ? c - 1 : dir === "right" ? c + 1 : c;
      const key = `${nr},${nc}`;
      if (prev.has(key)) continue;
      prev.set(key, `${r},${c}`);
      q.push([nr, nc]);
    }
  }

  const solutionPath: [number, number][] = [];
  let cursor: string | null = `${last},${last}`;
  while (cursor) {
    const [r, c] = cursor.split(",").map(Number) as [number, number];
    solutionPath.unshift([r, c]);
    cursor = prev.get(cursor) ?? null;
  }

  const pathLength = Math.max(0, solutionPath.length - 1);
  let deadEnds = 0;
  let branches = 0;
  for (let r = 0; r < maze.size; r++) {
    for (let c = 0; c < maze.size; c++) {
      const open = countOpenNeighbors(maze, r, c);
      if (open === 1) deadEnds++;
      if (open >= 3) branches++;
    }
  }

  const complexityScore = pathLength + deadEnds * 2 + branches * 3;
  return { pathLength, deadEnds, branches, complexityScore, solutionPath };
}

export function isMazeSolvable(maze: MazeDef): boolean {
  return solveMaze(maze).pathLength > 0;
}

interface QualityThresholds {
  minPathLength: number;
  minDeadEnds: number;
  minBranches: number;
  minComplexity: number;
}

export function getQualityThresholds(size: number, difficulty: GameDifficulty): QualityThresholds {
  switch (difficulty) {
    case "easy":
      return {
        minPathLength: Math.max(4, Math.floor(size * 1.0)),
        minDeadEnds: Math.max(2, Math.floor(size * 0.35)),
        minBranches: 1,
        minComplexity: size * 2 + 2,
      };
    case "hard":
      return {
        minPathLength: Math.max(10, Math.floor(size * 1.55)),
        minDeadEnds: Math.max(6, Math.floor(size * 0.75)),
        minBranches: 3,
        minComplexity: size * 4 + 6,
      };
    default:
      return {
        minPathLength: Math.max(6, Math.floor(size * 1.25)),
        minDeadEnds: Math.max(3, Math.floor(size * 0.5)),
        minBranches: 2,
        minComplexity: size * 3 + 3,
      };
  }
}

export function passesQualityGate(
  analysis: MazeAnalysis,
  size: number,
  difficulty: GameDifficulty,
): boolean {
  const t = getQualityThresholds(size, difficulty);
  return (
    analysis.pathLength >= t.minPathLength &&
    analysis.deadEnds >= t.minDeadEnds &&
    analysis.branches >= t.minBranches &&
    analysis.complexityScore >= t.minComplexity
  );
}

export interface GeneratedMaze {
  maze: MazeDef;
  analysis: MazeAnalysis;
}

export function generateValidatedMaze(
  size: number,
  difficulty: GameDifficulty,
  maxAttempts = MAX_GENERATION_ATTEMPTS,
): GeneratedMaze {
  let best: GeneratedMaze | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const maze = generateWithAlgorithm(size, pickAlgorithm(size));
    const analysis = solveMaze(maze);
    if (analysis.pathLength <= 0) continue;
    if (passesQualityGate(analysis, size, difficulty)) {
      return { maze, analysis };
    }
    if (!best || analysis.complexityScore > best.analysis.complexityScore) {
      best = { maze, analysis };
    }
  }
  if (best) return best;
  const fallback = generateRecursiveBacktracking(size);
  return { maze: fallback, analysis: solveMaze(fallback) };
}

/** @deprecated Use generateValidatedMaze — kept for any legacy callers. */
export function getSolvableMazes(size: number): MazeDef[] {
  return [generateValidatedMaze(size, "normal").maze];
}

export function recommendedMoveBudget(analysis: MazeAnalysis, size: number, roundIndex: number): number {
  const explorationRoom = Math.floor(size * size * 0.45) + roundIndex * 2;
  return Math.max(analysis.pathLength * 2 + explorationRoom, size * 3);
}
