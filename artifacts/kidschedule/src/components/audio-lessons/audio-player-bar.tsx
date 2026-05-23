import { motion } from "framer-motion";
import { ChevronUp, Loader2, Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLessonText, type Lesson } from "@/lib/audio-lessons";

type AudioPlayerBarProps = {
  lesson: Lesson;
  lang?: string;
  playing: boolean;
  loading?: boolean;
  onTogglePlay: () => void;
  onExpand: () => void;
};

export function AudioPlayerBar({
  lesson,
  lang = "en",
  playing,
  loading = false,
  onTogglePlay,
  onExpand,
}: AudioPlayerBarProps) {
  const { t } = useTranslation();
  const text = getLessonText(lesson, lang);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.22 }}
      data-testid="audio-player-bar"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        padding: "10px 12px calc(10px + env(safe-area-inset-bottom, 0px))",
        background: "linear-gradient(180deg, rgba(15,12,41,0.2) 0%, rgba(15,12,41,0.95) 40%)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(139,92,246,0.35)",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.15))",
          border: "1px solid rgba(139,92,246,0.35)",
        }}
      >
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {!playing ? (
            <Play size={18} style={{ marginLeft: 2 }} />
          ) : loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Pause size={18} />
          )}
        </button>

        <button
          type="button"
          onClick={onExpand}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 800,
              fontFamily: "Quicksand, sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {text.title}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#a99fd9" }}>
            {t("pages.audio_lessons.now_playing")}
          </p>
        </button>

        <button
          type="button"
          onClick={onExpand}
          aria-label={t("pages.audio_lessons.expand_player")}
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "1px solid rgba(139,92,246,0.35)",
            background: "rgba(255,255,255,0.08)",
            color: "hsl(var(--brand-violet-300))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ChevronUp size={18} />
        </button>
      </div>
    </motion.div>
  );
}
