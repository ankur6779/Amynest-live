import { Link } from "wouter";
import { ChevronRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { AdaptiveRecommendation } from "@workspace/learning-progress-engine";
import { cn } from "@/lib/utils";
import { HUB_BODY, HUB_CARD_TITLE, HUB_SECTION_TITLE, HUB_TILE } from "@/lib/parent-hub-premium";
import { PremiumCard, fadeUp, PREMIUM_EASE } from "./premium-polish";

export function AdaptiveRecommendationsCard({
  items,
  parentHub = false,
}: {
  items: AdaptiveRecommendation[];
  parentHub?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <PremiumCard
      parentHub={parentHub}
      hero={parentHub}
      testId="adaptive-recommendations"
    >
      <div className="p-4">
        <h3
          className={cn(
            "font-quicksand flex items-center gap-2 mb-3",
            parentHub ? HUB_SECTION_TITLE : "text-sm font-semibold",
          )}
        >
          <Sparkles
            className={cn(
              "h-5 w-5 text-amber-400",
              parentHub && "hub-sparkle-glow",
            )}
          />
          {parentHub ? "Amy Recommends Next" : "Amy suggests next"}
        </h3>
        <div className="space-y-2">
          {items.slice(0, 3).map((rec, i) => (
            <motion.div key={rec.id} {...(parentHub ? {} : fadeUp)} transition={{ ...PREMIUM_EASE, delay: i * 0.05 }}>
              <Link href={rec.href}>
                <div
                  className={cn(
                    parentHub
                      ? HUB_TILE
                      : "flex items-start gap-3 rounded-xl border border-border/50 px-3 py-2.5 hover:border-primary/25 hover:bg-primary/[0.03] active:scale-[0.99] transition-all",
                  )}
                >
                  <span className="text-xl shrink-0" aria-hidden>
                    {rec.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={parentHub ? HUB_CARD_TITLE : "text-sm font-medium"}>{rec.title}</p>
                    <p className={parentHub ? HUB_BODY : "text-xs text-muted-foreground mt-0.5 leading-relaxed"}>
                      {rec.reason}
                    </p>
                  </div>
                  {rec.priority === "high" && !parentHub && (
                    <span className="text-[10px] font-medium text-primary shrink-0">Focus</span>
                  )}
                  {parentHub && (
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
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
