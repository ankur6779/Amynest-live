export type MazeDir = "up" | "down" | "left" | "right";

export interface MazeDef {
  size: number;
  right: boolean[][];
  down: boolean[][];
}

function blankWalls(size: number): Pick<MazeDef, "right" | "down"> {
  return {
    right: Array.from({ length: size }, () => Array(size - 1).fill(true)),
    down: Array.from({ length: size - 1 }, () => Array(size).fill(true)),
  };
}

/** Edge corridor: top row right, then down the last column. */
function edgeCorridor(size: number): MazeDef {
  const last = size - 1;
  const walls = blankWalls(size);
  for (let c = 0; c < last; c++) walls.right[0][c] = false;
  for (let r = 0; r < last; r++) walls.down[r][last] = false;
  return { size, ...walls };
}

/** S-path across the grid. */
function snakePath(size: number): MazeDef {
  const last = size - 1;
  const pivot = last - 2;
  const walls = blankWalls(size);
  for (let c = 0; c < last; c++) walls.right[0][c] = false;
  for (let r = 0; r < pivot; r++) walls.down[r][last] = false;
  for (let c = 0; c < last; c++) walls.right[pivot][c] = false;
  walls.down[pivot][0] = false;
  for (let r = pivot + 1; r < last; r++) walls.down[r][0] = false;
  for (let c = 0; c < last; c++) walls.right[last][c] = false;
  return { size, ...walls };
}

/** L-path: down the first column, across, then down to exit. */
function lPath(size: number): MazeDef {
  const last = size - 1;
  const pivot = last - 2;
  const walls = blankWalls(size);
  for (let r = 0; r < pivot; r++) walls.down[r][0] = false;
  for (let c = 0; c < last; c++) walls.right[pivot][c] = false;
  walls.down[pivot][last] = false;
  for (let r = pivot + 1; r < last; r++) walls.down[r][last] = false;
  return { size, ...walls };
}

export function buildMazeTemplates(size: number): MazeDef[] {
  return [edgeCorridor(size), snakePath(size), lPath(size)];
}

export function canMoveMaze(maze: MazeDef, r: number, c: number, dir: MazeDir): boolean {
  const last = maze.size - 1;
  if (dir === "up") return r > 0 && !maze.down[r - 1]?.[c];
  if (dir === "down") return r < last && !maze.down[r]?.[c];
  if (dir === "left") return c > 0 && !maze.right[r]?.[c - 1];
  if (dir === "right") return c < last && !maze.right[r]?.[c];
  return false;
}

export function isMazeSolvable(maze: MazeDef): boolean {
  const last = maze.size - 1;
  const q: [number, number][] = [[0, 0]];
  const seen = new Set(["0,0"]);
  while (q.length) {
    const [r, c] = q.shift()!;
    if (r === last && c === last) return true;
    for (const dir of ["up", "down", "left", "right"] as MazeDir[]) {
      if (!canMoveMaze(maze, r, c, dir)) continue;
      const nr = dir === "up" ? r - 1 : dir === "down" ? r + 1 : r;
      const nc = dir === "left" ? c - 1 : dir === "right" ? c + 1 : c;
      const key = `${nr},${nc}`;
      if (!seen.has(key)) {
        seen.add(key);
        q.push([nr, nc]);
      }
    }
  }
  return false;
}

export function getSolvableMazes(size: number): MazeDef[] {
  return buildMazeTemplates(size).filter(isMazeSolvable);
}
