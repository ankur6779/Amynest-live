import {
  computeSkillBreakdown,
  deriveSkillTrend,
  type PlaygroundIntelligenceState,
  type PlaygroundLearningState,
  type TeacherReportSummary,
  type TeacherSkillRow,
  type TeacherSkillStatus,
} from "@workspace/math-playground";
import { computeSchoolReadiness } from "@workspace/math-playground-assessment";

function skillStatus(mastery: number): TeacherSkillStatus {
  if (mastery >= 78) return "mastered";
  if (mastery >= 50) return "emerging";
  return "needs_support";
}

function toSkillRows(learning: PlaygroundLearningState): TeacherSkillRow[] {
  const breakdown = computeSkillBreakdown(learning);
  return (Object.keys(breakdown) as (keyof typeof breakdown)[]).map((skill) => ({
    skill,
    masteryScore: breakdown[skill],
    status: skillStatus(breakdown[skill]),
    trend: deriveSkillTrend(learning, skill),
  }));
}

export function buildTeacherReport(
  learning: PlaygroundLearningState,
  childDisplayName: string,
  childAgeYears: number,
  intelligence?: PlaygroundIntelligenceState,
): TeacherReportSummary {
  const readiness = computeSchoolReadiness(learning);
  const allRows = toSkillRows(learning).filter((r) => r.masteryScore > 0);
  const rows = allRows.length > 0 ? allRows : toSkillRows(learning);

  const history = (intelligence?.forecastHistory ?? []).slice(0, 5).map((f) => ({
    date: new Date(f.generatedAt).toISOString().slice(0, 10),
    readinessScore: f.currentReadiness,
    sessionCount: learning.sessionHistory.length,
  }));

  if (history.length === 0) {
    history.push({
      date: new Date().toISOString().slice(0, 10),
      readinessScore: readiness.score,
      sessionCount: learning.sessionHistory.length,
    });
  }

  return {
    id: `teacher_${Date.now()}`,
    generatedAt: Date.now(),
    childDisplayName,
    childAgeYears,
    schoolReadinessScore: readiness.score,
    schoolReadinessBand: readiness.band,
    skillsMastered: allRows.filter((r) => r.status === "mastered"),
    skillsEmerging: allRows.filter((r) => r.status === "emerging"),
    skillsNeedingSupport: allRows.filter((r) => r.status === "needs_support"),
    assessmentHistory: history,
    notesKey: "teacher_report_notes_default",
  };
}
