/**
 * Wave C — shared calm prepare UI.
 * Prefer skeletons + pulse. Never competing spinners.
 * P0.1: Constitution shell / space tokens only.
 */

import type { ReactNode } from "react";
import {
  V2_PREPARE_BLOCK,
  V2_PREPARE_COPY,
  V2_PULSE_BAR,
  V2_PULSE_INLINE,
} from "@/v2/craft/preparation";
import { V2_MEASURE, V2_SPACE, V2_TYPE } from "@/v2/craft/constitution";

type V2CalmPrepareProps = {
  /** Visible preparation message (omit for skeleton-only / micro). */
  message?: string;
  ariaLabel?: string;
  testId?: string;
  /** standard = pulse + message + blocks; long = pulse + message (caller adds steps). */
  density?: "standard" | "long";
  className?: string;
  children?: ReactNode;
};

/** Full-region prepare — route / long journey. */
export function V2CalmPrepare({
  message = V2_PREPARE_COPY.quiet,
  ariaLabel,
  testId = "v2-calm-prepare",
  density = "standard",
  className = "",
  children,
}: V2CalmPrepareProps) {
  return (
    <div
      className={`mx-auto flex w-full ${V2_MEASURE.shell} flex-col items-center ${V2_SPACE[3]} ${V2_SPACE.edgeX} ${V2_SPACE.py8} ${className}`}
      data-testid={testId}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel ?? message}
    >
      <div className={V2_PULSE_BAR} aria-hidden />
      {message ? (
        <p className={`text-center ${V2_TYPE.caption}`}>{message}</p>
      ) : null}
      {density === "standard" ? (
        <div className={`w-full ${V2_SPACE.stack2} ${V2_SPACE.mt1}`} aria-hidden>
          <div className={`${V2_PREPARE_BLOCK} h-24`} />
          <div className={`${V2_PREPARE_BLOCK} h-16`} />
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** Inline busy — replaces spinners on purchase / restore / signup. */
export function V2InlinePrepare({
  message,
  testId = "v2-inline-prepare",
}: {
  message: string;
  testId?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center ${V2_SPACE[1]} ${V2_SPACE.py1}`}
      data-testid={testId}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div className={V2_PULSE_INLINE} aria-hidden />
      <p className={V2_TYPE.caption}>{message}</p>
    </div>
  );
}

export { V2_PREPARE_COPY };
