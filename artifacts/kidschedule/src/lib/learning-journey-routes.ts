/**
 * Learning routes that stay open during the Parent Hub free journey,
 * then hard-gate for non-premium users after the journey ends.
 */
export const LEARNING_JOURNEY_ROUTE_PREFIXES = [
  "/phonics",
  "/study",
  "/abacus",
  "/smart-math-tricks",
  "/olympiad",
  "/spelling",
] as const;

export function isLearningJourneyRoute(path: string): boolean {
  return LEARNING_JOURNEY_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
