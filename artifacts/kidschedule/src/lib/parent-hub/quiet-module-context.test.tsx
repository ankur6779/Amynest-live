import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ParentHubQuietModuleProvider,
  useParentHubQuietModule,
} from "./quiet-module-context";

function Probe() {
  const quiet = useParentHubQuietModule();
  return <span data-testid="quiet">{quiet ? "yes" : "no"}</span>;
}

describe("Pack 5 quiet module context", () => {
  it("defaults to false outside provider", () => {
    render(<Probe />);
    expect(screen.getByTestId("quiet").textContent).toBe("no");
  });

  it("is true inside provider", () => {
    render(
      <ParentHubQuietModuleProvider>
        <Probe />
      </ParentHubQuietModuleProvider>,
    );
    expect(screen.getByTestId("quiet").textContent).toBe("yes");
  });
});
