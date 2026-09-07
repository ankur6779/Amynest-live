import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { safeHref } from "@/lib/safe-navigation";
import { livingSpeechLivePracticeHref, livingSpeechTalkHref } from "@/lib/speech-coach/living-room";
import { todayCarePathsHref } from "@/lib/today-home/care-paths";

const srcDir = resolve(import.meta.dirname, "..");

describe("AppLink query-string journeys", () => {
  it("still strips query strings (pre-existing nav contract)", () => {
    expect(safeHref("/speech-coach/live-session?preset=quick&childId=3")).toBe(
      "/speech-coach/live-session",
    );
    expect(safeHref("/speech-coach/talk?childId=3")).toBe("/speech-coach/talk");
    expect(safeHref("/speech-coach?childId=3")).toBe("/speech-coach");
  });

  it("does not use AppLink for Speech Coach live-session or Talk query params", () => {
    const landing = readFileSync(resolve(srcDir, "pages/speech-coach/index.tsx"), "utf8");
    expect(landing).toContain("setLocation(livingSpeechLivePracticeHref");
    expect(landing).toContain("setLocation(livingSpeechTalkHref");
    expect(landing).not.toContain('href={livingSpeechLivePracticeHref');
    expect(landing).not.toContain('href={livingSpeechTalkHref');
    expect(livingSpeechLivePracticeHref(3, "quick")).toContain("preset=quick");
    expect(livingSpeechLivePracticeHref(3, "quick")).toContain("childId=3");
    expect(livingSpeechTalkHref(3)).toBe("/speech-coach/talk?childId=3");
  });

  it("preserves Home → Speech Coach / Amy child context without AppLink queries", () => {
    expect(todayCarePathsHref("speech-coach", 9)).toBe("/speech-coach");
    expect(todayCarePathsHref("amy", 9)).toBe("/assistant");
    const care = readFileSync(
      resolve(srcDir, "components/today-home/today-care-paths.tsx"),
      "utf8",
    );
    expect(care).toContain("writeStoredActiveChildId");
    expect(care).toContain("if (childId != null) writeStoredActiveChildId(childId)");
  });

  it("contains leftover AppLink query journeys to living-OFF / non-AppLink paths", () => {
    const hub = readFileSync(resolve(srcDir, "pages/parenting-hub.tsx"), "utf8");
    const dash = readFileSync(resolve(srcDir, "pages/dashboard.tsx"), "utf8");
    const coachCard = readFileSync(
      resolve(srcDir, "components/amy-coach-check-in-card.tsx"),
      "utf8",
    );
    expect(hub).toContain("/assistant?q=${encodeURIComponent(prompt)}");
    expect(dash).toContain("{!TODAY_HOME_V1 ? (");
    expect(dash).toContain("<AmyCoachCheckInCard />");
    expect(coachCard).toContain("setLocation(`/amy-coach?resume=${primarySession.sessionId}`)");
  });
});
