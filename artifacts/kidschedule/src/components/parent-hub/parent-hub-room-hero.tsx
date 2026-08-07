import { cn } from "@/lib/utils";
import type { RoomHeroSpec } from "@/lib/parent-hub/room-heroes";

type Props = {
  hero: RoomHeroSpec;
  feeling: string;
  /** high when this is the entered room's primary photograph */
  priority?: boolean;
  className?: string;
};

/**
 * Pack 2 cinematic hero — same FE memory grammar as Welcome / Home.
 * Photography only. Lazy by default (priority=false).
 */
export function ParentHubRoomHero({
  hero,
  feeling,
  priority = false,
  className,
}: Props) {
  return (
    <div
      className={cn("ph-room-hero-mount fe-memory-mount", className)}
      data-testid={`hub-room-hero-${hero.roomId}`}
      data-pack="cinematic-hero"
      data-fe-shot={hero.shot}
    >
      <div className="fe-memory-spill" aria-hidden="true" />
      <div className="fe-memory">
        <img
          src={hero.src}
          alt={hero.alt}
          draggable={false}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "low"}
        />
        <div className="fe-memory-veil" aria-hidden="true" />
        <div className="fe-memory-glass" aria-hidden="true" />
        <div className="fe-memory-grain" aria-hidden="true" />
      </div>
      <p className="ph-room-feeling mt-3" data-testid={`hub-room-feeling-${hero.roomId}`}>
        {feeling}
      </p>
    </div>
  );
}
