import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { AmyAIIcon } from "@/components/ask-amy/amy-ai-icon";

vi.mock("@/lib/client-logs", () => ({
  queueClientLog: vi.fn(),
}));

describe("AmyAIIcon", () => {
  it("renders a calm mark without neon glow filters", () => {
    const { container } = render(<AmyAIIcon size={28} decorative={false} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-label", "Amy");
    expect(svg?.innerHTML.toLowerCase()).not.toContain("filter");
    expect(svg?.innerHTML.toLowerCase()).not.toContain("feGaussianBlur".toLowerCase());
    expect(svg?.innerHTML).not.toMatch(/#a855f7|#c084fc|neon/i);
  });

  it("keeps a readable face at 16px", () => {
    const { container } = render(<AmyAIIcon size={16} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg?.innerHTML).toContain("r=\"1.35\"");
  });
});
