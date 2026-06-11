import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface SessionCompleteProps {
  stars: number;
  accentColor: string;
  newBadges: string[];
  onHome: () => void;
}

export function SessionComplete({ stars, accentColor, newBadges, onHome }: SessionCompleteProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      data-testid="mp-session-complete"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.06)" }}
    >
      <p className="text-4xl mb-2">⭐</p>
      <p className="text-lg font-black text-white">
        +{stars} {t("components.math_playground.stars")}
      </p>
      {newBadges.length > 0 && (
        <p className="text-xs font-bold mt-2" style={{ color: accentColor }}>
          🏅 {t("components.math_playground.new_badge")}:{" "}
          {newBadges.map((k) => t(`components.math_playground.${k}`)).join(", ")}
        </p>
      )}
      <button
        type="button"
        onClick={onHome}
        className="mt-4 px-6 py-3 rounded-2xl font-black text-sm text-white active:scale-95"
        style={{ background: `linear-gradient(135deg, ${accentColor}, hsl(var(--brand-amber-500)))` }}
      >
        {t("components.math_playground.back_to_hub")}
      </button>
    </motion.div>
  );
}
