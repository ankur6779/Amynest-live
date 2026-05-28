import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { DailyUnlockItem } from "@workspace/learning-progress-engine";
import { PremiumCard, fadeUp, PREMIUM_EASE } from "./premium-polish";

interface TomorrowUnlocksCardProps {
  items: DailyUnlockItem[];
  childName?: string;
  headline?: string;
  subline?: string;
  compact?: boolean;
  teaser?: (title: string, section?: string) => string;
  className?: string;
  testId?: string;
}

export function TomorrowUnlocksCard({
  items,
  childName,
  headline = "Tomorrow unlocks",
  subline,
  compact = false,
  teaser,
  className,
  testId = "tomorrow-unlocks",
}: TomorrowUnlocksCardProps) {
  if (items.length === 0) return null;

  const defaultSub =
    subline ??
    (childName
      ? `Something lovely is waiting for ${childName} tomorrow.`
      : "A gentle surprise awaits tomorrow.");

  return (
    <PremiumCard testId={testId} glow className={className}>
      <div className={compact ? "p-4" : "p-5"}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-quicksand font-semibold text-sm">{headline}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{defaultSub}</p>
        <ul className="space-y-2.5">
          {items.slice(0, compact ? 3 : 4).map((item, i) => (
            <motion.li
              key={item.id}
              {...fadeUp}
              transition={{ ...PREMIUM_EASE, delay: 0.06 * i }}
              className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/[0.04] px-3 py-2.5"
            >
              <span className="text-2xl shrink-0" aria-hidden>
                {item.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{item.title}</p>
                <p className="text-xs text-primary/80 mt-0.5">
                  {teaser ? teaser(item.title, item.section) : item.description}
                </p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </PremiumCard>
  );
}

export function NextSessionUnlocks(props: {
  items: DailyUnlockItem[];
  className?: string;
  onVisible?: () => void;
  childName?: string;
}) {
  const { items, className, onVisible, childName } = props;
  const seen = useRef(false);
  useEffect(() => {
    if (items.length === 0 || seen.current) return;
    seen.current = true;
    onVisible?.();
  }, [items.length, onVisible]);

  if (items.length === 0) return null;

  return (
    <TomorrowUnlocksCard
      items={items}
      childName={childName}
      className={className}
      testId="next-session-unlocks"
    />
  );
}
