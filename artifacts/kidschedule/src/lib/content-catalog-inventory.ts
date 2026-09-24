/**
 * Static inventory of GCS / proxy / Drive-backed content used by
 * worksheets, coloring, curiosity, and videos. Existence of a catalog
 * row is not certification — the delivery chain must still resolve.
 */
import { KIDS_HOW_BOOKS } from "@/lib/kids-how-books";

export type ContentAssetKind =
  | "worksheet-pdf"
  | "coloring-pdf"
  | "curiosity-pdf"
  | "art-craft-video"
  | "story-video"
  | "activity-embed";

export type ContentCatalogRow = {
  id: string;
  title: string;
  kind: ContentAssetKind;
  category: string;
  ageMinMonths: number | null;
  ageMaxMonthsExclusive: number | null;
  objectPath: string;
  browserUrlPath: string;
  source: "gcs" | "drive" | "proxy";
};

export const CURIOSITY_CATALOG: ContentCatalogRow[] = KIDS_HOW_BOOKS.map(
  (book) => ({
    id: book.id,
    title: book.title,
    kind: "curiosity-pdf" as const,
    category: book.category,
    ageMinMonths: 24,
    ageMaxMonthsExclusive: null,
    objectPath: book.gcsPath,
    browserUrlPath: `/api/kids-how-library/preview-url?bookId=${encodeURIComponent(book.id)}`,
    source: "gcs" as const,
  }),
);

export const COLORING_LIBRARY = {
  id: "coloring-books",
  title: "Coloring Books",
  kind: "coloring-pdf" as const,
  source: "drive" as const,
  driveFolderId: "1n937xIi5gjhWMtVUaxuaSLHe96ZLSdkT",
  listPath: "/api/coloring/list",
  downloadPath: "/api/coloring/download",
  ageMinMonths: 24,
  infantPreview: true,
};

export const WORKSHEET_LIBRARY = {
  id: "worksheets",
  title: "Printable Worksheets",
  kind: "worksheet-pdf" as const,
  source: "drive" as const,
  driveFolderId: "1vT-SG778TlLbgb64aCbZUO1y1hGq1Wyr",
  listPath: "/api/worksheets/list",
  downloadPath: "/api/worksheets/download",
  ageMinMonths: 0,
};

export const ART_CRAFT_REELS = {
  id: "art-craft",
  title: "Art & Craft videos",
  kind: "art-craft-video" as const,
  source: "gcs" as const,
  objectPrefix: "reels-hub/phase1/",
  listPath: "/api/reels/videos",
  streamPathPrefix: "/api/reels/stream/",
  ageMinMonths: 0,
};

export const STORY_VIDEOS = {
  id: "story-hub",
  title: "Story videos",
  kind: "story-video" as const,
  source: "proxy" as const,
  listPath: "/api/stories",
  streamPathPrefix: "/api/stories/stream/",
  gcsPrefix: "story-hub/",
  ageMinMonths: 0,
};

export function curiosityBrowserPaths(): string[] {
  return CURIOSITY_CATALOG.map((row) => row.browserUrlPath);
}
