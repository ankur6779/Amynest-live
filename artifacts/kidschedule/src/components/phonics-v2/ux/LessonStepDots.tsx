import { cn } from "@/lib/utils";

type LessonStepDotsProps = {
  total: number;
  currentIndex: number;
  className?: string;
};

/** Visual lesson progress — no reading required. */
export function LessonStepDots({
  total,
  currentIndex,
  className,
}: LessonStepDotsProps) {
  return (
    <div
      className={cn("flex items-center justify-center gap-1.5", className)}
      role="progressbar"
      aria-valuenow={currentIndex + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${currentIndex + 1} of ${total}`}
      data-testid="lesson-step-dots"
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 rounded-full transition-all",
            i < currentIndex
              ? "w-2 bg-emerald-500"
              : i === currentIndex
                ? "w-5 bg-amber-500"
                : "w-2 bg-muted-foreground/25",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}
