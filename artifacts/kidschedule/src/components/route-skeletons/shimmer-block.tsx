import { SKELETON_BASE } from "@/lib/experience-system";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Gradient shimmer + opacity pulse — matches final layout blocks. */
export function ShimmerBlock({ className }: Props) {
  return (
    <div
      className={cn(SKELETON_BASE, className)}
      aria-hidden="true"
    />
  );
}
