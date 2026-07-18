import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  READING_PETS,
  loadReadingPetState,
  petDisplayEmoji,
  petEncouragement,
  petStage,
  saveReadingPetState,
  setReadingPetKind,
  type ReadingPetKind,
  type ReadingPetState,
} from "@/lib/phonics-v3/reading-pet";

type ReadingPetCardProps = {
  childId: number;
  /** Controlled external state (optional) */
  pet?: ReadingPetState;
  onPetChange?: (next: ReadingPetState) => void;
  className?: string;
};

const KINDS = Object.keys(READING_PETS) as ReadingPetKind[];

export function ReadingPetCard({
  childId,
  pet: controlled,
  onPetChange,
  className,
}: ReadingPetCardProps) {
  const [local, setLocal] = useState(() => loadReadingPetState(childId));
  const pet = controlled ?? local;

  const update = (next: ReadingPetState) => {
    if (!controlled) {
      setLocal(next);
      saveReadingPetState(childId, next);
    }
    onPetChange?.(next);
  };

  const meta = READING_PETS[pet.kind];
  const stage = petStage(pet.growth);

  return (
    <div
      data-testid="reading-pet-card"
      className={cn(
        "space-y-3 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] to-transparent p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {petDisplayEmoji(pet)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Reading buddy
          </p>
          <h4 className="font-quicksand text-base font-black">{meta.name}</h4>
          <p className="text-xs text-muted-foreground">{petEncouragement(pet)}</p>
        </div>
        <span className="rounded-full bg-card px-2 py-1 text-[10px] font-bold capitalize">
          {stage}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-semibold">
          <span>Growth</span>
          <span>{pet.growth}%</span>
        </div>
        <Progress value={pet.growth} className="h-2" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={cn(
              "rounded-full border px-2 py-1 text-lg",
              pet.kind === kind
                ? "border-emerald-500/50 bg-emerald-500/15"
                : "border-border/60 opacity-70",
            )}
            onClick={() => {
              const next = setReadingPetKind(pet, kind);
              update(next);
              saveReadingPetState(childId, next);
            }}
            aria-label={`Choose ${READING_PETS[kind].name}`}
          >
            {READING_PETS[kind].emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
