import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ParentHubDestinationRowProps = {
  tileId: string;
  title: string;
  hint?: string;
  active?: boolean;
  onSelect: () => void;
};

/**
 * Pack 2 — quiet path into a destination.
 * Not a hero card. Not a marketing tile.
 */
export function ParentHubDestinationRow({
  tileId,
  title,
  hint,
  active = false,
  onSelect,
}: ParentHubDestinationRowProps) {
  return (
    <button
      type="button"
      data-testid={`hub-dest-row-${tileId}`}
      data-room-tile={tileId}
      aria-pressed={active}
      onClick={onSelect}
      className={cn("ph-dest-row", active && "ph-dest-row--active")}
    >
      <span className="min-w-0">
        <span className="ph-dest-row-title block truncate">{title}</span>
        {hint ? <span className="ph-dest-row-hint block truncate">{hint}</span> : null}
      </span>
      <ChevronRight className="ph-dest-row-chevron h-4 w-4" aria-hidden />
    </button>
  );
}
