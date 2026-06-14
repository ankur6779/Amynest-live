import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { cn } from "@/lib/utils";

const FOOD_ICONS = ["🥗", "🍎", "🥕", "🥛", "🌾", "🫐"] as const;

export const NutritionHeroParticles = memo(function NutritionHeroParticles({
  className,
}: {
  className?: string;
}) {
  const reduced = useReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: reduced ? 3 : 8 }, (_, i) => ({
        id: i,
        left: `${8 + (i * 13) % 84}%`,
        top: `${12 + (i * 19) % 72}%`,
        size: 2 + (i % 3),
        delay: (i % 5) * 0.5,
        duration: 5 + (i % 4),
        icon: FOOD_ICONS[i % FOOD_ICONS.length],
      })),
    [reduced],
  );

  if (reduced) {
    return (
      <div
        className={cn("pointer-events-none absolute inset-0 overflow-hidden opacity-20", className)}
        aria-hidden
      >
        {particles.slice(0, 3).map((p) => (
          <div
            key={p.id}
            className="absolute text-sm opacity-40"
            style={{ left: p.left, top: p.top }}
          >
            {p.icon}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      {/* Soft nutrition particles */}
      {particles.map((p) => (
        <motion.div
          key={`dot-${p.id}`}
          className="absolute rounded-full bg-gradient-to-br from-emerald-400/30 to-amber-300/20"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -12, 0],
            opacity: [0.15, 0.45, 0.15],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Floating food icons */}
      {particles.slice(0, 4).map((p) => (
        <motion.span
          key={`icon-${p.id}`}
          className="absolute text-base opacity-[0.18] select-none"
          style={{ left: p.left, top: p.top }}
          animate={{
            y: [0, -8, 0],
            rotate: [0, 4, -4, 0],
            opacity: [0.12, 0.22, 0.12],
          }}
          transition={{
            duration: p.duration + 2,
            repeat: Infinity,
            delay: p.delay + 0.3,
            ease: "easeInOut",
          }}
        >
          {p.icon}
        </motion.span>
      ))}
    </div>
  );
});
