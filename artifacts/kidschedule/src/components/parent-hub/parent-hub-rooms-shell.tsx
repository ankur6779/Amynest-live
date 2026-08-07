import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import {
  PARENT_HUB_ROOM_IDS,
  type ParentHubRoomId,
  tileIdsForRoom,
} from "@/lib/parent-hub/rooms";
import { ParentHubRoom } from "@/components/parent-hub/parent-hub-room";
import { HUB_BODY } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

export type ParentHubRoomsShellProps = {
  childName: string;
  isInfant: boolean;
  expandedRooms: Set<string>;
  onToggleRoom: (roomId: ParentHubRoomId) => void;
  /** All currently visible Hub section ids (featured + grid). */
  visibleTileIds: string[];
  renderDestination: (tileId: string) => ReactNode;
};

const ROOM_I18N: Record<
  ParentHubRoomId,
  { titleKey: string; subtitleKey: string; titleFallback: string; subtitleFallback: string }
> = {
  help: {
    titleKey: "parent_hub.rooms.help.title",
    subtitleKey: "parent_hub.rooms.help.subtitle",
    titleFallback: "Help",
    subtitleFallback: "When something feels hard right now.",
  },
  understand: {
    titleKey: "parent_hub.rooms.understand.title",
    subtitleKey: "parent_hub.rooms.understand.subtitle",
    titleFallback: "Understand",
    subtitleFallback: "See your child more clearly.",
  },
  care: {
    titleKey: "parent_hub.rooms.care.title",
    subtitleKey: "parent_hub.rooms.care.subtitle",
    titleFallback: "Care",
    subtitleFallback: "Tend body, rhythm, feeding, and health.",
  },
  moments: {
    titleKey: "parent_hub.rooms.moments.title",
    subtitleKey: "parent_hub.rooms.moments.subtitle",
    titleFallback: "Moments",
    subtitleFallback: "Share one human presence together.",
  },
};

/**
 * Pack 1 — four primary sections only.
 * Existing modules render temporarily inside mapped rooms (no redesign).
 */
export function ParentHubRoomsShell({
  childName,
  isInfant,
  expandedRooms,
  onToggleRoom,
  visibleTileIds,
  renderDestination,
}: ParentHubRoomsShellProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4" data-testid="parent-hub-rooms-shell">
      <div className="pt-1">
        <h2 className="font-quicksand text-[22px] font-bold text-foreground">
          {t("parent_hub.rooms.header", {
            name: childName,
            defaultValue: `What do you need for ${childName}?`,
          })}
        </h2>
        <p className={cn(HUB_BODY, "mt-1 text-muted-foreground")}>
          {t("parent_hub.rooms.header_subtitle", {
            defaultValue: "Four rooms. One intention at a time.",
          })}
        </p>
      </div>

      <div className="space-y-3">
        {PARENT_HUB_ROOM_IDS.map((roomId) => {
          const meta = ROOM_I18N[roomId];
          const tileIds = tileIdsForRoom(roomId, visibleTileIds);
          const destinations = (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tileIds.map((tileId) => {
                const node = renderDestination(tileId);
                return node ? (
                  <div key={tileId} className="min-w-0 w-full" data-room-tile={tileId}>
                    {node}
                  </div>
                ) : null;
              })}
            </div>
          );

          return (
            <ParentHubRoom
              key={roomId}
              roomId={roomId}
              title={t(meta.titleKey, { defaultValue: meta.titleFallback })}
              subtitle={t(meta.subtitleKey, { defaultValue: meta.subtitleFallback })}
              open={expandedRooms.has(roomId)}
              onToggle={() => onToggleRoom(roomId)}
              destinations={destinations}
              emphasis={isInfant && roomId === "care"}
            />
          );
        })}
      </div>
    </div>
  );
}
