import { Zap, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type RoutinePremiumCtaVariant = "generate" | "view" | "loading";

type RoutinePremiumCtaProps = {
  variant: RoutinePremiumCtaVariant;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
  title?: string;
  subtext?: string;
};

const DEFAULT_TITLE: Record<RoutinePremiumCtaVariant, string> = {
  generate: "Generate Smart Amy Routine",
  view: "View Today's Routine",
  loading: "Amy is building your routine…",
};

const DEFAULT_SUBTEXT: Record<RoutinePremiumCtaVariant, string> = {
  generate: "AI-powered personalized routine",
  view: "Open your schedule in one tap",
  loading: "Using weather, age, mood & family context",
};

export function RoutinePremiumCta({
  variant,
  onClick,
  disabled,
  testId,
  title,
  subtext,
}: RoutinePremiumCtaProps) {
  const isLoading = variant === "loading";
  const isView = variant === "view";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      data-testid={testId}
      className={cn(
        "routine-premium-cta group relative w-full overflow-hidden rounded-[20px]",
        "min-h-[68px] px-5 py-4 text-left transition-all duration-[220ms] ease-[ease]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "disabled:opacity-60 disabled:pointer-events-none",
        "active:scale-[0.985] hover:-translate-y-0.5",
        isView
          ? "border-[1.5px] border-emerald-400/45 bg-[rgba(16,185,129,0.12)] shadow-[0_8px_32px_rgba(16,185,129,0.18)]"
          : "border border-white/10 shadow-[0_10px_40px_rgba(255,107,53,0.35),0_0_24px_rgba(255,184,0,0.15)]",
        !isView && "routine-premium-cta--gradient",
      )}
    >
      {!isView && <span className="routine-premium-cta-shimmer pointer-events-none" aria-hidden />}
      <span className="relative z-[1] flex items-center gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            "bg-white/15 backdrop-blur-sm border border-white/20",
            isView && "bg-emerald-500/20 border-emerald-400/30",
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : isView ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-200" />
          ) : (
            <Zap className="h-5 w-5 text-white" />
          )}
        </span>
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="font-quicksand text-base sm:text-lg font-bold text-white leading-tight">
            {title ?? DEFAULT_TITLE[variant]}
          </span>
          <span className="text-xs text-white/80 font-medium">
            {subtext ?? DEFAULT_SUBTEXT[variant]}
          </span>
        </span>
      </span>
    </button>
  );
}
