import { motion } from "framer-motion";
import { Baby, Blocks, BookOpen, GraduationCap, Users, Sparkles, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { lessonCountForNavGroup, type AgeTileMeta } from "@/lib/audio-lessons-nav";
import { livingExploreCta } from "@/lib/amy-audio/living-room";

const ICONS = {
  baby: Baby,
  blocks: Blocks,
  book: BookOpen,
  school: GraduationCap,
  users: Users,
  sparkles: Sparkles,
} as const;

type AgeTileProps = {
  meta: AgeTileMeta;
  onExplore: () => void;
  living?: boolean;
};

export function AgeTile({ meta, onExplore, living = false }: AgeTileProps) {
  const { t } = useTranslation();
  const Icon = ICONS[meta.iconName];
  const count = lessonCountForNavGroup(meta.group);

  return (
    <motion.button
      type="button"
      onClick={onExplore}
      data-testid={`age-tile-${meta.group}`}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={living ? "aaudio-soft-tile" : undefined}
      style={
        living
          ? {
              textAlign: "left",
              borderRadius: 18,
              padding: 16,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 148,
              minWidth: 0,
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              position: "relative",
              overflow: "hidden",
            }
          : {
        textAlign: "left",
        border: "1px solid rgba(139,92,246,0.28)",
        borderRadius: 18,
        padding: 16,
        background: meta.gradient,
        backdropFilter: "blur(6px)",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 148,
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }
      }
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.04)",
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={22} color="hsl(var(--brand-violet-200))" />
        </div>
        <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
      </div>
      <div>
        <h3
          style={{
            margin: "0 0 4px",
            fontSize: 15,
            fontWeight: 800,
            fontFamily: "Quicksand, sans-serif",
          }}
        >
          {t(meta.labelKey)}
        </h3>
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "rgba(199,192,232,0.9)", lineHeight: 1.4 }}>
          {t(meta.subtitleKey)}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "rgba(169,159,217,0.85)" }}>
          {t("pages.audio_lessons.lessons_available", { count })}
        </p>
      </div>
      <span
        style={{
          alignSelf: "flex-start",
          marginTop: "auto",
          fontSize: 12,
          fontWeight: 800,
          padding: "6px 12px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {living ? livingExploreCta() : t("pages.audio_lessons.explore")}
      </span>
    </motion.button>
  );
}
