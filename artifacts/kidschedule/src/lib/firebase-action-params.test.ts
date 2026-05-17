import { describe, expect, it } from "vitest";
import { parseFirebaseActionParams } from "./firebase-action-params";

describe("parseFirebaseActionParams", () => {
  it("reads mode and oobCode from search", () => {
    const result = parseFirebaseActionParams({
      search: "?mode=verifyEmail&oobCode=abc",
      hash: "",
    });
    expect(result.mode).toBe("verifyEmail");
    expect(result.oobCode).toBe("abc");
  });
});
