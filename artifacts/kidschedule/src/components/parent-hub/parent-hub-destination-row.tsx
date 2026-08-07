import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ParentHubDestinationRowProps = {
  tileId: string;
  title: string;
  hint?: string;
  active?: boolean;
  nested?: boolean;
  /** Pack 4 — single contextual recommendation cue */
  recommendLabel?: string;
  onSelect: () => void;
};

/**
 * Pack 2/3/4 — quiet path into a destination.
 * Not a hero card. Not a marketing tile. Apple Settings weight.
 */
export function ParentHubDestinationRow({
  tileId,
  title,
  hint,
  active = false,
  nested = false,
  recommendLabel,
  onSelect,
}: ParentHubDestinationRowProps) {
  return (
    <button
      type="button"
      data-testid={`hub-dest-row-${tileId}`}
      data-room-tile={tileId}
      data-recommended={recommendLabel ? "true" : undefined}
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "ph-dest-row",
        nested && "ph-dest-row--nested",
        recommendLabel && "ph-dest-row--recommended",
        active && "ph-dest-row--active",
      )}
    >
      <span className="min-w-0">
        {recommendLabel ? (
          <span className="ph-dest-recommend" data-testid={`hub-dest-recommend-${tileId}`}>
            {recommendLabel}
          </span>
        ) : null}
        <span className="ph-dest-row-title block truncate">{title}</span>
        {hint ? <span className="ph-dest-row-hint block truncate">{hint}</span> : null}
      </span>
      <ChevronRight className="ph-dest-row-chevron h-4 w-4" aria-hidden />
    </button>
  );
}
