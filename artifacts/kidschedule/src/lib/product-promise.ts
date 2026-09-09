/**
 * Single initial job for AmyNest — used across first screen, Discovery,
 * Home, paywall, and store-controlled copy. Wording may vary by surface;
 * the job must not.
 *
 * Job: give a parent their child's next right thing today.
 */

export const PRODUCT_JOB_CORE = "Get your child's plan for today.";

export const PRODUCT_JOB_SUPPORTING =
  "In two minutes, see what your child should do next today, then do it together.";

export const PRODUCT_JOB_IDENTITY =
  "AmyNest creates and guides a personalized daily plan for your child.";

function named(childName?: string | null): string | null {
  const name = childName?.trim();
  if (!name || name.toLowerCase() === "your child") return null;
  return name;
}

/** First-screen / Home headline. */
export function childPlanHeadline(childName?: string | null): string {
  const name = named(childName);
  return name ? `${name}'s plan for today` : "Your child's plan for today";
}

/** Outcome-driven primary CTA. */
export function childPlanCta(childName?: string | null): string {
  const name = named(childName);
  return name ? `See ${name}'s plan for today` : "See today's plan";
}

export function childPlanRetryCta(): string {
  return "Try today's plan again";
}

export function keepTomorrowCta(childName?: string | null): string {
  const name = named(childName);
  return name ? `Keep ${name}'s plan for tomorrow` : "Keep tomorrow's plan";
}

export function paywallOutcomeHeadline(childName?: string | null): string {
  const name = named(childName);
  return name ? `Keep ${name}'s days this clear.` : "Keep your child's days this clear.";
}

export function paywallOutcomeSubtitle(childName?: string | null): string {
  const name = named(childName) ?? "your child";
  return `You already have today's plan. Premium keeps Amy building tomorrow's plan for ${name}, helping through difficult moments, and showing progress over time.`;
}
