/**
 * CTA for guest → account continuity.
 * Trust-first paths (/ask-amy, /for-child) always navigate — experience before auth.
 * Other hrefs open the soft account sheet when unsigned.
 */

import type { ReactNode } from "react";
import { Link } from "wouter";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import { Button } from "@/components/ui/button";
import {
  useReducedMotion,
  v2HapticLight,
  V2_PRESS_GHOST,
  V2_PRESS_PRIMARY,
  V2_PRESS_SECONDARY,
} from "@/v2/craft";
import { shouldUseGuestAccountSheet } from "./guest-account-gate";
import {
  openGuestAccountRequiredSheet,
  type GuestAccountSheetIntent,
} from "./guest-account-sheet-store";

/** Paths guests must reach before any account wall. */
const GUEST_EXPERIENCE_HREFS = ["/ask-amy", "/for-child"] as const;

function isGuestExperienceHref(href: string): boolean {
  return GUEST_EXPERIENCE_HREFS.some(
    (path) => href === path || href.startsWith(`${path}/`) || href.startsWith(`${path}?`),
  );
}

type GuestAccountCtaProps = {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link" | "secondary" | "destructive";
  /** Omit to let Nest Bloom / ghost classes own height (no kit size fight). */
  size?: "default" | "sm" | "lg" | "icon";
  testId?: string;
  ariaLabel?: string;
  /** Presentation intent for the guest sheet (Ask Amy vs default). */
  sheetIntent?: GuestAccountSheetIntent;
  /**
   * Force soft account sheet even for /ask-amy or /for-child.
   * Use for “save progress” CTAs after the guest already saw the experience.
   */
  forceAccountSheet?: boolean;
};

function pressForVariant(
  variant: GuestAccountCtaProps["variant"],
): string {
  if (variant === "ghost" || variant === "link") return V2_PRESS_GHOST;
  if (variant === "outline" || variant === "secondary") return V2_PRESS_SECONDARY;
  return V2_PRESS_PRIMARY;
}

export function GuestAccountCta({
  href,
  children,
  className,
  variant = "default",
  size,
  testId,
  ariaLabel,
  sheetIntent = "default",
  forceAccountSheet = false,
}: GuestAccountCtaProps) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const gate = shouldUseGuestAccountSheet({ isSignedIn, user });
  const reduced = useReducedMotion();
  const press = pressForVariant(variant);
  const pressClass = className ? `${className} ${press}` : press;
  const sizeProps = size ? ({ size } as const) : {};
  const resolvedIntent: GuestAccountSheetIntent =
    sheetIntent !== "default"
      ? sheetIntent
      : href.startsWith("/ask-amy")
        ? "ask_amy"
        : href.startsWith("/for-child")
          ? "for_child"
          : "default";

  // Trust-first: navigate to Ask Amy / For Child even when unsigned,
  // unless this CTA is explicitly “save progress” (forceAccountSheet).
  if (!gate || (isGuestExperienceHref(href) && !forceAccountSheet)) {
    return (
      <Button asChild variant={variant} {...sizeProps} className={pressClass}>
        <Link
          href={href}
          data-testid={testId}
          aria-label={ariaLabel}
          onClick={() => v2HapticLight(reduced)}
        >
          {children}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      {...sizeProps}
      className={pressClass}
      data-testid={testId}
      aria-label={ariaLabel}
      onClick={() => {
        v2HapticLight(reduced);
        openGuestAccountRequiredSheet(resolvedIntent);
      }}
    >
      {children}
    </Button>
  );
}
