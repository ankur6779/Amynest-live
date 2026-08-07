/**
 * R6 Signup Experience — Keep language from First Experience continuity.
 * Welcome / FE film is frozen. Signup speaks preservation, never unlock.
 */

import { loadFirstExperienceContinuity } from "./continuity";
import { violatesAmyNestVoice } from "@/lib/amynest-philosophy";

export type SignupKeepCopy = {
  keepMode: boolean;
  childName: string | null;
  title: string;
  subtitle: string;
  tagline: string;
  cta: string;
  fatigueExit: string;
  signInHref: string;
  signUpHref: string;
};

const KEEP_QUERY = "from=first-experience";

export function isFromFirstExperience(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): boolean {
  try {
    return new URLSearchParams(search).get("from") === "first-experience";
  } catch {
    return false;
  }
}

/** Build keep-mode copy — inherits FE story when present. */
export function buildSignupKeepCopy(opts?: {
  fromFirstExperience?: boolean;
  search?: string;
}): SignupKeepCopy {
  const fromFe =
    opts?.fromFirstExperience ?? isFromFirstExperience(opts?.search);
  const continuity = loadFirstExperienceContinuity();
  const child =
    continuity?.childName && continuity.childName !== "your child"
      ? continuity.childName
      : null;
  const keepMode = Boolean(fromFe || continuity?.valueEarned);

  if (!keepMode) {
    return {
      keepMode: false,
      childName: null,
      title: "Keep this journey",
      subtitle: "Save your child’s path so Amy can guide what matters today.",
      tagline: "The next right thing stays with you.",
      cta: "Keep my journey",
      fatigueExit: "Not now",
      signInHref: "/sign-in",
      signUpHref: "/sign-up",
    };
  }

  const title = child ? `Keep ${child}’s journey` : "Keep today’s progress";
  const subtitle = child
    ? continuity?.nextThing?.title
      ? `${continuity.emotionalContext} ${continuity.nextThing.title} stays with ${child} — tomorrow continues naturally.`
      : `Today’s progress for ${child} stays with you — tomorrow continues naturally.`
    : "Today’s progress, tomorrow’s plan, and your child’s growing understanding stay with you.";

  const copy: SignupKeepCopy = {
    keepMode: true,
    childName: child,
    title,
    subtitle,
    tagline: "Keeping protects what you already felt — nothing is unlocked.",
    cta: "Keep this with an account",
    fatigueExit: "Not now — keep on this device",
    signInHref: `/sign-in?${KEEP_QUERY}`,
    signUpHref: `/sign-up?${KEEP_QUERY}`,
  };

  // Voice contract — keep copy must never pressure.
  const joined = `${copy.title} ${copy.subtitle} ${copy.tagline} ${copy.cta}`;
  if (violatesAmyNestVoice(joined)) {
    return {
      ...copy,
      title: "Keep today’s progress",
      subtitle: "What you already felt stays with you — whenever you’re ready.",
      tagline: "Preservation, not pressure.",
      cta: "Keep my journey",
    };
  }
  return copy;
}

export function buildSignInKeepCopy(opts?: {
  fromFirstExperience?: boolean;
  search?: string;
}): SignupKeepCopy {
  const base = buildSignupKeepCopy(opts);
  if (!base.keepMode) {
    return {
      ...base,
      title: "Welcome back",
      subtitle: "Continue where you left off with your child.",
      cta: "Continue",
    };
  }
  const child = base.childName;
  return {
    ...base,
    title: child ? `Continue ${child}’s story` : "Continue today’s story",
    subtitle: child
      ? `Signing in keeps ${child}’s progress with you — tomorrow continues naturally.`
      : "Signing in keeps today’s progress with you — tomorrow continues naturally.",
    cta: "Continue",
  };
}
