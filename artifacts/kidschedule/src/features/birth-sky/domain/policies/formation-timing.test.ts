import { describe, expect, it } from "vitest";
import { formationDurationBucket } from "./formation-timing";

describe("formationDurationBucket", () => {
  it("maps Pack 3 Addendum A buckets", () => {
    expect(formationDurationBucket(2999)).toBe("<3s");
    expect(formationDurationBucket(3000)).toBe("3–5s");
    expect(formationDurationBucket(4999)).toBe("3–5s");
    expect(formationDurationBucket(5000)).toBe("5–10s");
    expect(formationDurationBucket(9999)).toBe("5–10s");
    expect(formationDurationBucket(10000)).toBe("10s+");
  });
});
