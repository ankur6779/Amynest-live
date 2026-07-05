import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HUB_TILE_TRIGGER } from "@/lib/parent-hub-premium";

type HubTileButtonProps = {
  children: ReactNode;
  onClick: () => void;
  /** Accessible name — typically title plus description. */
  ariaLabel: string;
  ariaExpanded?: boolean;
  className?: string;
  testId?: string;
};

/** Full-width hub tile trigger — 48px touch target, spring press, a11y. */
export function HubTileButton({
  children,
  onClick,
  ariaLabel,
  ariaExpanded,
  className,
  testId,
}: HubTileButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      data-testid={testId}
      className={cn(HUB_TILE_TRIGGER, className)}
    >
      {children}
    </button>
  );
}

/** Builds a concise aria-label from tile title + description. */
export function hubTileAriaLabel(title: string, description?: string, expanded?: boolean): string {
  const state = expanded === undefined ? "" : expanded ? " Expanded." : " Collapsed.";
  const desc = description?.trim();
  return desc ? `${title}. ${desc}.${state}` : `${title}.${state}`;
}
