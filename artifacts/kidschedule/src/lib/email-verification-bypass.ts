/** Review / demo accounts that skip Firebase email verification (fake inboxes). */
export const EMAIL_VERIFICATION_BYPASS_EMAILS = new Set([
  "demo@amynest.in",
  "googleplay.reviewer@amynest.app",
  "amynestreview@amynest.in",
  "apple.review@amynest.in",
]);

/** App Store / Play review inboxes on amynest.in — no real mailbox exists. */
function isAmynestReviewInbox(normalized: string): boolean {
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return false;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (domain !== "amynest.in") return false;
  return local.includes("review") || local === "demo";
}

export function isEmailVerificationBypassEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (EMAIL_VERIFICATION_BYPASS_EMAILS.has(normalized)) return true;
  return isAmynestReviewInbox(normalized);
}
