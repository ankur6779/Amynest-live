import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { useAppNavigate } from "@/components/app-link";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { LockedBlock } from "@/components/locked-block";
import { KidsHowBookCard } from "@/components/kids-how/kids-how-book-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  filterKidsHowBooks,
  KIDS_HOW_BOOKS,
  KIDS_HOW_CATEGORIES,
  type KidsHowCategory,
} from "@/lib/kids-how-books";
import {
  trackKidsHowCategorySelected,
  trackKidsHowEvent,
} from "@/lib/kids-how-analytics";
import {
  canOpenKidsHowBook,
  KIDS_HOW_HUB_FEATURE,
  kidsHowFreeBooksRemaining,
} from "@/lib/kids-how-pdf-access";
import { HUB_QUICK_CHIP, hubQuickChipTint, PARENT_HUB_PAGE } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

export default function AnswerToKidsHowPage() {
  const { t } = useTranslation();
  const { back } = useAppNavigate();
  const { userId } = useAuth();
  const { isPremium } = useSubscription();
  const hubGate = useHubModuleGate(KIDS_HOW_HUB_FEATURE);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<KidsHowCategory | "all">("all");

  usePageBackHandler(() => {
    back("answer-to-kids-how-back");
    return true;
  }, [back]);

  useEffect(() => {
    trackKidsHowEvent("kids_how_library_view", { bookCount: KIDS_HOW_BOOKS.length });
  }, []);

  const filtered = useMemo(
    () => filterKidsHowBooks(KIDS_HOW_BOOKS, query, category),
    [query, category],
  );

  const freeBooksLeft = kidsHowFreeBooksRemaining(userId, isPremium);

  const selectCategory = (next: KidsHowCategory | "all") => {
    setCategory(next);
    trackKidsHowCategorySelected(next);
  };

  const pageBody = (
    <>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur md:px-6">
        <button
          type="button"
          onClick={() => back("answer-to-kids-how-back")}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("parent_hub.section_groups.creativity")}
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_20px_rgba(251,191,36,0.35)]">
            <BookOpen className="h-6 w-6 text-white" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400/90">
              {t("parent_hub.web_tiles.answer-to-kids-how.eyebrow")}
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {t("parent_hub.web_tiles.answer-to-kids-how.title")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("parent_hub.web_tiles.answer-to-kids-how.library_description")}
            </p>
            {!isPremium && hubGate.tryFree && freeBooksLeft > 0 ? (
              <p className="mt-2 text-xs font-semibold text-amber-400/90">
                {t("parent_hub.web_tiles.answer-to-kids-how.free_books_remaining", {
                  count: freeBooksLeft,
                })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("parent_hub.web_tiles.answer-to-kids-how.search_placeholder")}
            className="rounded-xl border-white/10 bg-white/[0.04] pl-9"
            aria-label={t("parent_hub.web_tiles.answer-to-kids-how.search_placeholder")}
          />
        </div>

        <p className="mt-3 text-xs font-semibold text-muted-foreground">
          {t("parent_hub.web_tiles.answer-to-kids-how.book_count", {
            count: filtered.length,
            total: KIDS_HOW_BOOKS.length,
          })}
        </p>

        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none"
          role="tablist"
          aria-label="Book categories"
        >
          <button
            type="button"
            role="tab"
            aria-selected={category === "all"}
            className={cn(
              HUB_QUICK_CHIP,
              hubQuickChipTint("activities"),
              category === "all" && "ring-2 ring-amber-400/60",
            )}
            onClick={() => selectCategory("all")}
          >
            All
          </button>
          {KIDS_HOW_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              className={cn(
                HUB_QUICK_CHIP,
                hubQuickChipTint("activities"),
                category === cat && "ring-2 ring-amber-400/60",
              )}
              onClick={() => selectCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
            <p className="text-lg font-semibold text-foreground">
              {t("parent_hub.web_tiles.answer-to-kids-how.empty_quote")}
            </p>
            <Button
              className="rounded-xl"
              onClick={() => {
                setQuery("");
                selectCategory("all");
              }}
            >
              {t("parent_hub.web_tiles.answer-to-kids-how.empty_cta")}
            </Button>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filtered.map((book) => (
              <li key={book.id} className="min-h-0">
                <KidsHowBookCard
                  book={book}
                  readHref={`/answer-to-kids-how/read/${book.id}`}
                  locked={!canOpenKidsHowBook(book.id, userId, isPremium)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );

  return (
    <div
      className={cn(PARENT_HUB_PAGE, "min-h-screen bg-background pb-10")}
      onPointerDownCapture={() => hubGate.onEngage()}
      onKeyDownCapture={(e) => {
        if (e.key === "Enter" || e.key === " ") hubGate.onEngage();
      }}
    >
      {hubGate.journeySoft ? (
        <JourneyPreviewContent childName={hubGate.childName ?? "your child"}>
          {pageBody}
        </JourneyPreviewContent>
      ) : (
        <LockedBlock locked={hubGate.locked} reason="hub_journey" journeySoft={hubGate.journeySoft}>
          {pageBody}
        </LockedBlock>
      )}
    </div>
  );
}
