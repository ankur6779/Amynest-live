import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";

export function PlanLoadingSkeleton() {
  const reduced = useReducedMotion();

  return (
    <div className="space-y-4" role="status" aria-label="Generating meal plan">
      <div className="flex gap-2">
        {[...Array(7)].map((_, i) => (
          <motion.div
            key={i}
            className="h-7 w-10 rounded-full bg-white/[0.06] border border-white/[0.08]"
            animate={reduced ? undefined : { opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.08 }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 h-28"
            animate={reduced ? undefined : { opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground nutrition-plan-generating">
        Crafting your plan…
      </p>
    </div>
  );
}
