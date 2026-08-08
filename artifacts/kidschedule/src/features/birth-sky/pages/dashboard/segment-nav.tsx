/**
 * Premium segment tabs — Home · Sky Map · Kundli · Reflect
 * Living ON: Home · Sky · Patterns · Reflect (ids unchanged).
 */

import { useRef } from "react";
import type { DashboardSegmentId } from "../../state/dashboard-session";
import { cn } from "@/lib/utils";
import { AMY_ASTRO_PRODUCT_SHORT } from "../../lib/branding";
import {
  isBirthSkyLivingV1Enabled,
  livingSegmentLabel,
  livingSegmentNavAria,
} from "@/lib/birth-sky/living-room";
import "../../design/amy-astro.css";

const TAB_IDS: DashboardSegmentId[] = ["sky", "astronomy", "tradition", "reflect"];

type Props = {
  active: DashboardSegmentId;
  onChange: (id: DashboardSegmentId) => void;
};

export function BirthSkySegmentNav({ active, onChange }: Props) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const living = isBirthSkyLivingV1Enabled();
  const tabs = TAB_IDS.map((id) => ({
    id,
    label: living
      ? livingSegmentLabel(id)
      : id === "sky"
        ? "Home"
        : id === "astronomy"
          ? "Sky Map"
          : id === "tradition"
            ? "Kundli"
            : "Reflect",
  }));

  const select = (id: DashboardSegmentId) => {
    onChange(id);
    const idx = tabs.findIndex((t) => t.id === id);
    window.setTimeout(() => tabRefs.current[idx]?.focus(), 0);
  };

  return (
    <div
      role="tablist"
      aria-label={living ? livingSegmentNavAria() : `${AMY_ASTRO_PRODUCT_SHORT} sections`}
      className="amy-astro-glass flex gap-1 overflow-x-auto rounded-2xl p-1"
      data-testid="birth-sky-segment-nav"
      onKeyDown={(e) => {
        const idx = tabs.findIndex((t) => t.id === active);
        if (idx < 0) return;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          select(tabs[(idx + 1) % tabs.length]!.id);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          select(tabs[(idx - 1 + tabs.length) % tabs.length]!.id);
        } else if (e.key === "Home") {
          e.preventDefault();
          select(tabs[0]!.id);
        } else if (e.key === "End") {
          e.preventDefault();
          select(tabs[tabs.length - 1]!.id);
        }
      }}
    >
      {tabs.map((tab, i) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            data-bs-segment-active={selected ? "true" : undefined}
            className={cn(
              "min-h-12 flex-1 rounded-xl px-2 text-xs font-bold tracking-wide transition-colors",
              selected
                ? living
                  ? "bg-[rgba(232,212,184,0.14)] text-[rgba(255,252,248,0.96)]"
                  : "bg-gradient-to-b from-[hsl(42_50%_35%/0.55)] to-[hsl(275_40%_25%/0.55)] text-[hsl(42_80%_88%)] shadow-[0_0_16px_hsl(42_70%_50%/0.2)]"
                : "text-[hsl(40_20%_96%/0.5)]",
            )}
            onClick={() => onChange(tab.id)}
            data-testid={`birth-sky-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
