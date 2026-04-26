import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryCard } from "@/components/story-card";
import type { StoryDto } from "@/hooks/use-stories-data";

interface StoryCarouselProps {
  title: string;
  stories: StoryDto[];
  onSelect: (story: StoryDto) => void;
  size?: "default" | "wide";
  emptyHint?: string;
}

export function StoryCarousel({
  title,
  stories,
  onSelect,
  size = "default",
  emptyHint,
}: StoryCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (stories.length === 0) {
    if (!emptyHint) return null;
    return (
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/50">{emptyHint}</p>
      </section>
    );
  }

  const scroll = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const delta = dir === "left" ? -el.clientWidth * 0.85 : el.clientWidth * 0.85;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="space-y-2.5" data-testid={`story-row-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <div className="hidden gap-1 sm:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/60 hover:bg-white/10 hover:text-white"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/60 hover:bg-white/10 hover:text-white"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {stories.map((story) => (
          <StoryCard
            key={`${title}-${story.id}`}
            story={story}
            onClick={onSelect}
            size={size}
          />
        ))}
      </div>
    </section>
  );
}
