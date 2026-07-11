/**
 * First-value activation sprint flags — env-driven staged rollout.
 * Evidence: 89.9% dashboard→routine drop; routine generators retain 4× on D1.
 */

function envFlag(key: string, defaultValue = false): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

/** Master switch for first-value activation improvements. */
export const FF_FIRST_VALUE_ACTIVATION = envFlag(
  "VITE_FF_FIRST_VALUE_ACTIVATION",
  true,
);

/** Prominent dashboard hero CTA when user has no today routine. */
export const FF_FIRST_VALUE_HERO = envFlag(
  "VITE_FF_FIRST_VALUE_HERO",
  FF_FIRST_VALUE_ACTIVATION,
);

/** Pre-fill generate form + skip wake modal for first-time routine users. */
export const FF_FIRST_VALUE_QUICK_ROUTINE = envFlag(
  "VITE_FF_FIRST_VALUE_QUICK_ROUTINE",
  FF_FIRST_VALUE_ACTIVATION,
);

/** Inline next-step strip after first routine (hub link, no modal). */
export const FF_FIRST_VALUE_POST_ROUTINE = envFlag(
  "VITE_FF_FIRST_VALUE_POST_ROUTINE",
  FF_FIRST_VALUE_ACTIVATION,
);

/**
 * Reorder dashboard widgets so continue/resume flow stays above timeline.
 * Bundled with first-value sprint (production: 0 activation_resume nav events).
 */
export const FF_FIRST_VALUE_DASHBOARD_PRIORITY = envFlag(
  "VITE_FF_FIRST_VALUE_DASHBOARD_PRIORITY",
  FF_FIRST_VALUE_ACTIVATION,
);
