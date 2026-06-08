import { describe, expect, it, vi } from "vitest";
import { isCoachEligible } from "./coach-age-nav";

describe("coach generation guard", () => {
  it("does not call generate API for preview-only infants", async () => {
    const fetchMock = vi.fn();
    const child = { id: 1, age: 0, ageMonths: 18 };

    expect(isCoachEligible(child)).toBe(false);

    if (isCoachEligible(child)) {
      await fetchMock("/api/coach/generate", { method: "POST" });
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows generate API for eligible children", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const child = { id: 2, age: 2, ageMonths: 0 };

    expect(isCoachEligible(child)).toBe(true);

    if (isCoachEligible(child)) {
      await fetchMock("/api/coach/generate", { method: "POST" });
    }

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
