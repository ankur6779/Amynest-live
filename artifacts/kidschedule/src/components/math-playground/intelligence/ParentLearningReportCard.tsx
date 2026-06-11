import { useTranslation } from "react-i18next";
import type { ParentLearningReport } from "@workspace/math-playground";

export function ParentLearningReportCard({
  report,
  ageYears,
}: {
  report: ParentLearningReport;
  ageYears: number;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(167,139,250,0.2)",
      }}
    >
      <p className="text-[10px] font-bold text-violet-300/80 uppercase mb-1">
        {t("components.math_playground.parent_report_title")}
      </p>
      <p className="text-xs text-white/80 leading-snug mb-2">
        {t(`components.math_playground.${report.summaryKey}`)}
      </p>

      <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
        <div>
          <p className="text-white/45">{t("components.math_playground.skill_age_label")}</p>
          <p className="font-bold text-white">{report.estimatedSkillAgeYears} {t("components.math_playground.years")}</p>
        </div>
        <div>
          <p className="text-white/45">{t("components.math_playground.child_age_label")}</p>
          <p className="font-bold text-white">{ageYears} {t("components.math_playground.years")}</p>
        </div>
      </div>

      {report.strengths.length > 0 && (
        <p className="text-[10px] text-white/60">
          {t("components.math_playground.report_strengths")}:{" "}
          {report.strengths.map((s) => t(`components.math_playground.parent_skill_${s}`)).join(", ")}
        </p>
      )}
      {report.areasToImprove.length > 0 && (
        <p className="text-[10px] text-white/50 mt-1">
          {t("components.math_playground.report_improve")}:{" "}
          {report.areasToImprove.map((s) => t(`components.math_playground.parent_skill_${s}`)).join(", ")}
        </p>
      )}
    </div>
  );
}
