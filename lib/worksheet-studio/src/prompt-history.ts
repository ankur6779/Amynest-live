import type { PromptHistoryEntry, WorksheetClass, WorksheetDifficulty, WorksheetSubject } from "./types.js";

const STORAGE_KEY = "worksheet-studio-prompt-history-v1";
const MAX_ENTRIES = 50;

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

function loadAll(): PromptHistoryEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PromptHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(entries: PromptHistoryEntry[]): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* quota */ }
}

export function listPromptHistory(): PromptHistoryEntry[] {
  return loadAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function searchPromptHistory(query: string): PromptHistoryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return listPromptHistory();
  return listPromptHistory().filter(
    (e) =>
      e.prompt.toLowerCase().includes(q) ||
      (e.enhancedPrompt?.toLowerCase().includes(q) ?? false),
  );
}

export function savePromptHistory(entry: Omit<PromptHistoryEntry, "id" | "createdAt" | "favorite"> & { favorite?: boolean }): PromptHistoryEntry {
  const full: PromptHistoryEntry = {
    ...entry,
    id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    favorite: entry.favorite ?? false,
  };
  const all = loadAll();
  const dupIdx = all.findIndex(
    (e) => e.prompt === full.prompt && e.classLevel === full.classLevel && e.subject === full.subject,
  );
  if (dupIdx >= 0) all.splice(dupIdx, 1);
  saveAll([full, ...all]);
  return full;
}

export function duplicatePromptHistory(id: string): PromptHistoryEntry | null {
  const src = loadAll().find((e) => e.id === id);
  if (!src) return null;
  return savePromptHistory({
    prompt: src.prompt,
    enhancedPrompt: src.enhancedPrompt,
    classLevel: src.classLevel,
    subject: src.subject,
    difficulty: src.difficulty,
    pageCount: src.pageCount,
    referenceCount: src.referenceCount,
  });
}

export function togglePromptFavorite(id: string): PromptHistoryEntry | null {
  const all = loadAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx]!, favorite: !all[idx]!.favorite };
  saveAll(all);
  return all[idx]!;
}

export function deletePromptHistory(id: string): void {
  saveAll(loadAll().filter((e) => e.id !== id));
}

export function groupPromptHistory(entries: PromptHistoryEntry[]): {
  favorites: PromptHistoryEntry[];
  recent: PromptHistoryEntry[];
  bySubject: Record<string, PromptHistoryEntry[]>;
  byClass: Record<string, PromptHistoryEntry[]>;
} {
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const favorites = sorted.filter((e) => e.favorite);
  const recent = sorted.slice(0, 10);
  const bySubject: Record<string, PromptHistoryEntry[]> = {};
  const byClass: Record<string, PromptHistoryEntry[]> = {};
  for (const e of sorted) {
    (bySubject[e.subject] ??= []).push(e);
    (byClass[e.classLevel] ??= []).push(e);
  }
  return { favorites, recent, bySubject, byClass };
}

export function incrementPromptUsage(id: string): void {
  const all = loadAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return;
  const entry = all[idx]!;
  all.splice(idx, 1);
  saveAll([{ ...entry, createdAt: new Date().toISOString() }, ...all]);
}

export function restorePromptFromHistory(id: string): {
  prompt: string;
  enhancedPrompt?: string;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  difficulty: WorksheetDifficulty;
  pageCount: number;
} | null {
  const e = loadAll().find((x) => x.id === id);
  if (!e) return null;
  return {
    prompt: e.prompt,
    enhancedPrompt: e.enhancedPrompt,
    classLevel: e.classLevel,
    subject: e.subject,
    difficulty: e.difficulty,
    pageCount: e.pageCount,
  };
}
