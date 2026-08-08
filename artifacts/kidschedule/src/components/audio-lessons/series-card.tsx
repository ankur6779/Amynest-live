import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  totalSeriesMinutes,
  type LessonSeries,
  type SeriesProgress,
} from "@/lib/audio-lessons";
import { livingPremiumBadge } from "@/lib/amy-audio/living-room";

type SeriesCardProps = {
  series: LessonSeries;
  progress: SeriesProgress;
  locked?: boolean;
  disabled?: boolean;
  onStart: () => void;
  onUnlock?: () => void;
  living?: boolean;
};

export function SeriesCard({
  series,
  progress,
  locked = false,
  disabled = false,
  onStart,
  onUnlock,
  living = false,
}: SeriesCardProps) {
  const { t } = useTranslation();
  const totalMin = totalSeriesMinutes(series);
  const isComplete = progress.percent === 100;
  const hasStarted = progress.completed > 0 && !isComplete;

  const ctaKey = isComplete
    ? "pages.audio_lessons.series_complete"
    : hasStarted
      ? "pages.audio_lessons.series_continue"
      : "pages.audio_lessons.series_start";

  return (
    <div
      data-testid={`series-card-${series.id}`}
      className={living ? "aaudio-soft-card" : undefined}
      style={{
        borderRadius: 16,
        border: living ? undefined : "1px solid rgba(139,92,246,0.35)",
        background: living ? undefined : "rgba(139,92,246,0.08)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {locked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backdropFilter: "blur(3px)",
            background: "rgba(15,12,41,0.45)",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            className={living ? "aaudio-soft-badge" : undefined}
            style={
              living
                ? {
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                  }
                : {
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(251,191,36,0.15)",
              border: "1px solid rgba(251,191,36,0.45)",
              color: "hsl(var(--brand-amber-300))",
              fontSize: 11,
              fontWeight: 800,
            }
            }
          >
            {!living && <Lock size={12} />}
            {living ? livingPremiumBadge() : t("pages.audio_lessons.premium")}
          </div>
        </div>
      )}

      <div style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(139,92,246,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {series.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 800,
              fontFamily: "Quicksand, sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {series.title.en}
          </h3>
          <p
            style={{
              margin: "4px 0 8px",
              fontSize: 12,
              color: "#c7c0e8",
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
            }}
          >
            {series.description.en}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#a99fd9" }}>
            {t("pages.audio_lessons.series_meta", {
              parts: series.lessonIds.length,
              minutes: totalMin,
            })}
          </p>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: "rgba(139,92,246,0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress.percent}%`,
                height: "100%",
                background: "linear-gradient(90deg, hsl(var(--brand-emerald-500)), hsl(var(--brand-violet-500)))",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: "0 14px 14px" }}>
        <button
          type="button"
          onClick={() => {
            if (locked) {
              onUnlock?.();
              return;
            }
            onStart();
          }}
          disabled={disabled || isComplete}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 999,
            border: "none",
            background: isComplete
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            cursor: isComplete ? "default" : "pointer",
            opacity: isComplete ? 0.6 : 1,
          }}
        >
          {t(ctaKey)}
        </button>
      </div>
    </div>
  );
}
