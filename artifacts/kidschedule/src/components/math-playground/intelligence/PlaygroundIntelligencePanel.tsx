import { useTranslation } from "react-i18next";
import type { PlaygroundIntelligenceApi } from "../hooks/usePlaygroundIntelligence";
import { SchoolReadinessCard } from "./SchoolReadinessCard";
import { LearningGapsCard } from "./LearningGapsCard";
import { RecommendationPanel } from "./RecommendationPanel";
import { WorksheetGeneratorCard } from "./WorksheetGeneratorCard";
import { ParentLearningReportCard } from "./ParentLearningReportCard";
import { TeacherReportCard } from "./TeacherReportCard";
import { ProgressForecastCard } from "./ProgressForecastCard";

interface PlaygroundIntelligencePanelProps {
  childName: string;
  ageYears: number;
  intelligenceApi: PlaygroundIntelligenceApi;
}

export function PlaygroundIntelligencePanel({
  childName,
  ageYears,
  intelligenceApi,
}: PlaygroundIntelligencePanelProps) {
  const { t } = useTranslation();
  const { intelligence } = intelligenceApi;

  if (!intelligence?.schoolReadiness && intelligenceApi.intelligence === undefined) {
    return (
      <div
        className="rounded-xl px-3 py-3 mb-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        <p className="text-xs font-bold text-indigo-300/90 mb-1">
          {t("components.math_playground.intelligence_title")}
        </p>
        <p className="text-[10px] text-white/50 mb-2">
          {t("components.math_playground.intelligence_empty")}
        </p>
        <button
          type="button"
          onClick={() => intelligenceApi.refreshNow()}
          className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
          style={{ background: "rgba(99,102,241,0.2)", color: "hsl(var(--brand-indigo-300))" }}
        >
          {t("components.math_playground.intelligence_refresh")}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 space-y-2">
      <p className="text-[10px] font-bold text-indigo-300/80 uppercase px-1">
        {t("components.math_playground.intelligence_title")}
      </p>

      {intelligence?.schoolReadiness && (
        <SchoolReadinessCard readiness={intelligence.schoolReadiness} />
      )}

      {intelligence?.learningGaps && intelligence.learningGaps.gaps.length > 0 && (
        <LearningGapsCard gaps={intelligence.learningGaps} />
      )}

      {intelligence?.lastRecommendationBundle && (
        <RecommendationPanel bundle={intelligence.lastRecommendationBundle} />
      )}

      {intelligence?.forecastHistory?.[0] && (
        <ProgressForecastCard forecast={intelligence.forecastHistory[0]} />
      )}

      <WorksheetGeneratorCard
        childName={childName}
        intelligenceApi={intelligenceApi}
        latestWorksheet={intelligence?.generatedWorksheets?.[0]?.worksheet}
      />

      {intelligence?.parentReports?.[0] && (
        <ParentLearningReportCard report={intelligence.parentReports[0]} ageYears={ageYears} />
      )}

      {intelligence?.lastTeacherReport && (
        <TeacherReportCard
          report={intelligence.lastTeacherReport}
          onExport={() =>
            intelligenceApi.downloadTeacherReport({
              title: t("components.math_playground.teacher_report_title"),
              readiness: t("components.math_playground.school_readiness_score"),
              mastered: t("components.math_playground.teacher_mastered"),
              emerging: t("components.math_playground.teacher_emerging"),
              needsSupport: t("components.math_playground.teacher_needs_support"),
              history: t("components.math_playground.teacher_history"),
              notes: t(intelligence.lastTeacherReport!.notesKey),
              skillName: (skill) => t(`components.math_playground.parent_skill_${skill}`),
            })
          }
        />
      )}
    </div>
  );
}
