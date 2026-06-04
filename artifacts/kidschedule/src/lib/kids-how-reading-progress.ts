const STORAGE_KEY = "amynest:kids-how:reading:v1";

type ReadingProgressMap = Record<string, { page: number; updatedAt: number }>;

function readMap(): ReadingProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ReadingProgressMap;
  } catch {
    return {};
  }
}

function writeMap(map: ReadingProgressMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function getKidsHowLastPage(bookId: string): number {
  const entry = readMap()[bookId];
  return entry?.page && entry.page > 0 ? entry.page : 1;
}

export function saveKidsHowLastPage(bookId: string, page: number): void {
  const map = readMap();
  map[bookId] = { page: Math.max(1, Math.floor(page)), updatedAt: Date.now() };
  writeMap(map);
}
