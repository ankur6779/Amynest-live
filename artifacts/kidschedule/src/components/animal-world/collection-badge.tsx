import type { AnimalCollectionStatus, ExplorerTier } from "@workspace/animal-world";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<AnimalCollectionStatus, string> = {
  locked: "",
  discovered: "New",
  unlocked: "Unlocked",
  mastered: "Master",
};

const TIER_EMOJI: Record<ExplorerTier, string> = {
  none: "",
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
};

export function CollectionBadge({
  status,
  className,
}: {
  status: AnimalCollectionStatus;
  className?: string;
}) {
  if (status === "locked") return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        status === "mastered" && "bg-amber-400/20 text-amber-200",
        status === "unlocked" && "bg-emerald-400/15 text-emerald-200",
        status === "discovered" && "bg-sky-400/15 text-sky-200",
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ExplorerTierBadge({ tier }: { tier: ExplorerTier }) {
  if (tier === "none") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold capitalize">
      {TIER_EMOJI[tier]} {tier} Explorer
    </span>
  );
}
