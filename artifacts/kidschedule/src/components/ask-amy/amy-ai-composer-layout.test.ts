import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "amy-ai-workspace.css"),
  "utf8",
);

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{[^}]+\\}`));
  expect(match, `missing CSS block for ${selector}`).toBeTruthy();
  return match![0];
}

describe("Amy AI composer clipping contract", () => {
  it("uses a semi-rounded rectangle instead of a pill on the composer shell", () => {
    const shell = block(
      '.amy-ai-workspace [data-testid="chat-thread-composer"] [data-chat-answer="true"]',
    );
    expect(shell).toMatch(/border-radius:\s*18px/);
    expect(shell).not.toMatch(/border-radius:\s*999px/);
    expect(shell).toMatch(/overflow:\s*visible/);
    expect(shell).toMatch(/padding:\s*10px 12px 10px 16px/);
    expect(shell).toMatch(/gap:\s*16px/);
  });

  it("gives the textarea a flex item that cannot clip or steal send-button width", () => {
    const input = block('.amy-ai-workspace [data-testid="chat-thread-input"]');
    expect(input).toMatch(/flex:\s*1 1 0%/);
    expect(input).toMatch(/min-width:\s*0/);
    expect(input).toMatch(/width:\s*0/);
    expect(input).toMatch(/box-sizing:\s*border-box/);
    expect(input).toMatch(/margin:\s*0/);
    expect(input).toMatch(/border-radius:\s*0/);
    expect(input).toMatch(/padding:\s*8px 10px 8px 8px/);
    expect(input).not.toMatch(/overflow:\s*hidden;/);
    expect(input).toMatch(/overflow-x:\s*hidden/);
    expect(input).toMatch(/overflow-y:\s*auto/);
    expect(css).toMatch(
      /\.amy-ai-workspace \[data-testid="chat-thread-input"\]:focus-visible \{\s*outline:\s*none;/,
    );
  });

  it("keeps the circular send control inside the composer without overlapping text", () => {
    const send = block('.amy-ai-workspace [data-testid="chat-thread-send"]');
    expect(send).toMatch(/flex:\s*0 0 44px/);
    expect(send).toMatch(/flex-shrink:\s*0/);
    expect(send).toMatch(/border-radius:\s*999px/);
    expect(send).toMatch(/margin:\s*0/);
  });
});
