import { motion } from "framer-motion";
import type { MathTrickMeta } from "@workspace/math-tricks";
import { TRANSITION } from "@/lib/experience-system";
import { useReducedMotion } from "@/lib/reduced-motion";

/** Doubling / near-double — two equal finger groups with soft life. */
export function FingerGroupsVisual({ count = 6 }: { count?: number }) {
  const n = Math.min(Math.max(count, 2), 10);
  const reduced = useReducedMotion();
  return (
    <div className="flex justify-center gap-6 py-2" aria-hidden>
      {[0, 1].map((side) => (
        <div key={side} className="flex max-w-[72px] flex-wrap justify-center gap-1">
          {Array.from({ length: n }, (_, i) => (
            <motion.span
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: side === 0 ? "hsl(var(--brand-amber-400))" : "hsl(var(--brand-cyan-400))",
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                display: "inline-block",
              }}
              initial={reduced ? false : { opacity: 0, scale: 0.4 }}
              animate={
                reduced
                  ? { opacity: 1, scale: 1 }
                  : {
                      opacity: 1,
                      scale: [1, 1.12, 1],
                      y: [0, -2, 0],
                    }
              }
              transition={{
                opacity: { ...TRANSITION.springGentle, delay: i * 0.04 + side * 0.15 },
                scale: {
                  duration: 2.2,
                  delay: i * 0.05 + side * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                y: {
                  duration: 2.2,
                  delay: i * 0.05 + side * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            />
          ))}
        </div>
      ))}
      <span className="self-center text-lg font-bold text-white/50">=</span>
      <motion.span
        className="self-center text-sm font-black text-white"
        animate={reduced ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {n + n}
      </motion.span>
    </div>
  );
}

export function NumberLineVisual({ meta }: { meta: MathTrickMeta }) {
  const nl = meta.numberLine;
  const reduced = useReducedMotion();
  if (!nl) return null;
  const span = nl.to - nl.from;
  const ticks = Math.min(span + 1, 12);
  const step = span / (ticks - 1);
  const jump = nl.jumps?.[0];
  const jumpPct =
    jump != null && span > 0
      ? Math.min(100, Math.max(0, ((jump.at - nl.from) / span) * 100))
      : 50;

  return (
    <div className="px-1 py-2" aria-hidden>
      <div
        className="relative mx-2 h-8 rounded-full"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <div
          className="absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2"
          style={{ background: "rgba(245,158,11,0.5)" }}
        />
        {/* Soft hop marker */}
        <motion.span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `calc(${jumpPct}% + 8px)`,
            background: "hsl(var(--brand-amber-300))",
            boxShadow: "0 0 12px rgba(251,191,36,0.55)",
          }}
          animate={
            reduced
              ? undefined
              : { y: ["-50%", "calc(-50% - 6px)", "-50%"], scale: [1, 1.15, 1] }
          }
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        {Array.from({ length: ticks }, (_, i) => {
          const val = Math.round(nl.from + i * step);
          const pct = ticks <= 1 ? 50 : (i / (ticks - 1)) * 100;
          const isJump = jump && Math.abs(val - jump.at) <= step / 2;
          return (
            <span
              key={i}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold"
              style={{
                left: `calc(${pct}% + 8px)`,
                color: isJump ? "hsl(var(--brand-amber-300))" : "rgba(255,255,255,0.35)",
              }}
            >
              {val}
            </span>
          );
        })}
      </div>
      {jump && (
        <motion.p
          className="mt-1 text-center text-[10px] font-bold"
          style={{ color: "hsl(var(--brand-amber-300))" }}
          animate={reduced ? undefined : { opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {jump.label}
        </motion.p>
      )}
    </div>
  );
}

export function ExampleStepsVisual({ steps }: { steps: string[] }) {
  const reduced = useReducedMotion();
  if (steps.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-left"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          initial={reduced ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...TRANSITION.warm, delay: i * 0.06 }}
        >
          <span
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black"
            style={{ background: "rgba(245,158,11,0.35)", color: "hsl(var(--brand-amber-200))" }}
          >
            {i + 1}
          </span>
          <span className="text-xs font-bold leading-snug text-white/90">{step}</span>
        </motion.div>
      ))}
    </div>
  );
}
