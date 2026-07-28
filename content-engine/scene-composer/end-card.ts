/**
 * Official AmyNest end card — always appended by Scene Composer.
 */

import {
  AMYNEST_CTA_LINES,
  AMYNEST_WEBSITE_URL,
  getBrandIdentityKit,
} from "../brand/identity.js";
import type { ComposerEndCardPlan } from "./types.js";

export function buildComposerEndCard(durationSeconds = 2.5): ComposerEndCardPlan {
  const kit = getBrandIdentityKit();
  const seconds = Math.min(
    kit.endCard.durationSeconds.max,
    Math.max(kit.endCard.durationSeconds.min, durationSeconds),
  );

  return {
    required: true,
    durationSeconds: seconds,
    appIcon: true,
    googlePlayBadge: true,
    appleAppStoreBadge: true,
    websiteUrl: AMYNEST_WEBSITE_URL,
    lines: [
      "Download AmyNest AI",
      ...AMYNEST_CTA_LINES.filter((l) => /Build Better Habits/i.test(l)).slice(0, 1),
      "Available on Google Play",
      "Available on the App Store",
      AMYNEST_WEBSITE_URL,
    ],
  };
}
