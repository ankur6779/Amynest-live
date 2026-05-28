import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { AdaptiveRecommendation } from "@workspace/learning-progress-engine";
import { PremiumCard, fadeUp, PREMIUM_EASE } from "./premium-polish";

export function AdaptiveRecommendationsCard({
  items,
}: {
  items: AdaptiveRecommendation[];
}) {
  if (items.length === 0) return null;
  return (
    <PremiumCard testId="adaptive-recommendations">
      <div className="p-4">
        <h3 className="text-sm font-quicksand font-semibold flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          Amy suggests next
        </h3>
        <div className="space-y-2">
          {items.slice(0, 3).map((rec, i) => (
            <motion.div key={rec.id} {...fadeUp} transition={{ ...PREMIUM_EASE, delay: i * 0.05 }}>
              <Link href={rec.href}>
                <div className="flex items-start gap-3 rounded-xl border border-border/50 px-3 py-2.5 hover:border-primary/25 hover:bg-primary/[0.03] active:scale-[0.99] transition-all">
                  <span className="text-xl shrink-0" aria-hidden>
                    {rec.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{rec.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.reason}</p>
                  </div>
                  {rec.priority === "high" && (
                    <span className="text-[10px] font-medium text-primary shrink-0">Focus</span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </PremiumCard>
  );
}
