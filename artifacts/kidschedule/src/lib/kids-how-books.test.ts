import { describe, expect, it } from "vitest";
import {
  filterKidsHowBooks,
  getKidsHowBook,
  KIDS_HOW_BOOKS,
  kidsHowPreviewApiPath,
} from "@/lib/kids-how-books";

describe("kids-how-books", () => {
  it("has 15 unique books with API preview paths", () => {
    expect(KIDS_HOW_BOOKS).toHaveLength(15);
    const ids = new Set(KIDS_HOW_BOOKS.map((b) => b.id));
    expect(ids.size).toBe(15);
    for (const book of KIDS_HOW_BOOKS) {
      expect(book.gcsPath.startsWith("Answer to How/")).toBe(true);
      expect(kidsHowPreviewApiPath(book.id)).toContain(
        `/api/kids-how-library/preview-url?bookId=${encodeURIComponent(book.id)}`,
      );
    }
  });

  it("filters by title and category", () => {
    const chess = filterKidsHowBooks(KIDS_HOW_BOOKS, "chess", "all");
    expect(chess).toHaveLength(1);
    expect(chess[0]?.id).toBe("how-to-play-chess");

    const science = filterKidsHowBooks(KIDS_HOW_BOOKS, "", "Science");
    expect(science.every((b) => b.category === "Science")).toBe(true);
    expect(science.length).toBeGreaterThanOrEqual(2);
  });

  it("looks up book by id", () => {
    expect(getKidsHowBook("how-clouds-are-made")?.title).toContain("Clouds");
  });
});
