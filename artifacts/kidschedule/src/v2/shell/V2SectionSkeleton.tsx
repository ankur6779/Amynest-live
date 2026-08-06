/**
 * Standard V2 section skeleton — Nest Presence prepare skeleton only.
 * Prefer this over competing animate-pulse / spinner patterns.
 * P0.2: Constitution spacing ladder only.
 */

import { V2_PREPARE_BLOCK, V2_PULSE_BAR, V2_SPACE } from "@/v2/craft";

type V2SectionSkeletonProps = {
  /** Accessible label for the pending region */
  label: string;
  lines?: number;
  className?: string;
  testId?: string;
};

export function V2SectionSkeleton({
  label,
  lines = 3,
  className = "",
  testId,
}: V2SectionSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-testid={testId}
      className={`${V2_SPACE.sectionStack} ${className}`}
    >
      <div className={`${V2_PULSE_BAR} w-28`} aria-hidden />
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`${V2_PREPARE_BLOCK} h-3 ${
            i === lines - 1 ? "w-2/3" : "w-full"
          }`}
          aria-hidden
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
