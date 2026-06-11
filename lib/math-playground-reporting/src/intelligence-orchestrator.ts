import type {
  GeneratedWorksheet,
  GeneratedWorksheetRecord,
  PlaygroundEngagementState,
  PlaygroundIntelligenceState,
  PlaygroundLearningState,
  PlaygroundPersistedState,
} from "@workspace/math-playground";
import { computeSchoolReadiness, detectLearningGaps } from "@workspace/math-playground-assessment";
import { generateWorksheet } from "@workspace/math-playground-worksheets";
import {
  buildParentLearningReport,
  shouldGenerateParentReport,
} from "./parent-report-builder";
import { buildProgressForecast } from "./progress-forecast";
import { buildRecommendations } from "./recommendation-engine";
import { buildTeacherReport } from "./teacher-report-builder";

const MAX_STORED_WORKSHEETS = 20;
const MAX_STORED_REPORTS = 10;
const MAX_FORECAST_HISTORY = 12;

export interface IntelligenceRefreshInput {
  state: PlaygroundPersistedState;
  ageYears: number;
  childDisplayName?: string;
  /** When true, always attempt parent report if threshold met */
  afterSessionComplete?: boolean;
  /** Optional explicit worksheet category */
  worksheetCategory?: GeneratedWorksheet["category"];
}

export interface IntelligenceRefreshResult {
  intelligence: PlaygroundIntelligenceState;
  parentReportGenerated: boolean;
  worksheetGenerated: boolean;
  gapsDetected: number;
}

function defaultIntelligence(): PlaygroundIntelligenceState {
  return {
    generatedWorksheets: [],
    parentReports: [],
    forecastHistory: [],
    sessionsSinceLastReport: 0,
  };
}

function trimWorksheets(records: GeneratedWorksheetRecord[]): GeneratedWorksheetRecord[] {
  return records.slice(0, MAX_STORED_WORKSHEETS);
}

export function refreshPlaygroundIntelligence(
  input: IntelligenceRefreshInput,
): IntelligenceRefreshResult {
  const learning = input.state.learning ?? { sessionHistory: [], activityStats: {} };
  const engagement = input.state.engagement;
  const prior = input.state.intelligence ?? defaultIntelligence();

  const readiness = computeSchoolReadiness(learning, engagement);
  const gaps = detectLearningGaps(learning, input.ageYears);
  const recommendations = buildRecommendations(learning, input.ageYears);
  const forecast = buildProgressForecast(learning, readiness);

  let sessionsSinceLastReport = (prior.sessionsSinceLastReport ?? 0) + (input.afterSessionComplete ? 1 : 0);
  let parentReports = [...(prior.parentReports ?? [])];
  let parentReportGenerated = false;

  const intelligenceDraft: PlaygroundIntelligenceState = {
    ...prior,
    schoolReadiness: readiness,
    learningGaps: gaps,
    lastRecommendationBundle: recommendations,
    forecastHistory: [forecast, ...(prior.forecastHistory ?? [])].slice(0, MAX_FORECAST_HISTORY),
    sessionsSinceLastReport,
  };

  if (
    input.afterSessionComplete &&
    shouldGenerateParentReport(intelligenceDraft, learning.sessionHistory.length)
  ) {
    const report = buildParentLearningReport(learning, input.ageYears, engagement);
    parentReports = [report, ...parentReports].slice(0, MAX_STORED_REPORTS);
    sessionsSinceLastReport = 0;
    parentReportGenerated = true;
  }

  let generatedWorksheets = [...(prior.generatedWorksheets ?? [])];
  let worksheetGenerated = false;

  const shouldAutoWorksheet =
    input.afterSessionComplete &&
    learning.sessionHistory.length > 0 &&
    learning.sessionHistory.length % 5 === 0;

  if (shouldAutoWorksheet || input.worksheetCategory) {
    const worksheet = generateWorksheet({
      childId: input.state.childId,
      ageYears: input.ageYears,
      learning,
      category: input.worksheetCategory,
    });
    generatedWorksheets = trimWorksheets([{ worksheet }, ...generatedWorksheets]);
    worksheetGenerated = true;
  }

  if (input.childDisplayName) {
    intelligenceDraft.lastTeacherReport = buildTeacherReport(
      learning,
      input.childDisplayName,
      input.ageYears,
      intelligenceDraft,
    );
  }

  const intelligence: PlaygroundIntelligenceState = {
    ...intelligenceDraft,
    parentReports,
    generatedWorksheets,
    sessionsSinceLastReport,
  };

  return {
    intelligence,
    parentReportGenerated,
    worksheetGenerated,
    gapsDetected: gaps.gaps.length,
  };
}

/** Orchestrates assessment, worksheets, and reporting after learning events. */
export const IntelligenceOrchestrator = {
  refresh: refreshPlaygroundIntelligence,
};
