import { motion } from "framer-motion";
import { Play, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLessonById, getLessonText } from "@/lib/audio-lessons";
import type { QuickPlayCard } from "@workspace/amy-intelligence";

type QuickPlayCardProps = {
  card: QuickPlayCard;
  onPlay: () => void;
};

export function AmyQuickPlayCard({ card, onPlay }: QuickPlayCardProps) {
  const { t } = useTranslation();
  const lesson = getLessonById(card.lessonId);
  if (!lesson) return null;
  const text = getLessonText(lesson);
  const isContinue = card.action === "continue";

  return (
    <motion.button
      type="button"
      data-testid="amy-quick-play"
      whileTap={{ scale: 0.98 }}
      onClick={onPlay}
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        textAlign: "left",
        padding: "16px",
        borderRadius: 18,
        border: "1px solid rgba(139,92,246,0.45)",
        background: "linear-gradient(135deg, rgba(139,92,246,0.22), rgba(236,72,153,0.14))",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          flexShrink: 0,
        }}
      >
        {lesson.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "hsl(var(--brand-violet-300))" }}>
          {t("pages.audio_lessons.quick_play")}
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
          {t(`pages.audio_lessons.amy_reason_${card.reason}`, { defaultValue: t("pages.audio_lessons.amy_reason_default") })}
        </p>
      </div>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          fontWeight: 800,
          padding: "8px 10px",
          borderRadius: 999,
          background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {isContinue ? <RotateCcw size={13} /> : <Play size={13} />}
        {isContinue ? t("pages.audio_lessons.continue") : t("pages.audio_lessons.play")}
      </span>
    </motion.button>
  );
}
