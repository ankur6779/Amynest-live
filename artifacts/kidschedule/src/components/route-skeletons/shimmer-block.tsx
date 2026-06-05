import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Subtle shimmer placeholder — matches premium app skeleton patterns. */
export function ShimmerBlock({ className }: Props) {
  return (
    <div
      className={cn("route-shimmer rounded-2xl", className)}
      aria-hidden="true"
    />
  );
}
