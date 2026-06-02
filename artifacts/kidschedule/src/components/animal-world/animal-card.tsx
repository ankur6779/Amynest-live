import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import type { Animal } from "@workspace/animal-world";
import { cn } from "@/lib/utils";
import { CARD_VARIANTS, TOUCH_FEEDBACK, TRANSITION } from "@/lib/experience-system";
import { AnimalHeroImage } from "./animal-hero-image";

type AnimalCardProps = {
  animal: Animal;
  onSelect: (animal: Animal) => void;
  large?: boolean;
};

export function AnimalCard({ animal, onSelect, large }: AnimalCardProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <motion.button
      type="button"
      layout
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={TRANSITION.springGentle}
      onClick={() => onSelect(animal)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className={cn(
        CARD_VARIANTS.premium,
        TOUCH_FEEDBACK,
        "group relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(18,28,60,0.78)] text-left shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl",
        large && "min-h-[220px]",
      )}
      aria-label={animal.name}
    >
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-white/[0.06] via-transparent to-black/20 p-4">
        <AnimalHeroImage animal={animal} className={cn("transition-transform duration-300", pressed ? "scale-95" : "group-hover:scale-105")} />
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div>
          <p className="text-base font-semibold tracking-tight text-foreground">{animal.name}</p>
          <p className="text-xs text-muted-foreground">{animal.emoji}</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-primary">
          <Volume2 className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </motion.button>
  );
}
