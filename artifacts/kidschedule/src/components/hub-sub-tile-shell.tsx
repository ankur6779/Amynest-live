import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  hubSubTileAccentBarGradient,
  hubSubTileShadeGradient,
  hubSubTileShellClasses,
  parseTintRgb,
} from "@/lib/parent-hub-premium";

type HubSubTileShellProps = {
  tintRgb: string;
  open?: boolean;
  className?: string;
  children: ReactNode;
};

/** Glass sub-tile with left accent bar + horizontal color fade (strong → soft). */
export function HubSubTileShell({
  tintRgb,
  open = false,
  className,
  children,
}: HubSubTileShellProps) {
  const [r, g, b] = parseTintRgb(tintRgb);
  return (
    <div className={cn(hubSubTileShellClasses(r, g, b, open), className)}>
      <div className="flex min-w-0">
        <div
          className="w-[3px] shrink-0 self-stretch my-2 ml-1 rounded-full"
          style={{ background: hubSubTileAccentBarGradient(r, g, b) }}
          aria-hidden
        />
        <div
          className="min-w-0 flex-1 flex flex-col"
          style={{ background: hubSubTileShadeGradient(r, g, b) }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

type HubSubTileChipProps = {
  tintRgb: string;
  className?: string;
  children: ReactNode;
};

/** Compact shaded chip for grid prompt tiles (Amy AI, emotional cards, etc.). */
export function HubSubTileChip({ tintRgb, className, children }: HubSubTileChipProps) {
  const [r, g, b] = parseTintRgb(tintRgb);
  return (
    <div className={hubSubTileShellClasses(r, g, b, false)}>
      <div className="flex min-w-0 h-full">
        <div
          className="w-[3px] shrink-0 self-stretch my-2 ml-1 rounded-full"
          style={{ background: hubSubTileAccentBarGradient(r, g, b) }}
          aria-hidden
        />
        <div
          className={cn("min-w-0 flex-1", className)}
          style={{ background: hubSubTileShadeGradient(r, g, b) }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
