import { describe, expect, it, beforeEach } from "vitest";
import {
  canOpenKidsHowBook,
  getKidsHowOpenedBookIds,
  kidsHowFreeBooksRemaining,
  KIDS_HOW_LIFETIME_FREE_PDFS,
  markKidsHowBookOpened,
} from "./kids-how-pdf-access";

const USER = "user-test-1";

describe("kids-how-pdf-access", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("allows up to three unique books for free users", () => {
    expect(canOpenKidsHowBook("book-a", USER, false)).toBe(true);
    markKidsHowBookOpened("book-a", USER);
    markKidsHowBookOpened("book-b", USER);
    markKidsHowBookOpened("book-c", USER);

    expect(getKidsHowOpenedBookIds(USER).size).toBe(3);
    expect(canOpenKidsHowBook("book-a", USER, false)).toBe(true);
    expect(canOpenKidsHowBook("book-d", USER, false)).toBe(false);
    expect(kidsHowFreeBooksRemaining(USER, false)).toBe(0);
  });

  it("premium users are never blocked", () => {
    for (let i = 0; i < KIDS_HOW_LIFETIME_FREE_PDFS + 2; i++) {
      expect(canOpenKidsHowBook(`book-${i}`, USER, true)).toBe(true);
    }
  });
});
