import { HUB_CONTENT_QUOTAS } from "@workspace/parent-hub-journey";

export const KIDS_HOW_HUB_FEATURE = "hub_answer_to_kids_how";
export const KIDS_HOW_LIFETIME_FREE_PDFS = HUB_CONTENT_QUOTAS.kidsHowLifetimePdfs;

const LEGACY_STORAGE_KEY = "kids_how_opened_books";

function storageKey(userId: string): string {
  return `kids_how_opened_${userId}`;
}

export function getKidsHowOpenedBookIds(userId: string | null): Set<string> {
  if (!userId) return new Set();
  try {
    const raw =
      localStorage.getItem(storageKey(userId)) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

export function markKidsHowBookOpened(bookId: string, userId: string): void {
  const ids = getKidsHowOpenedBookIds(userId);
  if (ids.has(bookId)) return;
  ids.add(bookId);
  localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
}

export function canOpenKidsHowBook(
  bookId: string,
  userId: string | null,
  isPremium: boolean,
): boolean {
  if (isPremium) return true;
  const opened = getKidsHowOpenedBookIds(userId);
  if (opened.has(bookId)) return true;
  return opened.size < KIDS_HOW_LIFETIME_FREE_PDFS;
}

export function kidsHowFreeBooksRemaining(
  userId: string | null,
  isPremium: boolean,
): number {
  if (isPremium) return KIDS_HOW_LIFETIME_FREE_PDFS;
  const opened = getKidsHowOpenedBookIds(userId);
  return Math.max(0, KIDS_HOW_LIFETIME_FREE_PDFS - opened.size);
}
