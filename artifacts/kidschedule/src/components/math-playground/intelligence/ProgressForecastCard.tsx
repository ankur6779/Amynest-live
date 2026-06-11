import { useTranslation } from "react-i18next";
import type { ProgressForecastSnapshot } from "@workspace/math-playground";

export function ProgressForecastCard({ forecast }: { forecast: ProgressForecastSnapshot }) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(52,211,153,0.15)",
      }}
    >
      <p className="text-[10px] font-bold text-emerald-300/80 uppercase mb-1">
        {t("components.math_playground.forecast_title")}
      </p>
      <p className="text-[10px] text-white/70">
        {t("components.math_playground.forecast_current")}: {forecast.currentReadiness}
      </p>
      <div className="flex gap-3 mt-1 text-[10px] font-bold text-white/80">
        <span>30d: {forecast.forecast30}</span>
        <span>60d: {forecast.forecast60}</span>
        <span>90d: {forecast.forecast90}</span>
      </div>
      <p className="text-[9px] text-white/40 mt-1">
        {t(`components.math_playground.${forecast.assumptionsKey}`)}
      </p>
    </div>
  );
}
