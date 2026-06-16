import {
  PRE_SIGNUP_SEGMENT,
  type PreSignupAudienceInput,
  type PreSignupSegment,
} from "./types";

/**
 * PRE_SIGNUP_USER segment — app installed, opened, not authenticated,
 * signup not completed, notifications allowed and OS permission granted.
 */
export function evaluatePreSignupSegment(input: PreSignupAudienceInput): PreSignupSegment | null {
  if (!input.appInstalled) return null;
  if (input.isAuthenticated) return null;
  if (input.signupCompleted) return null;
  if (!input.notificationsEnabled) return null;
  if (!input.notificationsGranted) return null;
  return PRE_SIGNUP_SEGMENT;
}

export function shouldExitPreSignupSegment(input: PreSignupAudienceInput): boolean {
  return input.isAuthenticated || input.signupCompleted;
}

export function isInPreSignupSegment(segment: PreSignupSegment | null | undefined): boolean {
  return segment === PRE_SIGNUP_SEGMENT;
}
