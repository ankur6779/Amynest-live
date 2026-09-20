import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = resolve(import.meta.dirname, "..");

function read(...parts: string[]) {
  return readFileSync(resolve(srcDir, ...parts), "utf8");
}

describe("AmyNest viewport contract", () => {
  it("defines a single safe-area and content-width token system", () => {
    const css = read("styles/amynest-viewport.css");
    expect(css).toContain("--app-safe-top");
    expect(css).toContain("--app-safe-right");
    expect(css).toContain("--app-safe-bottom");
    expect(css).toContain("--app-safe-left");
    expect(css).toContain("--app-gutter-inline-start");
    expect(css).toContain("--app-gutter-inline-end");
    expect(css).toContain("--app-content-max");
    expect(css).toContain("--app-dialog-max-height");
    expect(css).toContain("--app-sheet-max-height");
    expect(css).toContain("clamp(");
    expect(css).not.toMatch(/Fold8|iPhone Duo|user-agent/i);
    expect(css).not.toMatch(/@media[^{]*Samsung/i);
  });

  it("is imported by the global stylesheet", () => {
    expect(read("index.css")).toContain('@import "./styles/amynest-viewport.css"');
  });

  it("does not double-apply safe-area on Today Home nested content", () => {
    const sanctuary = read("components/today-home/today-home-sanctuary.css");
    const contentStart = sanctuary.indexOf(".th-shell-content {");
    const contentBlock = sanctuary.slice(
      contentStart,
      sanctuary.indexOf("}", contentStart) + 1,
    );
    expect(contentBlock).toContain("--app-content-max");
    expect(contentBlock).not.toContain("safe-area-inset-left");
    expect(contentBlock).not.toContain("safe-area-inset-right");
  });

  it("keeps dialogs and sheets inside the dynamic viewport", () => {
    const dialog = read("components/ui/dialog.tsx");
    const sheet = read("components/ui/sheet.tsx");
    expect(dialog).toContain("--app-dialog-max-height");
    expect(dialog).toContain("overflow-y-auto");
    expect(dialog).toContain("h-11 w-11");
    expect(sheet).toContain("--app-sheet-max-height");
    expect(sheet).toContain("overflow-y-auto");
    expect(sheet).toContain("h-11 w-11");
  });

  it("does not shrink hub edge padding on narrow cover-class widths", () => {
    const index = read("index.css");
    expect(index).not.toMatch(
      /@media \(max-width: 360px\) \{\s*\.parent-hub-premium \{[\s\S]*padding-left: max\(8px/,
    );
  });
});
