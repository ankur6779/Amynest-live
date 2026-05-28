import { Sun } from "lucide-react";
import { motion } from "framer-motion";
import type { DailyUnlockItem } from "@workspace/learning-progress-engine";
import { PremiumCard, fadeUp, PREMIUM_EASE } from "./premium-polish";

interface DailyFreshnessCardProps {
  items: DailyUnlockItem[];
  isRevisionDay?: boolean;
  className?: string;
}

export function DailyFreshnessCard({
  items,
  isRevisionDay = false,
  className,
}: DailyFreshnessCardProps) {
  if (items.length === 0) return null;

  return (
    <PremiumCard testId="daily-freshness-card" className={className}>
      <div className="p-4">
        <h3 className="text-sm font-quicksand font-semibold flex items-center gap-2 mb-3">
          <Sun className="h-4 w-4 text-amber-500" />
          Fresh for today
          {isRevisionDay && (
            <span className="text-[10px] font-medium text-muted-foreground ml-1">
              · gentle review
            </span>
          )}
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.slice(0, 4).map((item, i) => (
            <motion.li
              key={item.id}
              {...fadeUp}
              transition={{ ...PREMIUM_EASE, delay: i * 0.04 }}
              className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2 text-sm"
            >
              <span aria-hidden>{item.emoji}</span>
              <span className="truncate font-medium">{item.title}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </PremiumCard>
  );
}
