import { queueClientLog } from "@/lib/client-logs";
import type { KidsHowCategory } from "@/lib/kids-how-books";

export type KidsHowAnalyticsEvent =
  | "kids_how_library_view"
  | "kids_how_book_opened"
  | "kids_how_reading_session"
  | "kids_how_category_filter";

const sessionStarts = new Map<string, number>();

export function trackKidsHowEvent(
  event: KidsHowAnalyticsEvent,
  meta?: Record<string, string | number | boolean | null>,
): void {
  queueClientLog({
    type: "info",
    message: `kids_how:${event}`,
    context: "parent_hub",
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    meta: { event, ...meta },
  });
}

export function trackKidsHowBookOpened(bookId: string, category: KidsHowCategory): void {
  sessionStarts.set(bookId, Date.now());
  trackKidsHowEvent("kids_how_book_opened", { bookId, category });
}

export function trackKidsHowReadingEnded(
  bookId: string,
  category: KidsHowCategory,
  lastPage: number,
): void {
  const started = sessionStarts.get(bookId);
  const durationMs = started ? Date.now() - started : 0;
  sessionStarts.delete(bookId);
  trackKidsHowEvent("kids_how_reading_session", {
    bookId,
    category,
    lastPage,
    durationMs,
  });
}

export function trackKidsHowCategorySelected(category: string): void {
  trackKidsHowEvent("kids_how_category_filter", { category });
}
