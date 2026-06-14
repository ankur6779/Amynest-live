import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { scoreChartFill } from "@/features/nutrition/lib/score-colors";
import { useNutritionTrackMeta } from "@/features/nutrition/hooks/use-nutrition-track-meta";

const CHART_HEIGHT = 56;
const CHART_WIDTH = 280;

export function WeeklyTrendChart({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { weeklyTrend } = useNutritionTrackMeta();

  if (weeklyTrend.length === 0) return null;

  const maxScore = 100;
  const barWidth = CHART_WIDTH / weeklyTrend.length - 6;
  const hasActivity = weeklyTrend.some((d) => d.checked > 0);
  if (!hasActivity) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.08] bg-white/[0.03]",
        compact ? "p-2.5" : "p-3",
      )}
    >
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        {t("nutrition_hub.track.weekly_trend")}
      </p>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 20}`}
        className="w-full h-auto"
        role="img"
        aria-label={t("nutrition_hub.track.weekly_trend")}
      >
        {weeklyTrend.map((day, i) => {
          const x = i * (CHART_WIDTH / weeklyTrend.length) + 4;
          const barH = day.checked > 0 ? Math.max(4, (day.score / maxScore) * CHART_HEIGHT) : 2;
          const y = CHART_HEIGHT - barH;
          const label = day.dateKey.slice(8);

          return (
            <g key={day.dateKey}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={day.checked > 0 ? scoreChartFill(day.score) : "rgba(255,255,255,0.1)"}
                opacity={day.checked > 0 ? 0.85 : 0.4}
              />
              <text
                x={x + barWidth / 2}
                y={CHART_HEIGHT + 14}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
