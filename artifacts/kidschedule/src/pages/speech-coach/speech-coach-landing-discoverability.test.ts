import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getSessionTypeAction } from "./speech-coach-utils";
import { livingSpeechLivePracticeHref } from "@/lib/speech-coach/living-room";

const here = resolve(import.meta.dirname);

describe("Speech Coach landing discoverability", () => {
  const landing = readFileSync(resolve(here, "index.tsx"), "utf8");
  const live = readFileSync(resolve(here, "live-speech-coach.tsx"), "utf8");

  it("exposes the existing live-session as the above-fold primary CTA", () => {
    expect(landing).toContain('data-testid="speech-coach-live-primary"');
    expect(landing).toContain("startLivePractice");
    expect(landing).toContain("startTalkWithAmy");
    expect(landing).toContain("livingSpeechLivePracticeHref");
    expect(landing).toContain("livingSpeechTalkHref");
    expect(landing).toContain('data-testid="speech-coach-talk-entry"');
    expect(landing).toContain("livingSpeechLivePracticeLabel");
    expect(landing).toContain("trackSpeechCoachLandingEntry");
    expect(landing.indexOf("speech-coach-live-primary")).toBeLessThan(
      landing.indexOf("speech-coach-recommend"),
    );
    expect(landing.indexOf("speech-coach-live-primary")).toBeLessThan(
      landing.indexOf("speech-coach-quiet-paths"),
    );
    expect(landing.indexOf("speech-coach-live-primary")).toBeLessThan(
      landing.indexOf("speech-coach-more-toggle"),
    );
  });

  it("keeps quiet paths and more-practice as secondary/tertiary", () => {
    expect(landing).toContain('data-testid="speech-coach-recommend"');
    expect(landing).toContain('data-testid="speech-coach-quiet-paths"');
    expect(landing).toContain('data-testid="speech-coach-more-toggle"');
    expect(landing).toContain("handleSessionType");
  });

  it("does not leave parent guidance looking clickable while doing nothing", () => {
    expect(landing).not.toContain("cursor-pointer hover:border-primary/50");
    expect(landing).toContain('data-testid={`guidance-${g.id}`}');
  });

  it("preserves child context into the existing live-session route", () => {
    expect(landing).toContain("resolveSpeechCoachChildId");
    expect(landing).toContain("writeStoredActiveChildId");
    expect(live).toContain("resolveSpeechCoachChildId");
    expect(live).toContain("parseSpeechCoachChildIdParam");
    expect(getSessionTypeAction("bedtime")).toEqual({
      type: "live",
      preset: "bedtime",
    });
    expect(livingSpeechLivePracticeHref(3, "bedtime")).toBe(
      "/speech-coach/live-session?preset=bedtime&childId=3",
    );
    expect(getSessionTypeAction("pronounce")).toEqual({
      type: "scroll",
      anchor: "speech-section-practice",
    });
  });

  it("styles the primary live CTA in sanctuary cream, not purple wash", () => {
    const css = readFileSync(
      resolve(here, "../../components/speech-coach/speech-coach-living-room.css"),
      "utf8",
    );
    const ctaStart = css.indexOf(".sc-live-primary {");
    const ctaBlock = css.slice(ctaStart, css.indexOf(".sc-live-primary-label"));
    expect(ctaBlock).toContain("#fbf6ee");
    expect(ctaBlock).toContain("#1a120c");
    expect(ctaBlock).not.toMatch(/168,\s*85,\s*247/);
  });
});
