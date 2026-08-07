/**
 * R6 Signup Experience — Keep language from First Experience continuity.
 * Welcome / FE film is frozen. Signup speaks preservation, never unlock.
 *
 * Auth handlers live elsewhere — this module is copy + keepsake data only.
 */

import { loadFirstExperienceContinuity, type FirstExperienceContinuity } from "./continuity";
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
  invitation: string;
  emailPathLabel: string;
};

/** Visible keepsake — show, do not merely describe. */
export type KeepKeepsake = {
  childName: string;
  nextThingTitle: string;
  completionLine: string;
  safetyLine: string;
  emotionalContext: string;
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

function completionLineFrom(c: FirstExperienceContinuity): string {
  if (c.completionKind === "done" && c.completedAt) {
    return "Today’s next right thing was completed.";
  }
  if (c.completionKind === "similar") {
    return "Something similar already counted today.";
  }
  if (c.completionKind === "later") {
    return "Today’s next step is held until you’re ready.";
  }
  return "Today’s understanding has begun.";
}

export function buildKeepKeepsake(): KeepKeepsake | null {
  const c = loadFirstExperienceContinuity();
  if (!c?.valueEarned || !c.nextThing) return null;
  const child =
    c.childName.trim() && c.childName !== "your child" ? c.childName.trim() : "your child";
  return {
    childName: child,
    nextThingTitle: c.nextThing.title,
    completionLine: completionLineFrom(c),
    safetyLine: "This stays safe when you protect it here.",
    emotionalContext: c.emotionalContext,
  };
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
      subtitle: "Save your child’s path so tomorrow continues from today.",
      tagline: "The next right thing stays with you.",
      cta: "Keep my journey",
      fatigueExit: "Not now",
      signInHref: "/sign-in",
      signUpHref: "/sign-up",
      invitation: "Protect this gently.",
      emailPathLabel: "Or protect with email",
    };
  }

  const title = child ? `Keep what began for ${child}` : "Keep what just began";
  const subtitle = child
    ? `Nothing is unlocked. This simply protects ${child}’s next right thing.`
    : "Nothing is unlocked. This simply protects what you’ve already begun.";

  const copy: SignupKeepCopy = {
    keepMode: true,
    childName: child,
    title,
    subtitle,
    tagline: "You’re still in the same story.",
    cta: "Keep this safely",
    fatigueExit: "Not now — keep on this device",
    signInHref: `/sign-in?${KEEP_QUERY}`,
    signUpHref: `/sign-up?${KEEP_QUERY}`,
    invitation: "Choose how you’d like to protect it.",
    emailPathLabel: "Or protect with email",
  };

  const joined = `${copy.title} ${copy.subtitle} ${copy.tagline} ${copy.cta}`;
  if (violatesAmyNestVoice(joined)) {
    return {
      ...copy,
      title: "Keep what just began",
      subtitle: "What you already felt stays with you — whenever you’re ready.",
      tagline: "Preservation, not pressure.",
      cta: "Keep this safely",
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
      invitation: "Continue gently.",
    };
  }
  const child = base.childName;
  return {
    ...base,
    title: child ? `Continue with ${child}` : "Continue where you left off",
    subtitle: child
      ? `${child}’s story is still here — pick up whenever you’re ready.`
      : "Your story is still here — pick up whenever you’re ready.",
    cta: "Continue",
    invitation: "Choose how you’d like to return.",
    emailPathLabel: "Or continue with email",
  };
}

export function buildVerifyKeepCopy(): {
  keepMode: boolean;
  title: string;
  subtitle: string;
  spamNote: string;
  resend: string;
  back: string;
} {
  const keepsake = buildKeepKeepsake();
  if (!keepsake) {
    return {
      keepMode: false,
      title: "Check your inbox",
      subtitle: "We've sent a verification link to",
      spamNote:
        "Can't find it? Check your spam or junk folder. Tap the link to continue — you'll stay signed in.",
      resend: "Resend verification email",
      back: "← Back to Sign in",
    };
  }
  return {
    keepMode: true,
    title: "It’s safely held",
    subtitle: `${keepsake.childName}’s next right thing is protected. Confirm this email so it stays with you:`,
    spamNote:
      "Check spam if needed. When you tap the link, what you’ve begun remains yours.",
    resend: "Send the confirmation again",
    back: "← Continue finding your way back",
  };
}

export function buildForgotKeepCopy(): {
  keepMode: boolean;
  title: string;
  subtitle: string;
  sendCta: string;
  back: string;
  inboxTitle: string;
  inboxBody: string;
} {
  const keep = buildSignupKeepCopy();
  if (!keep.keepMode) {
    return {
      keepMode: false,
      title: "Reset password",
      subtitle: "Enter your email and we'll send you a reset link.",
      sendCta: "Send reset link",
      back: "← Back to Sign in",
      inboxTitle: "Check your inbox",
      inboxBody: "We've sent a password reset link.",
    };
  }
  return {
    keepMode: true,
    title: "Find your way back",
    subtitle: "We’ll send a gentle link so you can continue where you left off.",
    sendCta: "Send me a way back",
    back: "← Continue returning",
    inboxTitle: "A way back is on its way",
    inboxBody: "Check your inbox for a quiet link to return.",
  };
}

/** Soften technical auth errors for keep beat — never invent success. */
export function calmKeepAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("email-already") || m.includes("already in use")) {
    return "This email already protects a journey — try continuing instead.";
  }
  if (m.includes("wrong-password") || m.includes("invalid-credential") || m.includes("invalid password")) {
    return "That didn’t match — take another gentle try, or find your way back.";
  }
  if (m.includes("user-not-found") || m.includes("not a registered")) {
    return "We couldn’t find that journey yet — you can keep a new one anytime.";
  }
  if (m.includes("too-many") || m.includes("too many")) {
    return "A short pause will help — try again in a moment.";
  }
  if (m.includes("network") || m.includes("offline")) {
    return "The connection paused — your progress on this device is still here.";
  }
  if (m.includes("popup") || m.includes("cancelled") || m.includes("canceled")) {
    return "No problem — you can protect this whenever you’re ready.";
  }
  // Keep original if already human; strip Firebase codes.
  return raw.replace(/^Firebase:\s*/i, "").replace(/\s*\(.*\)\s*$/, "").trim() || raw;
}
