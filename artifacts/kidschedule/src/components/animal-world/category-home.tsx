import { useMemo } from "react";
import {
  ANIMAL_CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  getAnimalsByCategory,
  type Animal,
  type AnimalCategory,
} from "@workspace/animal-world";
import { cn } from "@/lib/utils";
import { warmAnimalWorldOnOpen } from "@/lib/animal-world-audio-warmup";
import { trackAnimalWorldEvent } from "@/lib/animal-world-telemetry";
import { AnimalCard } from "./animal-card";
import { VirtualizedGrid, useResponsiveGridColumns } from "./virtualized-grid";

type CategoryHomeProps = {
  onSelectAnimal: (animal: Animal) => void;
  activeCategory: AnimalCategory | "all";
  onCategoryChange: (category: AnimalCategory | "all") => void;
};

export function CategoryHome({
  onSelectAnimal,
  activeCategory,
  onCategoryChange,
}: CategoryHomeProps) {
  const columns = useResponsiveGridColumns();

  const animals = useMemo(() => {
    if (activeCategory === "all") {
      return ANIMAL_CATEGORIES.flatMap((cat) => getAnimalsByCategory(cat));
    }
    return getAnimalsByCategory(activeCategory);
  }, [activeCategory]);

  const onCategoryTap = (category: AnimalCategory | "all") => {
    onCategoryChange(category);
    if (category !== "all") {
      warmAnimalWorldOnOpen(category);
      trackAnimalWorldEvent("category_opened", { category });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CategoryChip
          active={activeCategory === "all"}
          label="All"
          emoji="🌍"
          onClick={() => onCategoryTap("all")}
        />
        {ANIMAL_CATEGORIES.map((category) => (
          <CategoryChip
            key={category}
            active={activeCategory === category}
            label={CATEGORY_LABELS[category].replace(" Animals", "").replace("Birds", "Birds").replace("Insects", "Bugs").replace("Pets", "Pets")}
            emoji={CATEGORY_EMOJI[category]}
            onClick={() => onCategoryTap(category)}
          />
        ))}
      </div>

      <VirtualizedGrid
        items={animals}
        columns={columns}
        rowHeight={columns >= 4 ? 220 : columns >= 3 ? 210 : 200}
        className="h-[min(68vh,720px)] pr-1"
        renderItem={(animal) => (
          <AnimalCard animal={animal} onSelect={onSelectAnimal} />
        )}
      />
    </div>
  );
}

function CategoryChip({
  active,
  label,
  emoji,
  onClick,
}: {
  active: boolean;
  label: string;
  emoji: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-primary/50 bg-primary/15 text-foreground shadow-[0_0_20px_rgba(255,120,80,0.15)]"
          : "border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07]",
      )}
    >
      <span>{emoji}</span>
      {label}
    </button>
  );
}
