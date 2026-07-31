import { useState } from "react";
import { Volume2 } from "lucide-react";
import type { Animal } from "@workspace/animal-world";
import { cn } from "@/lib/utils";
import { CARD_VARIANTS } from "@/lib/experience-system";
import {
  ObjectBounce,
  SoundWorldTiltCard,
} from "@/components/discovery-world/sound-world-motion";
import { ObjectLife } from "@/components/discovery-world/object-life";
import { AnimalHeroImage } from "./animal-hero-image";

type AnimalCardProps = {
  animal: Animal;
  onSelect: (animal: Animal) => void;
  large?: boolean;
  idleIndex?: number;
};

export function AnimalCard({ animal, onSelect, large, idleIndex = 0 }: AnimalCardProps) {
  const [bounce, setBounce] = useState(false);

  return (
    <SoundWorldTiltCard
      idleIndex={idleIndex}
      ariaLabel={animal.name}
      onClick={() => {
        setBounce(true);
        window.setTimeout(() => setBounce(false), 400);
        onSelect(animal);
      }}
      className={cn(
        CARD_VARIANTS.premium,
        "group relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(18,28,60,0.78)] text-left shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl",
        large && "min-h-[220px]",
      )}
    >
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-white/[0.06] via-transparent to-black/20 p-4">
        <ObjectLife seed={idleIndex + animal.id.length}>
          <ObjectBounce active={bounce}>
            <AnimalHeroImage
              animal={animal}
              className="transition-transform duration-300 group-hover:scale-105"
            />
          </ObjectBounce>
        </ObjectLife>
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
    </SoundWorldTiltCard>
  );
}
