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

  it("maps HTTP 401 to session expired", () => {
    expect(extractApiErrorMessage(new Error("HTTP 401 Unauthorized"))).toBe(
      "Session expired. Please sign in again.",
    );
  });

  it("never surfaces Drizzle SQL leak in toast", () => {
    const sql =
      'Failed query: insert into "routines" ... on conflict ("child_id","date") do update params: 33, 2026-06-09';
    expect(
      extractApiErrorMessage({ data: { error: sql } }, "Could not save routine"),
    ).toBe("Could not save routine");
  });
});
