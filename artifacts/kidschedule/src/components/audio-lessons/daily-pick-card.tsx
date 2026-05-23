import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLessonById, getLessonText } from "@/lib/audio-lessons";
import type { DailyPickCard } from "@workspace/amy-intelligence";

type DailyPickCardProps = {
  card: DailyPickCard;
  onPlay: () => void;
};

export function AmyDailyPickCard({ card, onPlay }: DailyPickCardProps) {
  const { t } = useTranslation();
  const lesson = getLessonById(card.lessonId);
  if (!lesson) return null;
  const text = getLessonText(lesson);

  return (
    <motion.button
      type="button"
      data-testid="amy-daily-pick"
      whileTap={{ scale: 0.98 }}
      onClick={onPlay}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "16px",
        borderRadius: 18,
        border: "1px solid rgba(52,211,153,0.4)",
        background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(139,92,246,0.1))",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "rgba(52,211,153,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Sparkles size={22} color="hsl(var(--brand-emerald-300))" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "hsl(var(--brand-emerald-300))" }}>
          {t("pages.audio_lessons.daily_pick")}
        </p>
        <p
          style={{
            margin: "2px 0 4px",
            fontSize: 15,
            fontWeight: 800,
            fontFamily: "Quicksand, sans-serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {text.title}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#a99fd9" }}>
          {lesson.durationMin} {t("pages.audio_lessons.min")} · {lesson.emoji}
        </p>
      </div>
    </motion.button>
  );
}
