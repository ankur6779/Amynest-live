import type { TFunction } from "i18next";
import {
  getTimelyCategory,
  recommendForChild,
  EVENT_CATEGORIES,
  type EventPrepCountry,
} from "@workspace/event-prep";
import { Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EVENT_PREP_SECTION_TITLE,
  eventPrepPanelCard,
} from "@/lib/event-prep-zone-theme";
import { EventPrepChildAvatar } from "@/components/event-prep/event-prep-child-avatar";
import type { EventPrepChild } from "@/components/event-prep-views";

export type EventPrepChildWithPhoto = EventPrepChild & { photoUrl?: string | null };

interface Props {
  children: EventPrepChildWithPhoto[];
  country: EventPrepCountry;
  onOpenCharacter: (childId: number, characterId: string) => void;
  t: TFunction;
}

export function EventPrepSiblingCompare({ children, country, onOpenCharacter, t }: Props) {
  if (children.length < 2) return null;

  const category = getTimelyCategory(country);
  const cat = EVENT_CATEGORIES.find((c) => c.id === category)!;

  return (
    <div className="space-y-3">
      <h2 className={cn(EVENT_PREP_SECTION_TITLE, "flex items-center gap-2")}>
        <Users className="h-4 w-4 text-amber-300" />
        {t("screens.event_prep.sibling_compare_title")}
      </h2>
      <p className="text-xs text-muted-foreground/85 -mt-1">
        {t("screens.event_prep.sibling_compare_sub", { category: cat.title })}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {children.map((child) => {
          const recs = recommendForChild(category, child.age).slice(0, 2);
          return (
            <div key={child.id} className={cn(eventPrepPanelCard(), "p-4")}>
              <div className="flex items-center gap-3 mb-3">
                <EventPrepChildAvatar
                  name={child.name}
                  age={child.age}
                  photoUrl={child.photoUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="font-quicksand font-bold text-foreground truncate">{child.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("screens.event_prep.age_label", { age: child.age })}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {recs.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onOpenCharacter(child.id, ch.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border border-white/[0.08] p-2.5 text-left",
                      "bg-gradient-to-br from-white/[0.04] to-transparent",
                      "transition hover:border-amber-400/35 active:scale-[0.98]",
                    )}
                  >
                    <span className="text-2xl">{ch.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">{ch.character}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {ch.timeMinutes} {t("screens.event_prep.minutes_short")} · {ch.difficulty}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
