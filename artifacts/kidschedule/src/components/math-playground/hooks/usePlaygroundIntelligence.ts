import { useCallback } from "react";
import { generateWorksheet } from "@workspace/math-playground-worksheets";
import {
  refreshPlaygroundIntelligence,
  renderTeacherReportHtml,
  renderWorksheetHtml,
} from "@workspace/math-playground-reporting";
import type { GeneratedWorksheet, WorksheetCategory } from "@workspace/math-playground";
import type { PlaygroundStateApi } from "../hooks/usePlaygroundState";
import {
  trackAssessmentCompleted,
  trackLearningGapDetected,
  trackTeacherReportGenerated,
  trackWorksheetDownloaded,
  trackWorksheetGenerated,
} from "../lib/playground-analytics";

export function usePlaygroundIntelligence(
  childId: number,
  ageYears: number,
  childName: string,
  playground: PlaygroundStateApi,
) {
  const intelligence = playground.state.intelligence;

  const refreshAfterSession = useCallback(() => {
    const result = refreshPlaygroundIntelligence({
      state: playground.state,
      ageYears,
      childDisplayName: childName,
      afterSessionComplete: true,
    });

    playground.persistState({
      ...playground.state,
      version: 4,
      intelligence: result.intelligence,
    });

    if (result.gapsDetected > 0) {
      trackLearningGapDetected(childId, result.gapsDetected);
    }
    if (result.parentReportGenerated) {
      trackAssessmentCompleted(childId, {
        type: "parent_report",
        sessions: playground.learning.sessionHistory.length,
      });
    }
    if (result.worksheetGenerated && result.intelligence.generatedWorksheets?.[0]) {
      trackWorksheetGenerated(childId, {
        category: result.intelligence.generatedWorksheets[0].worksheet.category,
        level: result.intelligence.generatedWorksheets[0].worksheet.level,
      });
    }

    return result;
  }, [ageYears, childId, childName, playground]);

  const generateWorksheetNow = useCallback(
    (category?: WorksheetCategory) => {
      const worksheet = generateWorksheet({
        childId,
        ageYears,
        learning: playground.learning,
        category,
      });

      const record = { worksheet };
      const prior = playground.state.intelligence?.generatedWorksheets ?? [];
      playground.persistState({
        ...playground.state,
        version: 4,
        intelligence: {
          ...playground.state.intelligence,
          generatedWorksheets: [record, ...prior].slice(0, 20),
        },
      });

      trackWorksheetGenerated(childId, {
        category: worksheet.category,
        level: worksheet.level,
      });

      return worksheet;
    },
    [ageYears, childId, playground],
  );

  const downloadWorksheetPdf = useCallback(
    (
      worksheet: GeneratedWorksheet,
      labels: Parameters<typeof renderWorksheetHtml>[1],
    ) => {
      const html = renderWorksheetHtml(worksheet, labels);
      const win = window.open("", "_blank");
      if (!win) return false;
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();

      const records = playground.state.intelligence?.generatedWorksheets ?? [];
      const updated = records.map((r) =>
        r.worksheet.id === worksheet.id ? { ...r, downloadedAt: Date.now() } : r,
      );
      playground.persistState({
        ...playground.state,
        version: 4,
        intelligence: {
          ...playground.state.intelligence,
          generatedWorksheets: updated,
        },
      });

      trackWorksheetDownloaded(childId, {
        category: worksheet.category,
        level: worksheet.level,
      });
      return true;
    },
    [childId, playground],
  );

  const downloadTeacherReport = useCallback(
    (
      labels: Parameters<typeof renderTeacherReportHtml>[1],
    ) => {
      const report = intelligence?.lastTeacherReport;
      if (!report) return false;
      const html = renderTeacherReportHtml(report, labels);
      const win = window.open("", "_blank");
      if (!win) return false;
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
      trackTeacherReportGenerated(childId, { readinessScore: report.schoolReadinessScore });
      return true;
    },
    [childId, intelligence?.lastTeacherReport],
  );

  const refreshNow = useCallback(() => {
    const result = refreshPlaygroundIntelligence({
      state: playground.state,
      ageYears,
      childDisplayName: childName,
      afterSessionComplete: false,
    });
    playground.persistState({
      ...playground.state,
      version: 4,
      intelligence: result.intelligence,
    });
    trackAssessmentCompleted(childId, { type: "readiness_refresh", sessions: playground.learning.sessionHistory.length });
    return result;
  }, [ageYears, childId, childName, playground]);

  return {
    intelligence,
    refreshAfterSession,
    refreshNow,
    generateWorksheetNow,
    downloadWorksheetPdf,
    downloadTeacherReport,
  };
}

export type PlaygroundIntelligenceApi = ReturnType<typeof usePlaygroundIntelligence>;
