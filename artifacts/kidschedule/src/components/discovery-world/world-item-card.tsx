import { motion } from "framer-motion";
import type { WorldManifestItem } from "@workspace/world-engine";
import { cn } from "@/lib/utils";
import { CARD_VARIANTS, TOUCH_FEEDBACK, TRANSITION } from "@/lib/experience-system";

type WorldItemCardProps = {
  item: WorldManifestItem;
  onSelect: (item: WorldManifestItem) => void;
};

export function WorldItemCard({ item, onSelect }: WorldItemCardProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={TRANSITION.springGentle}
      onClick={() => onSelect(item)}
      className={cn(
        CARD_VARIANTS.premium,
        TOUCH_FEEDBACK,
        "flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(18,28,60,0.78)] text-left shadow-[0_12px_40px_rgba(0,0,0,0.28)]",
      )}
    >
      <div className="flex flex-1 items-center justify-center p-6 text-6xl">{item.emoji}</div>
      <div className="px-4 py-3">
        <p className="font-semibold text-foreground">{item.name}</p>
      </div>
    </motion.button>
  );
}
