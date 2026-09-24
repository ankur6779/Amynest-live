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
    expect(css).toContain("--app-fab-clearance-inline");
    expect(css).toContain("clamp(");
    expect(css).not.toMatch(/Fold8|iPhone Duo/i);
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
    expect(sanctuary).toContain("--app-fab-clearance-inline");
  });

  it("contains Health Lab living chrome so body scrollWidth cannot exceed the viewport", () => {
    const living = read("components/health-lab/health-lab-living-room.css");
    const shell = living.slice(
      living.indexOf(".health-lab-living.fe-shell {"),
      living.indexOf(".health-lab-living .fe-ambient"),
    );
    expect(shell).toContain("overflow-x: clip");
    expect(shell).toContain("overflow-y: clip");
    expect(shell).toContain("min-width: 0");
    expect(shell).toContain("max-width: min(48rem, 100%)");
    expect(living).toContain(".health-lab-living .fe-breath");
    expect(living).toMatch(/\.health-lab-living \.fe-breath[\s\S]*inset: 0/);
  });

  it("keeps PDF preview dialogs inside the dynamic viewport", () => {
    const coloring = read("components/coloring-books.tsx");
    const funsheets = read("components/fun-sheets.tsx");
    expect(coloring).toContain("--app-dialog-max-height");
    expect(coloring).not.toMatch(/h-\[85vh\]/);
    expect(funsheets).toContain("--app-dialog-max-height");
    expect(funsheets).not.toMatch(/h-\[85vh\]/);
  });

  it("caps remaining user dialogs and sheets with viewport tokens, not raw 85vh", () => {
    const subscription = read("components/subscription-moment-sheet.tsx");
    const country = read("components/onboarding-country-modal.tsx");
    const recipe = read("pages/routines/detail.tsx");
    const taskCheck = read("pages/routines/generate.tsx");
    const curriculum = read("components/study-curriculum-visibility.tsx");
    const inspector = read("components/amy-runtime-inspector/runtime-inspector-console.tsx");

    expect(subscription).toContain("--app-sheet-max-height");
    expect(subscription).not.toMatch(/max-h-\[85vh\]/);
    expect(country).toContain("--app-dialog-max-height");
    expect(country).not.toMatch(/max-h-\[85vh\]/);
    expect(recipe).toContain("--app-dialog-max-height");
    expect(recipe).not.toMatch(/max-h-\[85vh\]/);
    expect(taskCheck).toContain("--app-sheet-max-height");
    expect(taskCheck).not.toMatch(/max-h-\[85vh\]/);
    expect(curriculum).toContain("--app-sheet-max-height");
    expect(curriculum).not.toMatch(/h-\[85vh\]/);
    expect(curriculum).not.toMatch(/85vh-120px/);

    // Debug overlay only — not a user dialog/sheet.
    expect(inspector).toMatch(/max-h-\[min\(85vh,720px\)\]/);
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
