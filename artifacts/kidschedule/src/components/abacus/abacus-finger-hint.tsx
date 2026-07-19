import { motion } from "framer-motion";

/** Animated finger cue pointing at a bead rod — visual teaching aid for V3 tutor/practice. */
export function AbacusFingerHint({
  show,
  label = "Try this bead",
}: {
  show: boolean;
  label?: string;
}) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{ y: { repeat: Infinity, duration: 1.1 }, opacity: { duration: 0.2 } }}
      className="pointer-events-none flex flex-col items-center gap-0.5"
      data-testid="abacus-finger-hint"
      aria-hidden="true"
    >
      <span className="text-2xl">👇</span>
      <span className="rounded-full bg-teal-500/90 text-white text-[10px] font-bold px-2 py-0.5">
        {label}
      </span>
    </motion.div>
  );
}

export function AbacusCoachBubble({
  text,
  celebrate,
}: {
  text: string;
  celebrate?: boolean;
}) {
  if (!text) return null;
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-teal-400/30 bg-gradient-to-br from-teal-500/15 to-cyan-500/10 px-3 py-2"
      data-testid="abacus-coach-bubble"
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-bold text-foreground leading-relaxed">
        <span aria-hidden>{celebrate ? "🎉 " : "💜 "}</span>
        {text}
      </p>
    </motion.div>
  );
}
