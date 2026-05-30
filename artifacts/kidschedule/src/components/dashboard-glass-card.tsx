import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { dashboardGlassShellClasses } from "@/lib/dashboard-premium";
import {
  hubSubTileAccentBarGradient,
  hubSubTileShadeGradient,
  parseTintRgb,
} from "@/lib/parent-hub-premium";

type DashboardGlassCardProps = {
  tintRgb: string;
  children: ReactNode;
  className?: string;
  rounded?: "xl" | "2xl" | "3xl";
  accentWidth?: 3 | 4 | 5;
};

const ROUNDED = {
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
} as const;

/** Tinted glass card with left accent bar + horizontal color fade (dashboard sections). */
export function DashboardGlassCard({
  tintRgb,
  children,
  className,
  rounded = "2xl",
  accentWidth = 4,
}: DashboardGlassCardProps) {
  const [r, g, b] = parseTintRgb(tintRgb);
  const barClass =
    accentWidth === 5 ? "w-[5px]" : accentWidth === 3 ? "w-[3px]" : "w-1";

  return (
    <div className={cn(dashboardGlassShellClasses(r, g, b), ROUNDED[rounded], className)}>
      <div className="flex min-w-0 h-full">
        <div
          className={cn(barClass, "shrink-0 self-stretch my-2.5 ml-1.5 rounded-full")}
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

type DashboardGlassChipProps = {
  tintRgb: string;
  className?: string;
  children: ReactNode;
};

/** Compact tinted row/chip inside dashboard sections. */
export function DashboardGlassChip({
  tintRgb,
  className,
  children,
}: DashboardGlassChipProps) {
  return (
    <DashboardGlassCard tintRgb={tintRgb} rounded="xl" accentWidth={3} className={className}>
      {children}
    </DashboardGlassCard>
  );
}
