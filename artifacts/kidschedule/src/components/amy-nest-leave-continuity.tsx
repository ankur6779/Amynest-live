/**
 * Portfolio P0 leave-path continuity — calm exits back to life.
 * Existing routes only. No browse loops. No new navigation product.
 */
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Optional third exit (e.g. back to module open) — never a catalogue. */
  continueHref?: string;
  continueLabel?: string;
};

export function AmyNestLeaveContinuity({
  className,
  continueHref,
  continueLabel,
}: Props) {
  const { t } = useTranslation();

  return (
    <nav
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 px-3 py-3 space-y-2",
        className,
      )}
      aria-label={t("portfolio.leave.exits_aria", {
        defaultValue: "Return to today's life",
      })}
      data-testid="amy-nest-leave-continuity"
    >
      <p className="text-xs font-semibold text-muted-foreground leading-snug">
        {t("portfolio.leave.exits_hint", {
          defaultValue: "Whenever you're ready — back to life.",
        })}
      </p>
      <ul className="grid grid-cols-2 gap-2" role="list">
        <li>
          <Link
            href="/dashboard"
            className="flex min-h-12 items-center justify-center rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="leave-exit-today-home"
          >
            {t("portfolio.leave.today_home", { defaultValue: "Today Home" })}
          </Link>
        </li>
        <li>
          <Link
            href="/parenting-hub"
            className="flex min-h-12 items-center justify-center rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="leave-exit-parent-hub"
          >
            {t("portfolio.leave.parent_hub", { defaultValue: "Parent Hub" })}
          </Link>
        </li>
        {continueHref && continueLabel ? (
          <li className="col-span-2">
            <Link
              href={continueHref}
              className="flex min-h-12 items-center justify-center rounded-2xl border border-border/50 bg-muted/40 px-3 py-2 text-sm font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              data-testid="leave-exit-continue"
            >
              {continueLabel}
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
