/**
 * Routine Generation R5 — Continuity / living-presence helpers.
 * Presentation only. Engine, APIs, DB, points side-effects frozen.
 *
 * Emotional target: "This routine belongs to today's life."
 * Never: dashboard · streaks · XP · coins · gamification · task-manager KPI.
 */

import { isRoutineLivingV1Enabled } from "@/lib/routine-generation/living-entry";

export type LivingContinuityExitId = "today" | "hub" | "coach" | "audio";

export type LivingContinuityExit = {
  id: LivingContinuityExitId;
  label: string;
  href: string;
  purpose: string;
};

export function isRoutineLivingExecutionEnabled(): boolean {
  return isRoutineLivingV1Enabled();
}

/** Soft presence label inside the ring — never a raw percent when living. */
export function livingPresenceRingLabel(completed: number, total: number): string {
  if (total <= 0) return "Today";
  if (completed <= 0) return "Begin";
  if (completed >= total) return "Cared";
  const ratio = completed / total;
  if (ratio < 0.34) return "Gentle";
  if (ratio < 0.67) return "With";
  return "Steady";
}

export function livingPresenceRingHint(completed: number, total: number): string {
  if (total <= 0) return "today";
  if (completed >= total) return "today";
  return "beside you";
}

export function livingHeroNowLabel(): string {
  return "With you now";
}

export function livingHeroNextLabel(): string {
  return "Coming next";
}

export function livingHeroDoneTitle(): string {
  return "We cared well today";
}

export function livingHeroChildDay(childName: string): string {
  return `Beside ${childName}`;
}

export function livingArcAriaLabel(): string {
  return "Today's gentle rhythm";
}

export function livingProgressDoneLabel(completed: number, total: number): string {
  return `${completed} of ${total} gentle steps`;
}

export function livingCompletionTitle(): string {
  return "We cared well today";
}

export function livingCompletionBody(childName?: string): string {
  if (childName?.trim()) {
    return `You stayed with ${childName.trim()} through the day. That is enough.`;
  }
  return "You stayed with the day. That is enough.";
}

export function livingCompletionCta(): string {
  return "Rest here";
}

export function livingDayCompleteHeadline(): string {
  return "That day rested well";
}

export function livingDayCompleteSubline(): string {
  return "What was cared for stayed with the day.";
}

export function livingLetGoLabel(): string {
  return "Let go";
}

export function livingMissedWindowHint(): string {
  return "This window passed — still okay to mark done, or gently let it go.";
}

export function livingSkipBadgeLabel(): string {
  return "Stepped aside";
}

export function livingAutoSkipReasonDisplay(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  if (/not enough time/i.test(raw) || /auto-?skipped/i.test(raw)) {
    return "Made room for bedtime — a lighter step stepped aside.";
  }
  return raw.trim();
}

export function livingAutoSkipToastTitle(): string {
  return "Made room for bedtime";
}

export function livingAutoSkipToastBody(): string {
  return "A few lighter steps stepped aside so the evening stays kind.";
}

/** Existing routes only — no new systems. */
export function livingContinuityExits(): readonly LivingContinuityExit[] {
  return [
    {
      id: "today",
      label: "Today Home",
      // Land on Today Home sanctuary directly (HomeRedirect also maps `/` → here).
      href: "/dashboard",
      purpose: "Return to the heart of the day",
    },
    {
      id: "hub",
      label: "Parent Hub",
      href: "/parenting-hub",
      purpose: "Quiet rooms when you need them",
    },
    {
      id: "coach",
      label: "Beside you",
      href: "/amy-coach",
      purpose: "One calm next conversation",
    },
    {
      id: "audio",
      label: "Quiet listen",
      href: "/audio-lessons",
      purpose: "A few soft minutes",
    },
  ] as const;
}

export function livingContinuityExitsTitle(): string {
  return "Where next — whenever you're ready";
}

export function livingContinuityExitsHint(): string {
  return "No rush. The day can rest.";
}
