import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubSubTileShell } from "@/components/hub-sub-tile-shell";
import {
  extractTintRgbFromCardClass,
  getHubSubTileIconAccent,
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
          "w-full flex items-center justify-between gap-3 px-4 py-4 text-left",
          "transition-colors duration-200",
          open ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
        )}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(HUB_SUB_TILE_ICON_LG, iconAccent)}>
            <span className="text-white [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          </div>
          <div className="min-w-0">
            <span className="font-bold text-[15px] leading-snug text-foreground block truncate">
              {title}
            </span>
            {badge ? (
              <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 dark:bg-white/10 text-foreground/80 backdrop-blur-sm">
                {badge}
              </span>
            ) : description ? (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-foreground/50 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-foreground/50 shrink-0" />
        )}
      </button>
      {open && children ? (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.08] animate-in fade-in slide-in-from-top-1 duration-200">
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
          "px-4 py-4 transition-colors hover:bg-white/[0.03]",
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
              <p className="font-bold text-[15px] leading-snug text-foreground">{title}</p>
            ) : (
              title
            )}
            {subtitle ? (
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{subtitle}</div>
            ) : null}
            {children}
          </div>
          {trailing}
        </div>
      </div>
    </HubSubTileShell>
  );
}
