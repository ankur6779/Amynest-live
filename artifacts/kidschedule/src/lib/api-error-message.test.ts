import { describe, expect, it } from "vitest";
import { extractApiErrorMessage } from "./api-error-message";

describe("extractApiErrorMessage", () => {
  it("prefers response data.message", () => {
    expect(
      extractApiErrorMessage({
        data: { message: "A routine already exists for this child and date." },
      }),
    ).toBe("A routine already exists for this child and date.");
  });

  it("falls back to response data.error", () => {
    expect(
      extractApiErrorMessage({ data: { error: "validation_failed" } }),
    ).toBe("validation_failed");
  });

  it("uses Error.message when data is absent", () => {
    expect(extractApiErrorMessage(new Error("HTTP 409 Conflict"))).toBe(
      "HTTP 409 Conflict",
    );
  });
});
