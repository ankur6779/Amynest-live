import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AmyMarkdown } from "./amy-markdown";

describe("AmyMarkdown", () => {
  it("renders bold and numbered lists without raw markdown syntax", () => {
    const { container } = render(
      <AmyMarkdown
        text={`Here is a calm start.\n\n1. **Start with a Wind Down**\n2. **Create a Specific Routine**\n3. **Set a Consistent Time**`}
      />,
    );
    expect(screen.getByText("Start with a Wind Down").tagName).toBe("STRONG");
    expect(container.textContent).not.toContain("**");
    expect(document.querySelector("ol")).toBeTruthy();
    expect(document.querySelectorAll("li")).toHaveLength(3);
  });

  it("renders headings, quotes, and http links", () => {
    render(
      <AmyMarkdown
        text={`## Evening\n> Keep lights low.\nRead [this](https://example.com/calm).`}
      />,
    );
    expect(screen.getByText("Evening").tagName.toLowerCase()).toBe("h4");
    expect(screen.getByText("Keep lights low.").closest("blockquote")).toBeTruthy();
    expect(screen.getByRole("link", { name: "this" })).toHaveAttribute(
      "href",
      "https://example.com/calm",
    );
  });

  it("autolinks bare https URLs", () => {
    render(<AmyMarkdown text="See https://example.com/sleep for more." />);
    expect(screen.getByRole("link", { name: "https://example.com/sleep" })).toHaveAttribute(
      "href",
      "https://example.com/sleep",
    );
  });
});
