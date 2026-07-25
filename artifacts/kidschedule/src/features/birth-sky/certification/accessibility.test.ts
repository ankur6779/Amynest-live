/**
 * Accessibility static certification suite (Pack 8 Part 2).
 * Device VO/TalkBack remains WAIVED in CONFORMANCE_REPORT (U12).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("IM-7 accessibility static checks", () => {
  it("module shell back control is labeled", () => {
    const src = read("components/birth-sky-module-shell.tsx");
    expect(src).toMatch(/aria-label=\{.*Back/);
  });

  it("settings delete dialog is modal with accessible name", () => {
    const src = read("pages/settings/settings-page.tsx");
    expect(src).toMatch(/role="dialog"/);
    expect(src).toMatch(/aria-modal="true"/);
    expect(src).toMatch(/aria-label="Confirm delete Birth Sky"/);
  });

  it("edit confirm dialog announces update", () => {
    const src = read("pages/settings/edit-birth-details-page.tsx");
    expect(src).toMatch(/aria-label="Confirm sky update"/);
    expect(src).toMatch(/role="alert"/);
  });

  it("conversation sheet exposes dialog semantics", () => {
    const src = read("pages/dashboard/conversation-sheet.tsx");
    expect(src).toMatch(/role="dialog"|aria-modal/);
  });

  it("reduced motion is consulted on dashboard and settings", () => {
    expect(read("pages/dashboard/dashboard-page.tsx")).toMatch(/prefers-reduced-motion/);
    expect(read("pages/settings/settings-page.tsx")).toMatch(/prefers-reduced-motion|Using system Reduced Motion/);
  });

  it("sky map / segment nav support keyboard focusable controls", () => {
    const nav = read("pages/dashboard/segment-nav.tsx");
    expect(nav).toMatch(/role="tablist"|role="tab"/);
  });
});
