import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BookOpen, Loader2, Sparkles, Star } from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { useToast } from "@/hooks/use-toast";
import { downloadPdfFromUrl } from "@/lib/hub-pdf-download";
import {
  HUB_BODY,
  HUB_INFO_BANNER,
  HUB_SECTION_TITLE,
  hubSectionCardClasses,
  hubAccentBarClasses,
  NUTRITION_HUB_ACCENT,
} from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import type {
  NutritionLibraryBookItem,
  NutritionLibraryBooksResponse,
  NutritionLibrarySignedUrlResponse,
} from "@/lib/nutrition-library-types";
import { NutritionLibraryBookCard } from "@/components/nutrition-library/nutrition-library-book-card";
import { NutritionLibraryPreviewModal } from "@/components/nutrition-library/nutrition-library-preview-modal";

export function NutritionLibrarySection() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
  const { toast } = useToast();

  const [previewBook, setPreviewBook] = useState<NutritionLibraryBookItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["nutrition-library-books"],
    queryFn: async () => {
      const res = await authFetch("/api/nutrition-library/books");
      if (!res.ok) throw new Error("books_fetch_failed");
      return res.json() as Promise<NutritionLibraryBooksResponse>;
    },
    staleTime: 10 * 60 * 1000,
  });

  const books = data?.books ?? [];
  const bookCount = books.filter((b) => b.available !== false).length;

  const fetchSignedUrl = useCallback(
    async (fileName: string, kind: "preview" | "download") => {
      const path =
        kind === "preview"
          ? `/api/nutrition-library/preview-url?file=${encodeURIComponent(fileName)}`
          : `/api/nutrition-library/download?file=${encodeURIComponent(fileName)}`;
      const res = await authFetch(path);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "signed_url_failed");
      }
      return res.json() as Promise<NutritionLibrarySignedUrlResponse>;
    },
    [authFetch],
  );

  const closePreview = () => {
    setPreviewBook(null);
    setPreviewUrl(null);
    setPreviewLoading(false);
  };

  const onPreview = async (book: NutritionLibraryBookItem) => {
    setPreviewBook(book);
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      const { url } = await fetchSignedUrl(book.fileName, "preview");
      setPreviewUrl(url);
    } catch {
      closePreview();
      toast({
        title: t("nutrition_hub.library.preview_error_title"),
        description: t("nutrition_hub.library.preview_error_desc"),
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const onDownload = async (book: NutritionLibraryBookItem) => {
    if (!isPremium) {
      openPaywall("nutrition_library");
      return;
    }
    setDownloadingId(book.id);
    try {
      const { url, fileName } = await fetchSignedUrl(book.fileName, "download");
      const ok = await downloadPdfFromUrl(url, fileName, { credentials: "omit" });
      if (!ok) {
        throw new Error("download_failed");
      }
      toast({
        title: t("nutrition_hub.library.download_started_title"),
        description: book.title,
      });
    } catch {
      toast({
        title: t("nutrition_hub.library.download_error_title"),
        description: t("nutrition_hub.library.download_error_desc"),
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "overflow-hidden")}>
        <div className="flex">
          <div className={hubAccentBarClasses(NUTRITION_HUB_ACCENT)} />
          <div className="flex flex-1 min-w-0 items-start gap-3 p-4 sm:p-5">
            <div
              className={cn(
                NUTRITION_HUB_ACCENT.emojiShell,
                "flex h-12 w-12 shrink-0 items-center justify-center text-2xl",
              )}
            >
              📚
            </div>
            <div className="min-w-0 flex-1">
              <h2 className={HUB_SECTION_TITLE}>{t("nutrition_hub.library.title")}</h2>
              <p className={cn(HUB_BODY, "mt-1 opacity-100")}>
                {t("nutrition_hub.library.subtitle")}
              </p>
              <p className="mt-2 text-xs font-semibold text-emerald-200/90">
                {t("nutrition_hub.library.book_count", { count: bookCount })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          HUB_INFO_BANNER,
          "flex-col items-stretch gap-2 border-emerald-400/20 bg-emerald-500/[0.06]",
        )}
      >
        <p className="flex items-start gap-2 text-sm font-medium text-foreground">
          <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          {isPremium
            ? t("nutrition_hub.library.banner_premium")
            : t("nutrition_hub.library.banner_free")}
        </p>
        {!isPremium && (
          <p className="text-xs text-muted-foreground pl-6">
            {t("nutrition_hub.library.banner_free_hint")}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm">{t("nutrition_hub.library.loading")}</p>
        </div>
      ) : isError || bookCount === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-emerald-400/15 bg-white/[0.03] px-6 py-12 text-center">
          <BookOpen className="h-10 w-10 text-emerald-300/60" aria-hidden />
          <p className="text-lg font-semibold text-foreground">
            {t("nutrition_hub.library.empty")}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <li key={book.id} className="min-h-0">
              <NutritionLibraryBookCard
                book={book}
                isPremium={isPremium}
                onPreview={() => void onPreview(book)}
                onDownload={() => void onDownload(book)}
                downloading={downloadingId === book.id}
              />
            </li>
          ))}
        </ul>
      )}

      <NutritionLibraryPreviewModal
        open={Boolean(previewBook)}
        title={previewBook?.title ?? ""}
        previewUrl={previewUrl}
        loading={previewLoading}
        onClose={closePreview}
      />
    </div>
  );
}
