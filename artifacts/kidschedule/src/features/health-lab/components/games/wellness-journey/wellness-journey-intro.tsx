import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { HealthLabAmyCharacter } from "../../health-lab-amy-character";

export const WellnessJourneyIntro = memo(function WellnessJourneyIntro({
  score,
  onComplete,
}: {
  score: number;
  onComplete: () => void;
}) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (reduced) {
      onComplete();
      return;
    }
    const timers = [
      setTimeout(() => setStep(1), 600),
      setTimeout(() => setStep(2), 1400),
      setTimeout(() => setStep(3), 2400),
      setTimeout(() => onComplete(), 3400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced, onComplete]);

  useEffect(() => {
    if (step < 2 || reduced) return;
    const target = score;
    const start = Date.now();
    const id = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 900);
      setDisplayScore(Math.round(target * t));
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [step, score, reduced]);

  if (reduced) return null;

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-indigo-950/95 px-6 backdrop-blur-md"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {[...Array(12)].map((_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute text-lg"
          style={{ left: `${(i * 19) % 90}%`, top: `${(i * 23) % 80}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
          aria-hidden
        >
          ✨
        </motion.span>
      ))}

      <AnimatePresence mode="wait">
        {step >= 0 && step < 3 && (
          <motion.div key="amy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <HealthLabAmyCharacter action="report" size="lg" mood="happy" />
          </motion.div>
        )}
      </AnimatePresence>

      {step >= 1 && (
        <motion.p
          className="mt-4 text-5xl"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          aria-hidden
        >
          📖
        </motion.p>
      )}

      {step >= 2 && (
        <motion.div className="mt-6 text-center" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <p className="font-mono text-6xl font-bold tabular-nums text-amber-300">{displayScore}</p>
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-violet-200/70">Wellness Power</p>
        </motion.div>
      )}

      {step >= 3 && (
        <motion.p
          className="mt-6 text-lg font-semibold text-cyan-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Opening your adventure passport…
        </motion.p>
      )}
    </motion.div>
  );
});
