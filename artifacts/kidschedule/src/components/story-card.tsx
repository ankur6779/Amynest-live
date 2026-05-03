import { useState } from "react";
import { Play, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, type StoryDto } from "@/hooks/use-stories-data";

interface StoryCardProps {
  story: StoryDto;
  onClick: (story: StoryDto) => void;
  /** Slightly larger cards for "hero" rows like Continue Watching. */
  size?: "default" | "wide";
}

export function StoryCard({ story, onClick, size = "default" }: StoryCardProps) {
  const [imgError, setImgError] = useState(false);
  const duration = formatDuration(story.durationSec);
  const progressPct =
    story.positionSec && story.durationSec
      ? Math.min(100, Math.round((story.positionSec / story.durationSec) * 100))
      : null;

  return (
    <button
      type="button"
      onClick={() => onClick(story)}
      data-testid={`story-card-${story.id}`}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-xl bg-card",
        "border border-border hover:border-border transition-all",
        "hover:-translate-y-0.5 hover:shadow-xl hover:shadow",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent",
        size === "wide" ? "w-[260px]" : "w-[200px]",
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden",
          size === "wide" ? "aspect-video" : "aspect-[3/4]",
        )}
      >
        {!imgError && story.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.thumbnailUrl}
            alt={story.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-card">
            <Film className="h-12 w-12 text-primary-foreground" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card shadow-2xl">
            <Play className="ml-0.5 h-6 w-6 fill-primary text-foreground" />
          </div>
        </div>

        {/* Duration badge */}
        {duration && (
          <span className="absolute right-2 top-2 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
            {duration}
          </span>
        )}

        {/* Resume progress bar */}
        {progressPct !== null && progressPct > 0 && progressPct < 100 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-foreground">
            <div
              className="h-full bg-primary"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      <div className="px-3 py-2 text-left">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-primary-foreground">
          {story.title}
        </p>
        <p className="mt-0.5 text-[11px] capitalize text-primary-foreground">{story.category}</p>
      </div>
    </button>
  );
}
