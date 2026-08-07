import { useEffect } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  milestone: number;
  onDone: () => void;
};

export function StreakCelebration({ milestone, onDone }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const id = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-labelledby="streak-celebration-title"
      aria-live="polite"
    >
      <motion.div
        className="rounded-3xl bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300 p-8 text-center shadow-2xl max-w-sm w-full"
        initial={{ scale: 0.6, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: 2, duration: 0.5 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/25"
        >
          <Flame className="h-9 w-9 text-white" aria-hidden />
        </motion.div>
        <h2 id="streak-celebration-title" className="text-2xl font-black text-white font-quicksand">
          {t("retention.streak_milestone", "{{n}} quiet days of showing up", { n: milestone })}
        </h2>
        <p className="mt-2 text-sm text-white/90">
          {t("retention.streak_keep_going", "A steady rhythm is forming — no rush to do more.")}
        </p>
        {[...Array(12)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-2 w-2 rounded-full bg-white"
            style={{
              left: `${20 + (i % 4) * 20}%`,
              top: `${30 + Math.floor(i / 4) * 15}%`,
            }}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -80 - i * 8 }}
            transition={{ duration: 1.2, delay: i * 0.05 }}
            aria-hidden
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
