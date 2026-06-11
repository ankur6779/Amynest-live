import { useTranslation } from "react-i18next";
import type { SchoolReadinessSnapshot } from "@workspace/math-playground";

export function SchoolReadinessCard({ readiness }: { readiness: SchoolReadinessSnapshot }) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(99,102,241,0.08)",
        border: "1px solid rgba(99,102,241,0.2)",
      }}
    >
      <p className="text-[10px] font-bold text-indigo-300/80 uppercase mb-1">
        {t("components.math_playground.school_readiness_title")}
      </p>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-black text-white">{readiness.score}</span>
        <span className="text-[10px] text-white/50 pb-1">/100</span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
          style={{ background: "rgba(99,102,241,0.15)", color: "hsl(var(--brand-indigo-300))" }}
        >
          {t(`components.math_playground.readiness_band_${readiness.band}`)}
        </span>
      </div>
    </div>
  );
}
