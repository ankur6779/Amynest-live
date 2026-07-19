import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { cn } from "@/lib/utils";

export const HealthLabParticles = memo(function HealthLabParticles({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: reduced ? 2 : 4 }, (_, i) => ({
        id: i,
        left: `${(i * 17 + 7) % 100}%`,
        top: `${(i * 23 + 11) % 100}%`,
        size: 2 + (i % 4),
        delay: (i % 6) * 0.4,
        duration: 4 + (i % 5),
      })),
    [reduced],
  );

  if (reduced) {
    return (
      <div
        className={cn("pointer-events-none absolute inset-0 overflow-hidden opacity-30", className)}
        aria-hidden
      >
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-violet-400/40"
            style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-gradient-to-br from-violet-400/60 to-cyan-300/40"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            boxShadow: "0 0 8px rgba(167,139,250,0.5)",
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
});
