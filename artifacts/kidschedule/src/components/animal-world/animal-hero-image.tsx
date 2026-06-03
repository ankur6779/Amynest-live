import { useState } from "react";
import type { Animal, AnimalHeroVariant } from "@workspace/animal-world";
import { resolveAnimalHeroImageUrl } from "@workspace/animal-world";
import { cn } from "@/lib/utils";

type AnimalHeroImageProps = {
  animal: Animal;
  className?: string;
  eager?: boolean;
  variant?: AnimalHeroVariant;
};

export function AnimalHeroImage({ animal, className, eager, variant = "cartoon" }: AnimalHeroImageProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveAnimalHeroImageUrl(animal, variant);

  if (failed) {
    return (
      <span
        className={cn(
          "select-none text-[clamp(3rem,12vw,5.5rem)] leading-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
          className,
        )}
        aria-hidden
      >
        {animal.emoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(
        "max-h-[min(42vw,180px)] w-auto max-w-[85%] object-contain",
        className,
      )}
    />
  );
}
