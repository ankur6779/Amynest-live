import { useTranslation } from "react-i18next";
import type { TeacherReportSummary } from "@workspace/math-playground";

export function TeacherReportCard({
  report,
  onExport,
}: {
  report: TeacherReportSummary;
  onExport: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(148,163,184,0.2)",
      }}
    >
      <p className="text-[10px] font-bold text-slate-300/80 uppercase mb-1">
        {t("components.math_playground.teacher_report_title")}
      </p>
      <p className="text-[10px] text-white/60 mb-2">
        {report.skillsMastered.length} {t("components.math_playground.teacher_mastered").toLowerCase()} ·{" "}
        {report.skillsNeedingSupport.length} {t("components.math_playground.teacher_needs_support").toLowerCase()}
      </p>
      <button
        type="button"
        data-testid="mp-teacher-export"
        onClick={onExport}
        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
        style={{ background: "rgba(255,255,255,0.1)", color: "white" }}
      >
        {t("components.math_playground.teacher_export_pdf")}
      </button>
    </div>
  );
}
