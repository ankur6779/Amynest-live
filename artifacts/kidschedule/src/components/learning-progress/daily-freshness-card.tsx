import { Sun } from "lucide-react";
import { motion } from "framer-motion";
import type { DailyUnlockItem } from "@workspace/learning-progress-engine";
import { cn } from "@/lib/utils";
import { HUB_SECTION_TITLE, hubChipTint, hubChipTintFromEmoji } from "@/lib/parent-hub-premium";
import { PremiumCard, fadeUp, PREMIUM_EASE } from "./premium-polish";

interface DailyFreshnessCardProps {
  items: DailyUnlockItem[];
  isRevisionDay?: boolean;
  className?: string;
  parentHub?: boolean;
}

export function DailyFreshnessCard({
  items,
  isRevisionDay = false,
  className,
  parentHub = false,
}: DailyFreshnessCardProps) {
  if (items.length === 0) return null;

  return (
    <PremiumCard
      parentHub={parentHub}
      testId="daily-freshness-card"
      className={className}
    >
      <div className="p-4">
        <h3
          className={cn(
            "font-quicksand flex items-center gap-2 mb-3",
            parentHub ? HUB_SECTION_TITLE : "text-sm font-semibold",
          )}
        >
          <Sun className="h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]" />
          Fresh for today
          {isRevisionDay && (
            <span className="text-[10px] font-medium text-muted-foreground ml-1 opacity-75">
              · gentle review
            </span>
          )}
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.slice(0, 4).map((item, i) => (
            <motion.li
              key={item.id}
              {...(parentHub ? {} : fadeUp)}
              transition={{ ...PREMIUM_EASE, delay: i * 0.04 }}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-all duration-[220ms] ease-[ease] active:scale-[1.02]",
                parentHub
                  ? cn("border bg-white/[0.05]", hubChipTint(item.section), hubChipTintFromEmoji(item.emoji))
                  : "rounded-xl bg-primary/5 border border-primary/10",
              )}
            >
              <span aria-hidden>{item.emoji}</span>
              <span className="truncate">{item.title}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </PremiumCard>
  );
}
