/**
 * R5 — calm continuity exits after execution / completion.
 * Existing routes only. No new systems. No trap loops / catalogue.
 */
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  livingContinuityExits,
  livingContinuityExitsHint,
  livingContinuityExitsTitle,
} from "@/lib/routine-generation/living-execution";
import { HUB_GLASS_SURFACE, ROUTINES_HUB_ACCENT } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function RoutineLivingContinuityExits({ className }: Props) {
  const { t } = useTranslation();
  const exits = livingContinuityExits();

  return (
    <nav
      className={cn(
        HUB_GLASS_SURFACE,
        ROUTINES_HUB_ACCENT.border,
        "rounded-[20px] px-4 py-3 space-y-2",
        className,
      )}
      aria-label={t("routines.living.execution.exits_aria", {
        defaultValue: livingContinuityExitsTitle(),
      })}
      data-testid="routine-living-continuity-exits"
    >
      <div>
        <p className="text-sm font-bold text-foreground">
          {t("routines.living.execution.exits_title", {
            defaultValue: livingContinuityExitsTitle(),
          })}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("routines.living.execution.exits_hint", {
            defaultValue: livingContinuityExitsHint(),
          })}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2" role="list">
        {exits.map((exit) => (
          <li key={exit.id}>
            <Link
              href={exit.href}
              className="flex min-h-12 flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
              data-testid={`routine-living-exit-${exit.id}`}
            >
              <span className="text-sm font-bold text-foreground">{exit.label}</span>
              <span className="text-[11px] text-muted-foreground leading-snug">
                {exit.purpose}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
