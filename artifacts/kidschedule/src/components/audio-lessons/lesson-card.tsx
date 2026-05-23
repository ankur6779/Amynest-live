import { Clock, Lock, Play, RotateCcw } from "lucide-react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import { getLessonText, type Lesson, type LessonTier } from "@/lib/audio-lessons";

export type LessonAccess = "free-sample" | "locked" | "open";

type LessonCardProps = {
  lesson: Lesson;
  lang?: string;
  access: LessonAccess;
  tierLabel: (tier: LessonTier) => string;
  progressPercent?: number;
  isCompleted?: boolean;
  highlight?: boolean;
  disabled?: boolean;
  cta?: "play" | "continue" | "completed";
  onPress: () => void;
  cardRef?: Ref<HTMLButtonElement>;
};

export function LessonCard({
  lesson,
  lang = "en",
  access,
  tierLabel,
  progressPercent = 0,
  isCompleted = false,
  highlight = false,
  disabled = false,
  cta = "play",
  onPress,
  cardRef,
}: LessonCardProps) {
  const { t } = useTranslation();
  const text = getLessonText(lesson, lang);
  const isLocked = access === "locked";
  const isFree = access === "free-sample";

  const ctaLabel =
    cta === "continue"
      ? t("pages.audio_lessons.continue")
      : cta === "completed"
        ? t("pages.audio_lessons.completed")
        : t("pages.audio_lessons.play");

  return (
    <button
      ref={cardRef}
      type="button"
      data-testid={`lesson-card-${lesson.id}`}
      onClick={onPress}
      disabled={disabled || (cta === "completed" && !isLocked)}
      style={{
        textAlign: "left",
        background: highlight
          ? "rgba(52,211,153,0.08)"
          : isLocked
            ? "rgba(255,255,255,0.03)"
            : "rgba(255,255,255,0.06)",
        border: highlight
          ? "1px solid rgba(52,211,153,0.45)"
          : isLocked
            ? "1px solid rgba(139,92,246,0.12)"
            : isFree
              ? "1px solid rgba(52,211,153,0.35)"
              : "1px solid rgba(139,92,246,0.25)",
        borderRadius: 16,
        padding: 14,
        cursor: disabled ? "wait" : isLocked ? "pointer" : "pointer",
        opacity: disabled ? 0.7 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        color: "#fff",
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isLocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backdropFilter: "blur(2px)",
            background: "rgba(15,12,41,0.35)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", position: "relative", zIndex: 2 }}>
        <div
          style={{
            fontSize: 28,
            lineHeight: 1,
            width: 46,
            height: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isLocked ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.15)",
            borderRadius: 12,
            flexShrink: 0,
          }}
        >
          {isLocked ? <Lock size={18} color="hsl(var(--brand-amber-300))" /> : lesson.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                fontFamily: "Quicksand, sans-serif",
                color: isLocked ? "rgba(255,255,255,0.7)" : "#fff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {text.title}
            </h3>
            {isFree && (
              <span
                style={{
                  flexShrink: 0,
                  background: "linear-gradient(135deg, hsl(var(--brand-emerald-600)), hsl(var(--brand-emerald-500)))",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "2px 7px",
                  borderRadius: 999,
                }}
              >
                {t("pages.audio_lessons.free")}
              </span>
            )}
          </div>

          <p
            style={{
              margin: "4px 0 8px",
              color: isLocked ? "rgba(199,192,232,0.55)" : "#c7c0e8",
              fontSize: 12,
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
            }}
          >
            {text.description}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: isLocked ? "rgba(169,159,217,0.5)" : "#a99fd9",
            }}
          >
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                background:
                  lesson.tier === "quick"
                    ? "rgba(16,185,129,0.2)"
                    : lesson.tier === "deep"
                      ? "rgba(251,191,36,0.15)"
                      : "rgba(139,92,246,0.2)",
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              {tierLabel(lesson.tier)}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Clock size={11} /> {lesson.durationMin} {t("pages.audio_lessons.min")}
            </span>
          </div>
        </div>
      </div>

      {(progressPercent > 0 || isCompleted) && (
        <div style={{ position: "relative", zIndex: 2 }}>
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
                width: `${isCompleted ? 100 : progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, hsl(var(--brand-emerald-500)), hsl(var(--brand-violet-500)))",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", position: "relative", zIndex: 2 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 800,
            padding: "7px 14px",
            borderRadius: 999,
            background:
              cta === "completed"
                ? "rgba(255,255,255,0.08)"
                : "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
            color: cta === "completed" ? "rgba(169,159,217,0.9)" : "#fff",
            opacity: cta === "completed" ? 0.85 : 1,
          }}
        >
          {cta === "continue" ? <RotateCcw size={13} /> : cta === "completed" ? null : <Play size={13} />}
          {ctaLabel}
        </span>
      </div>
    </button>
  );
}
