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
    expect(src).toMatch(/aria-label="Confirm delete Amy Astro Intelligence"/);
  });

  it("edit confirm dialog announces update", () => {
    const src = read("pages/settings/edit-birth-details-page.tsx");
    expect(src).toMatch(/aria-label="Confirm sky update"/);
    expect(src).toMatch(/role="alert"/);
  });

  it("conversation sheet exposes dialog semantics", () => {
    const src = read("pages/dashboard/conversation-sheet.tsx");
    expect(src).toMatch(/role="dialog"|aria-modal/);
    expect(src).toMatch(/useFocusTrap/);
    expect(src).toMatch(/visualViewport/);
  });

  it("planet journey and celebrations trap focus with Escape", () => {
    expect(read("components/planet-journey.tsx")).toMatch(/useFocusTrap/);
    expect(read("components/emotional-celebration.tsx")).toMatch(/useFocusTrap/);
    expect(read("components/emotional-completion.tsx")).toMatch(/useFocusTrap/);
    expect(read("pages/settings/settings-page.tsx")).toMatch(/useFocusTrap/);
  });

  it("remaining overlays trap focus", () => {
    expect(read("pages/dashboard/tradition-intro-sheet.tsx")).toMatch(/useFocusTrap/);
    expect(read("pages/dashboard/tradition-segment.tsx")).toMatch(/useFocusTrap/);
    expect(read("pages/dashboard/reflect-segment.tsx")).toMatch(/useFocusTrap/);
    expect(read("components/exploration-delight.tsx")).toMatch(/useFocusTrap/);
    expect(read("pages/settings/regenerate-overlay.tsx")).toMatch(/useFocusTrap/);
    expect(read("components/cinematic-reveal-ceremony.tsx")).toMatch(/useFocusTrap/);
    expect(read("pages/settings/edit-birth-details-page.tsx")).toMatch(/useFocusTrap/);
    expect(read("pages/setup/date-page.tsx")).toMatch(/useFocusTrap/);
  });

  it("zero-child setup reaches confirmation empty state", () => {
    const src = read("pages/birth-sky-app.tsx");
    expect(src).toMatch(/resolved\.land === "setup"/);
    expect(src).toMatch(/!selectedChild \|\| !draft/);
    expect(read("pages/child-confirmation-page.tsx")).toMatch(/birth-sky-no-child/);
  });

  it("hydrate path re-applies polished assistant bodies", () => {
    const orch = read("application/orchestrators/use-birth-sky-ai.ts");
    expect(orch).toMatch(/applyPolishedBodies/);
    expect(orch).toMatch(/savePolishedMessage/);
    expect(orch).toMatch(/expectMessageId/);
    expect(orch).toMatch(/localMessagesRef\.current/);
    expect(read("lib/polished-message-store.ts")).toMatch(/applyPolishedBodies/);
  });

  it("reduced motion is consulted on dashboard and settings", () => {
    expect(read("pages/dashboard/dashboard-page.tsx")).toMatch(/prefers-reduced-motion/);
    expect(read("pages/settings/settings-page.tsx")).toMatch(/prefers-reduced-motion|Using system Reduced Motion/);
  });

  it("reduced-motion reveal still shows voice and identity", () => {
    const src = read("components/cinematic-reveal-ceremony.tsx");
    expect(src).toMatch(/reducedMotion \|\| elapsed >= 9000/);
    expect(src).toMatch(/REDUCED_DONE_MS = 2800/);
  });

  it("sky map / segment nav support keyboard focusable controls", () => {
    const nav = read("pages/dashboard/segment-nav.tsx");
    expect(nav).toMatch(/role="tablist"|role="tab"/);
    expect(nav).toMatch(/tabRefs\.current\[idx\]\?\.focus|focus\(\)/);
  });

  it("loading state never returns a blank screen", () => {
    const src = read("pages/birth-sky-app.tsx");
    expect(src).toMatch(/amy-astro-loading/);
    expect(src).not.toMatch(/profileLoading\) \{\s*return null/);
  });
});
