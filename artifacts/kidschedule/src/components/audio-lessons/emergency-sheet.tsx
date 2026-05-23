import { motion, AnimatePresence } from "framer-motion";
import { Moon, Volume2, X, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EmergencyType } from "@workspace/amy-intelligence";

const EMERGENCY_OPTIONS: Array<{
  type: EmergencyType;
  icon: typeof Zap;
  labelKey: string;
  color: string;
}> = [
  { type: "tantrum", icon: Zap, labelKey: "pages.audio_lessons.emergency_tantrum", color: "hsl(var(--brand-amber-300))" },
  { type: "sleep", icon: Moon, labelKey: "pages.audio_lessons.emergency_sleep", color: "hsl(var(--brand-violet-300))" },
  { type: "crying", icon: Volume2, labelKey: "pages.audio_lessons.emergency_crying", color: "hsl(var(--brand-pink-300))" },
];

type EmergencySheetProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: EmergencyType) => void;
};

export function EmergencySheet({ open, onClose, onSelect }: EmergencySheetProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(8,5,25,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={onClose}
          data-testid="emergency-sheet"
        >
          <motion.div
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              background: "linear-gradient(180deg, #1a1040 0%, #0f0c29 100%)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: "16px 20px 28px",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: "Quicksand, sans-serif" }}>
                {t("pages.audio_lessons.emergency_title")}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("pages.audio_lessons.close")}
                style={{
                  color: "hsl(var(--brand-violet-300))",
                  background: "rgba(167,139,250,0.15)",
                  borderRadius: 999,
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#c7c0e8" }}>
              {t("pages.audio_lessons.emergency_subtitle")}
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {EMERGENCY_OPTIONS.map(({ type, icon: Icon, labelKey, color }) => (
                <button
                  key={type}
                  type="button"
                  data-testid={`emergency-${type}`}
                  onClick={() => onSelect(type)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1px solid rgba(139,92,246,0.35)",
                    background: "rgba(139,92,246,0.1)",
                    color: "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Icon size={20} color={color} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{t(labelKey)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
