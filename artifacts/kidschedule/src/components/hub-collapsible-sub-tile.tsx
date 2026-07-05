import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HubSubTileShell } from "@/components/hub-sub-tile-shell";
import { hubTileAriaLabel } from "@/components/hub-tile-button";
import {
  extractTintRgbFromCardClass,
  getHubSubTileIconAccent,
  HUB_EXPANDED_CONTENT,
  HUB_SUB_TILE_DESC,
  HUB_SUB_TILE_HEADER,
  HUB_SUB_TILE_ICON_LG,
} from "@/lib/parent-hub-premium";

type HubCollapsibleSubTileProps = {
  icon: ReactNode;
  title: string;
  /** Shown under the title when no badge (Activities sub-tiles). */
  description?: string;
  badge?: string;
  accentClass?: string;
  tintRgb?: string;
  /** @deprecated Prefer tintRgb */
  cardClass?: string;
  defaultOpen?: boolean;
  /** Controlled open state — when set, tile follows parent instead of internal state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

function resolveSubTileAccent(
  accentClass: string | undefined,
  tintRgb: string,
): string {
  if (!accentClass || accentClass.includes("from-muted")) {
    return getHubSubTileIconAccent(tintRgb);
  }
  return accentClass;
}

/** Infant Parenting–style collapsible sub-tile (left bar + shade + lg icon). */
export function HubCollapsibleSubTile({
  icon,
  title,
  description,
  badge,
  accentClass,
  tintRgb,
  cardClass,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  children,
}: HubCollapsibleSubTileProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(open) : next;
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  };
  const resolvedTint =
    tintRgb ?? extractTintRgbFromCardClass(cardClass) ?? "129,140,248";
  const iconAccent = resolveSubTileAccent(accentClass, resolvedTint);

  return (
    <HubSubTileShell tintRgb={resolvedTint} open={open} className="rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          HUB_SUB_TILE_HEADER,
          open ? "bg-white/[0.04]" : "",
        )}
        aria-expanded={open}
        aria-label={hubTileAriaLabel(title, badge ? undefined : description, open)}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn(HUB_SUB_TILE_ICON_LG, iconAccent)}>
            <span className="text-white [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-quicksand font-bold text-[clamp(20px,2.3vw,28px)] leading-[1.2] text-foreground block line-clamp-2">
              {title}
            </span>
            {badge ? (
              <span className="inline-flex items-center mt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 dark:bg-white/10 text-foreground/80 backdrop-blur-sm">
                  {badge}
                </span>
              </span>
            ) : (
              <p className={HUB_SUB_TILE_DESC}>{description ?? "\u00A0"}</p>
            )}
          </div>
        </div>
      </button>
      {open && children ? (
        <div
          className={cn(
            HUB_EXPANDED_CONTENT,
            "animate-in fade-in slide-in-from-top-1 duration-200",
          )}
        >
          {children}
        </div>
      ) : null}
    </HubSubTileShell>
  );
}

type HubSubTileLinkProps = {
  tintRgb: string;
  accentClass?: string;
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  highlighted?: boolean;
  children?: ReactNode;
};

/** Non-collapsible shaded tile — same shell as Infant Parenting rows (Amy, emotional, etc.). */
export function HubSubTileLink({
  tintRgb,
  accentClass,
  icon,
  title,
  subtitle,
  trailing,
  className,
  highlighted = false,
  children,
}: HubSubTileLinkProps) {
  const iconAccent = resolveSubTileAccent(accentClass, tintRgb);

  return (
    <HubSubTileShell tintRgb={tintRgb} className={cn("rounded-2xl", className)}>
      <div
        className={cn(
          "px-5 py-4 sm:px-6 transition-colors hover:bg-white/[0.03]",
          highlighted
            ? "ring-2 ring-inset ring-primary/45 shadow-[0_0_20px_-4px_rgba(168,85,247,0.45)]"
            : "",
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(HUB_SUB_TILE_ICON_LG, iconAccent, "text-lg flex items-center justify-center")}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            {typeof title === "string" ? (
              <p className="font-quicksand font-bold text-[clamp(20px,2.3vw,28px)] leading-[1.2] text-foreground line-clamp-2">{title}</p>
            ) : (
              title
            )}
            {subtitle ? (
              <div className="text-[clamp(12px,1.8vw,14px)] text-muted-foreground mt-0.5 leading-[1.35] line-clamp-2">{subtitle}</div>
            ) : null}
            {children}
          </div>
          {trailing}
        </div>
      </div>
    </HubSubTileShell>
  );
}
