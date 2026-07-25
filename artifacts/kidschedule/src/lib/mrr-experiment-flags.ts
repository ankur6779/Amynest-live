/**
 * MRR growth experiment flags — env-driven, one experiment at a time.
 */

function envFlag(key: string, defaultValue = false): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

function envString(key: string, defaultValue: string): string {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return String(raw);
}

/** Master switch for activation sprint (guest try-first, fast onboarding). */
export const FF_ACTIVATION_FAST_PATH = envFlag(
  "VITE_FF_ACTIVATION_FAST_PATH",
  true,
);

/** Android native: "Try first" anonymous sign-in before OAuth. */
export const FF_GUEST_TRY_FIRST = envFlag(
  "VITE_FF_GUEST_TRY_FIRST",
  FF_ACTIVATION_FAST_PATH,
);

/** Routine free limit experiment: "3" (control) | "5" (variant). */
export type RoutineLimitVariant = "3" | "5";

const ROUTINE_LIMIT_VARIANT_KEY = "amynest:mrr:routine_limit_variant:v1";

export function isRoutineLimitExperimentEnabled(): boolean {
  return envFlag("VITE_FF_MRR_ROUTINE_LIMIT_EXPERIMENT", false);
}

export function resolveRoutineLimitVariant(): RoutineLimitVariant {
  if (!isRoutineLimitExperimentEnabled()) return "3";
  const forced = envString("VITE_FF_MRR_ROUTINE_LIMIT_FORCE", "");
  if (forced === "5" || forced === "3") return forced;
  try {
    const stored = localStorage.getItem(ROUTINE_LIMIT_VARIANT_KEY);
    if (stored === "3" || stored === "5") return stored;
    const variant: RoutineLimitVariant = Math.random() < 0.5 ? "3" : "5";
    localStorage.setItem(ROUTINE_LIMIT_VARIANT_KEY, variant);
    return variant;
  } catch {
    return "3";
  }
}

export function resolveRoutineFreeLimit(): number {
  const variant = resolveRoutineLimitVariant();
  return variant === "5" ? 5 : 3;
}

/** Value sheet headline experiment: "default" | "outcome" | "family". */
export type ValueSheetHeadlineVariant = "default" | "outcome" | "family";

export function resolveValueSheetHeadlineVariant(): ValueSheetHeadlineVariant {
  const forced = envString("VITE_FF_MRR_VALUE_SHEET_HEADLINE", "");
  if (forced === "outcome" || forced === "family" || forced === "default") {
    return forced;
  }
  return "default";
}

/** CTA copy experiment: "continue_premium" | "unlock_unlimited". */
export type ValueSheetCtaVariant = "continue_premium" | "unlock_unlimited";

export function resolveValueSheetCtaVariant(): ValueSheetCtaVariant {
  const forced = envString("VITE_FF_MRR_VALUE_SHEET_CTA", "");
  if (forced === "unlock_unlimited" || forced === "continue_premium") {
    return forced;
  }
  return "continue_premium";
}

/** Show free vs premium comparison table on value sheets. */
export const FF_VALUE_SHEET_COMPARISON = envFlag(
  "VITE_FF_MRR_VALUE_SHEET_COMPARISON",
  true,
);

/** Master kill switch — disables all subscription moment sheets when false. */
export const FF_PREMIUM_MOMENT_SHEETS = envFlag(
  "VITE_FF_PREMIUM_MOMENT_SHEETS",
  true,
);
