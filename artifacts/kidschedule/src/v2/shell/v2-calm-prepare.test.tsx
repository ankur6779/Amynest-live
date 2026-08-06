import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { V2_PREPARE_COPY } from "@/v2/craft";
import { V2CalmLoadingShell } from "./V2CalmLoadingShell";
import { V2InlinePrepare } from "./V2CalmPrepare";

describe("Wave C calm prepare UI", () => {
  it("Suspense shell uses preparation language (no spinner)", () => {
    render(<V2CalmLoadingShell />);
    const el = screen.getByTestId("v2-calm-loading");
    expect(el).toHaveAttribute("aria-busy", "true");
    expect(el).toHaveTextContent(V2_PREPARE_COPY.quiet);
    expect(el.querySelector(".animate-spin")).toBeNull();
  });

  it("inline prepare replaces busy spinners", () => {
    render(
      <V2InlinePrepare
        testId="v2-inline-prepare-test"
        message={V2_PREPARE_COPY.continuingCare}
      />,
    );
    const el = screen.getByTestId("v2-inline-prepare-test");
    expect(el).toHaveTextContent(V2_PREPARE_COPY.continuingCare);
    expect(el.querySelector(".animate-spin")).toBeNull();
  });
});
