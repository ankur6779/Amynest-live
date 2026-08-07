import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ParentHubRoomId } from "@/lib/parent-hub/rooms";
import {
  HUB_EXPANDED_CONTENT_STACK,
  HUB_GLASS_CARD,
  HUB_BODY,
} from "@/lib/parent-hub-premium";

export type ParentHubRoomProps = {
  roomId: ParentHubRoomId;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  /** Existing module nodes — Pack 1 temporary peers, not redesigned cards. */
  destinations: ReactNode;
  /** Prefer Care open for infants — visual cue only. */
  emphasis?: boolean;
};

/**
 * Pack 1 architecture shell only:
 * title · quiet subtitle · placeholder hero · secondary destinations · deep-link anchor.
 * No photography. No card redesign.
 */
export function ParentHubRoom({
  roomId,
  title,
  subtitle,
  open,
  onToggle,
  destinations,
  emphasis = false,
}: ParentHubRoomProps) {
  return (
    <section
      id={`hub-room-${roomId}`}
      data-hub-room={roomId}
      data-testid={`hub-room-${roomId}`}
      className={cn(HUB_GLASS_CARD, "overflow-hidden", emphasis && "ring-1 ring-primary/25")}
    >
      <button
        type="button"
        id={`hub-room-header-${roomId}`}
        data-testid={`hub-room-header-${roomId}`}
        aria-expanded={open}
        aria-controls={`hub-room-body-${roomId}`}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-quicksand text-lg font-bold text-foreground">{title}</h2>
          <p className={cn(HUB_BODY, "mt-0.5 text-muted-foreground")}>{subtitle}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={`hub-room-body-${roomId}`}
          data-testid={`hub-room-body-${roomId}`}
          className={cn(HUB_EXPANDED_CONTENT_STACK, "border-t border-white/10 px-3 pb-3 pt-2")}
        >
          {/* Pack 2 will replace this with cinematic photography — do not polish now. */}
          <div
            data-testid={`hub-room-hero-${roomId}`}
            data-pack="hero-placeholder"
            className="flex min-h-[5.5rem] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-6"
            aria-hidden
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/50">
              Room hero · Pack 2
            </span>
          </div>

          <div
            data-testid={`hub-room-destinations-${roomId}`}
            data-pack="secondary-destinations"
            className="space-y-3"
          >
            {destinations}
          </div>

          {/* Stable deep-link scroll target for room-level navigation. */}
          <div
            id={`hub-room-deeplink-${roomId}`}
            data-testid={`hub-room-deeplink-${roomId}`}
            data-pack="deep-link"
            className="sr-only"
            aria-hidden
          />
        </div>
      ) : null}
    </section>
  );
}
