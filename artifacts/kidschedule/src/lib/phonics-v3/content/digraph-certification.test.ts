import { describe, expect, it } from "vitest";
import {
  CERTIFIED_DIGRAPH_IDS,
  MIN_DIGRAPH_STORIES,
  getAllDigraphStories,
  getDigraphAssessment,
  getDigraphAudioClips,
  getDigraphLesson,
  getDigraphMission,
  getDigraphRetentionConfig,
  getDigraphStories,
} from "./digraph-catalog";
import {
  buildDigraphCoverageReport,
  formatDigraphCoverageReport,
  verifyDigraphCoverage,
  type DigraphComponent,
} from "./digraph-certification";
import { getDecodableStoryCatalog } from "./story-catalog";
import { selectDigraphAdaptiveLessons } from "./digraph-adaptive";
import { defaultMasteryState } from "../mastery-engine";
import { defaultRetentionState } from "../spaced-repetition";

const REQUIRED_COMPONENTS: DigraphComponent[] = [
  "lesson",
  "audio",
  "story",
  "mission",
  "assessment",
  "retention_review",
];

describe("Digraph V3 Certification", () => {
  it("certifies all six digraphs with full learning loops", () => {
    const report = buildDigraphCoverageReport();
    console.log("\n" + formatDigraphCoverageReport(report) + "\n");

    expect(report.certificationStatus).toBe("PASS");
    expect(report.entries).toHaveLength(6);
    expect(report.entries.every((e) => e.pass)).toBe(true);
    expect(report.totalStories).toBeGreaterThanOrEqual(CERTIFIED_DIGRAPH_IDS.length * MIN_DIGRAPH_STORIES);
  });

  for (const digraphId of CERTIFIED_DIGRAPH_IDS) {
    it(`${digraphId} — has lesson, audio, story, mission, assessment, retention`, () => {
      const entry = verifyDigraphCoverage(digraphId);

      expect(entry.lesson, `${digraphId} missing lesson`).toBe(true);
      expect(entry.audio, `${digraphId} missing audio`).toBe(true);
      expect(entry.story, `${digraphId} missing stories (need ${MIN_DIGRAPH_STORIES}+)`).toBe(true);
      expect(entry.storyCount).toBeGreaterThanOrEqual(MIN_DIGRAPH_STORIES);
      expect(entry.mission, `${digraphId} missing mission`).toBe(true);
      expect(entry.assessment, `${digraphId} missing assessment`).toBe(true);
      expect(entry.retentionReview, `${digraphId} missing retention review`).toBe(true);
      expect(entry.missing).toHaveLength(0);
      expect(entry.pass).toBe(true);

      expect(getDigraphLesson(digraphId).steps.length).toBeGreaterThanOrEqual(3);
      expect(getDigraphAudioClips(digraphId).some((c) => c.type === "phoneme")).toBe(true);
      expect(getDigraphStories(digraphId).length).toBeGreaterThanOrEqual(MIN_DIGRAPH_STORIES);
      expect(getDigraphMission(digraphId).tasks.length).toBeGreaterThanOrEqual(3);
      expect(getDigraphAssessment(digraphId).words.length).toBeGreaterThanOrEqual(3);
      expect(getDigraphRetentionConfig(digraphId).reviewWords.length).toBeGreaterThanOrEqual(3);
    });
  }

  it("FAIL if any digraph is missing one component", () => {
    for (const id of CERTIFIED_DIGRAPH_IDS) {
      const entry = verifyDigraphCoverage(id);
      for (const component of REQUIRED_COMPONENTS) {
        const has =
          component === "lesson"
            ? entry.lesson
            : component === "audio"
              ? entry.audio
              : component === "story"
                ? entry.story
                : component === "mission"
                  ? entry.mission
                  : component === "assessment"
                    ? entry.assessment
                    : entry.retentionReview;
        expect(has, `${id} missing ${component}`).toBe(true);
      }
    }
  });

  it("merges digraph stories into main story catalog", () => {
    const catalog = getDecodableStoryCatalog();
    const digraphStories = getAllDigraphStories();
    for (const s of digraphStories) {
      expect(catalog.some((c) => c.id === s.id)).toBe(true);
    }
  });

  it("adaptive learning selects digraph lessons when pathway unlocked", () => {
    const picks = selectDigraphAdaptiveLessons({
      childId: 42,
      dateKey: "2026-06-11",
      masteryAvg: 70,
      mastery: defaultMasteryState(),
      retention: defaultRetentionState(),
      currentLevel: 4,
    });
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.every((p) => CERTIFIED_DIGRAPH_IDS.includes(p.digraphId))).toBe(true);
  });

  it("outputs content counts in coverage report", () => {
    const report = buildDigraphCoverageReport();
    for (const id of CERTIFIED_DIGRAPH_IDS) {
      const counts = report.contentCounts[id];
      expect(counts.stories).toBeGreaterThanOrEqual(MIN_DIGRAPH_STORIES);
      expect(counts.audioClips).toBeGreaterThan(3);
      expect(counts.missionTasks).toBeGreaterThanOrEqual(3);
      expect(counts.assessmentWords).toBeGreaterThanOrEqual(3);
      expect(counts.lessonSteps).toBeGreaterThanOrEqual(3);
      expect(counts.retentionWords).toBeGreaterThanOrEqual(3);
    }
  });
});
