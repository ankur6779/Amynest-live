/**
 * validateSleepDomain — Sleep Domain shape / ID contract checks.
 * Delegates to Parenting Domain SDK. Public API unchanged.
 */

import { validateDomain } from "@/v2/parenting-domain-sdk";
import { SLEEP_EXPERIENCE_ID, SLEEP_SURFACE_MAP } from "./contracts";
import {
  SLEEP_DOMAIN,
  SLEEP_DOMAIN_VERSION,
  SLEEP_SUBDOMAIN_IDS,
} from "./domain";
import type { SleepExperienceValidationResult } from "./types";

/**
 * Validate Sleep Domain contract (still sleep_support — no new Experience).
 */
export function validateSleepDomain(
  value: unknown = SLEEP_DOMAIN,
): SleepExperienceValidationResult {
  return validateDomain(value, {
    expectedExperienceId: SLEEP_EXPERIENCE_ID,
    expectedDomainVersion: SLEEP_DOMAIN_VERSION,
    expectedSubdomainIds: SLEEP_SUBDOMAIN_IDS,
    expectedSurfaceSlots: {
      today: SLEEP_SURFACE_MAP.today.surfaceSlotId,
      amyCoach: SLEEP_SURFACE_MAP.amyCoach.surfaceSlotId,
      askAmy: SLEEP_SURFACE_MAP.askAmy.surfaceSlotId,
      forChild: SLEEP_SURFACE_MAP.forChild.surfaceSlotId,
    },
    unknownSubdomainMessage: "unknown Sleep subdomain",
  });
}
