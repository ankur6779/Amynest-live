import { useEffect, useState } from "react";
import { Sparkles, Compass, Baby, HelpCircle, BarChart3 } from "lucide-react";
import type { Animal, AnimalCategory, AnimalWorldMode } from "@workspace/animal-world";
import { cn } from "@/lib/utils";
import { SCREEN_SPACING } from "@/lib/experience-system";
import { animalAudioManager } from "@/lib/animal-world-audio-manager";
import { warmAnimalWorldOnOpen } from "@/lib/animal-world-audio-warmup";
import { appendSessionDuration } from "@/lib/animal-world-storage";
import { trackAnimalWorldEvent } from "@/lib/animal-world-telemetry";
import { trackProgressEvent } from "@/lib/learning-progress-analytics";
import { CategoryHome } from "./category-home";
import { AnimalDetail } from "./animal-detail";
import { ToddlerMode } from "./toddler-mode";
import { QuizMode } from "./quiz-mode";
import { DiscoveryMode } from "./discovery-mode";
import { ParentDashboardPanel } from "./parent-dashboard-panel";

type AnimalWorldExperienceProps = {
  childId: number;
  onEngage?: () => void;
};

const MODES: Array<{ id: AnimalWorldMode; label: string; icon: typeof Sparkles }> = [
  { id: "explore", label: "Explore", icon: Compass },
  { id: "toddler", label: "Toddler", icon: Baby },
  { id: "quiz", label: "Quiz", icon: HelpCircle },
  { id: "discovery", label: "Discovery", icon: Sparkles },
  { id: "parent", label: "Parent", icon: BarChart3 },
];

export function AnimalWorldExperience({ childId, onEngage }: AnimalWorldExperienceProps) {
  const [mode, setMode] = useState<AnimalWorldMode>("explore");
  const [category, setCategory] = useState<AnimalCategory | "all">("all");
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [muted, setMuted] = useState(false);
  const sessionStart = useState(() => Date.now())[0];

  useEffect(() => {
    onEngage?.();
    warmAnimalWorldOnOpen();
    animalAudioManager.unlockFromGesture();
    trackAnimalWorldEvent("mode_changed", { childId, mode: "explore" });
    return () => {
      const ms = Date.now() - sessionStart;
      appendSessionDuration(childId, ms);
      trackAnimalWorldEvent("session_duration", { childId, durationMs: ms });
      trackProgressEvent("session_completed", childId, { module: "animal_world", durationMs: ms });
      animalAudioManager.release();
    };
  }, [childId, onEngage, sessionStart]);

  useEffect(() => {
    animalAudioManager.setMuted(muted);
  }, [muted]);

  const onModeChange = (next: AnimalWorldMode) => {
    setMode(next);
    setSelectedAnimal(null);
    trackAnimalWorldEvent("mode_changed", { childId, mode: next });
  };

  return (
    <div className={cn("min-h-screen bg-background pb-10", SCREEN_SPACING.pageX)}>
      <header className="sticky top-0 z-40 -mx-4 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Animal World</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Meet the animals</h1>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onModeChange(id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                  mode === id
                    ? "bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(255,120,80,0.25)]"
                    : "bg-white/[0.05] text-muted-foreground hover:bg-white/[0.08]",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl pt-5">
        {selectedAnimal && mode === "explore" ? (
          <AnimalDetail
            animal={selectedAnimal}
            childId={childId}
            onBack={() => setSelectedAnimal(null)}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
          />
        ) : (
          <>
            {mode === "explore" && (
              <CategoryHome
                activeCategory={category}
                onCategoryChange={setCategory}
                onSelectAnimal={setSelectedAnimal}
              />
            )}
            {mode === "toddler" && (
              <ToddlerMode
                childId={childId}
                onOpenAnimal={(animal) => {
                  setMode("explore");
                  setSelectedAnimal(animal);
                }}
              />
            )}
            {mode === "quiz" && <QuizMode childId={childId} />}
            {mode === "discovery" && <DiscoveryMode childId={childId} />}
            {mode === "parent" && <ParentDashboardPanel childId={childId} />}
          </>
        )}
      </main>
    </div>
  );
}
