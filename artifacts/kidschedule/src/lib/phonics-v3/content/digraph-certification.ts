/**
 * Digraph V3 certification — coverage report and pass/fail gate.
 */
import {
  CERTIFIED_DIGRAPH_IDS,
  MIN_DIGRAPH_STORIES,
  getDigraphAssessment,
  getDigraphAudioClips,
  getDigraphContentCounts,
  getDigraphLesson,
  getDigraphMission,
  getDigraphRetentionConfig,
  getDigraphStories,
  isAudioClipAvailable,
  type DigraphAudioClip,
} from "./digraph-catalog";
import type { DigraphId } from "./digraph-catalog";

export type DigraphComponent =
  | "lesson"
  | "audio"
  | "story"
  | "mission"
  | "assessment"
  | "retention_review";

export type DigraphCoverageEntry = {
  digraphId: DigraphId;
  lesson: boolean;
  audio: boolean;
  story: boolean;
  storyCount: number;
  mission: boolean;
  assessment: boolean;
  retentionReview: boolean;
  pass: boolean;
  missing: DigraphComponent[];
};

export type DigraphCoverageReport = {
  entries: DigraphCoverageEntry[];
  contentCounts: ReturnType<typeof getDigraphContentCounts>;
  totalStories: number;
  totalAudioClips: number;
  certificationStatus: "PASS" | "FAIL";
  summaryLine: string;
};

function verifyAudioClips(clips: DigraphAudioClip[]): boolean {
  const phonemeOk = clips.some((c) => c.type === "phoneme" && isAudioClipAvailable(c.audioKey));
  const availableWordClips = clips
    .filter((c) => c.type === "word" && isAudioClipAvailable(c.audioKey));
  const wordsOk = availableWordClips.length >= 3;
  return phonemeOk && wordsOk;
}

export function verifyDigraphCoverage(digraphId: DigraphId): DigraphCoverageEntry {
  const lesson = getDigraphLesson(digraphId);
  const stories = getDigraphStories(digraphId);
  const mission = getDigraphMission(digraphId);
  const assessment = getDigraphAssessment(digraphId);
  const retention = getDigraphRetentionConfig(digraphId);
  const audioClips = getDigraphAudioClips(digraphId);

  const hasLesson = lesson.steps.length >= 3;
  const hasAudio = verifyAudioClips(audioClips);
  const hasStory = stories.length >= MIN_DIGRAPH_STORIES;
  const hasMission = mission.tasks.length >= 3;
  const hasAssessment = assessment.words.length >= 3;
  const hasRetention =
    retention.phonemeTrackId.length > 0 && retention.reviewWords.length >= 3;

  const missing: DigraphComponent[] = [];
  if (!hasLesson) missing.push("lesson");
  if (!hasAudio) missing.push("audio");
  if (!hasStory) missing.push("story");
  if (!hasMission) missing.push("mission");
  if (!hasAssessment) missing.push("assessment");
  if (!hasRetention) missing.push("retention_review");

  return {
    digraphId,
    lesson: hasLesson,
    audio: hasAudio,
    story: hasStory,
    storyCount: stories.length,
    mission: hasMission,
    assessment: hasAssessment,
    retentionReview: hasRetention,
    pass: missing.length === 0,
    missing,
  };
}

export function buildDigraphCoverageReport(): DigraphCoverageReport {
  const entries = CERTIFIED_DIGRAPH_IDS.map((id) => verifyDigraphCoverage(id));
  const contentCounts = getDigraphContentCounts();
  const totalStories = entries.reduce((s, e) => s + e.storyCount, 0);
  const totalAudioClips = CERTIFIED_DIGRAPH_IDS.reduce(
    (s, id) => s + getDigraphAudioClips(id).length,
    0,
  );
  const allPass = entries.every((e) => e.pass);
  const failed = entries.filter((e) => !e.pass);

  const summaryLine = allPass
    ? `All ${CERTIFIED_DIGRAPH_IDS.length} digraphs certified — ${totalStories} stories, ${totalAudioClips} audio clips.`
    : `FAIL: ${failed.map((e) => `${e.digraphId} (${e.missing.join(", ")})`).join("; ")}`;

  return {
    entries,
    contentCounts,
    totalStories,
    totalAudioClips,
    certificationStatus: allPass ? "PASS" : "FAIL",
    summaryLine,
  };
}

export function formatDigraphCoverageReport(report: DigraphCoverageReport): string {
  const lines = [
    "── Digraph V3 Coverage Report ──",
    `Status: ${report.certificationStatus}`,
    report.summaryLine,
    "",
    "Per-digraph:",
    ...report.entries.map(
      (e) =>
        `${e.pass ? "PASS" : "FAIL"} ${e.digraphId}: stories=${e.storyCount} lesson=${e.lesson} audio=${e.audio} mission=${e.mission} assessment=${e.assessment} retention=${e.retentionReview}`,
    ),
    "",
    "Content counts:",
    ...CERTIFIED_DIGRAPH_IDS.map((id) => {
      const c = report.contentCounts[id];
      return `  ${id}: stories=${c.stories} audio=${c.audioClips} missions=${c.missionTasks} assess=${c.assessmentWords} lesson=${c.lessonSteps} retention=${c.retentionWords}`;
    }),
  ];
  return lines.join("\n");
}
